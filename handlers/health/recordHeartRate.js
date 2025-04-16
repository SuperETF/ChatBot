// ✅ handlers/recordHeartRate.js – 심박수 입력 핸들러

import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function recordHeartRate(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const numberMatch = utterance.match(/\d{2,3}/g); // 2~3자리 숫자만 추출

  if (!nameMatch || !numberMatch || numberMatch.length < 2) {
    return res.json(replyText("심박수 입력 형식을 확인해주세요.\n예: 김복두 190 58 (최대심박/안정시심박)"));
  }

  const name = nameMatch[0];
  const max_hr = parseInt(numberMatch[0]);
  const rest_hr = parseInt(numberMatch[1]);

  // 전문가 인증
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("전문가 인증이 필요합니다. 먼저 '전문가 등록'을 진행해주세요."));
  }

  // 해당 전문가의 회원 찾기
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("name", name)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("해당 회원을 찾을 수 없습니다."));
  }

  const { error } = await supabase
    .from("cardio_profiles")
    .insert({
      member_id: member.id,
      max_hr,
      rest_hr
    });

  if (error) {
    console.error("❌ 심박수 저장 실패:", error);
    return res.json(replyText("심박수 저장 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name} 회원의 심박수 정보가 저장되었습니다.`));
}