import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";
import { calculateTargetHRs } from "../utils/hrCalculator.js";

export default async function inputHeartRate(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("회원 정보가 없습니다."));

  const numbers = utterance.match(/\d+/g);
  if (!numbers || numbers.length < 2) {
    return res.json(replyText("예: '60 180'처럼 안정시/최대 심박수를 입력해주세요."));
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
    `목표 심박수 저장 완료 ✅\n60%: ${targets[60]}bpm\n70%: ${targets[70]}bpm\n80%: ${targets[80]}bpm\n90%: ${targets[90]}bpm`
  ));
}
