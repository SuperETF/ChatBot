import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";
import { calculateTargetHRs } from "../utils/hrCalculator.js";

export default async function inputHeartRate(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("먼저 회원 등록이 필요합니다."));

  // 예시: 발화에서 심박수 정보 파싱 (단순한 숫자 추출 방식)
  const numbers = utterance.match(/\d+/g);
  if (!numbers || numbers.length < 2) {
    return res.json(replyText("예: '안정시 60, 최대 180'처럼 입력해주세요."));
  }

  const restingHR = parseInt(numbers[0]);
  const maxHR = parseInt(numbers[1]);

  const targets = calculateTargetHRs(restingHR, maxHR);

  await supabase.from("cardio_profiles").insert({
    member_id: member.id,
    resting_hr: restingHR,
    max_hr: maxHR,
    target_hr_60: targets[60],
    target_hr_70: targets[70],
    target_hr_80: targets[80],
    target_hr_90: targets[90]
  });

  return res.json(replyText(
    `심박수 정보가 저장되었습니다 ✅\n\n목표 HR:\n60%: ${targets[60]}bpm\n70%: ${targets[70]}bpm\n80%: ${targets[80]}bpm\n90%: ${targets[90]}bpm`
  ));
}
