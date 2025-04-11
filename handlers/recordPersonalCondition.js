// ✅ handlers/recordPersonalCondition.js – 특이사항 입력 핸들러

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function recordPersonalCondition(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const noteMatch = utterance.replace(nameMatch?.[0] || "", "").trim();

  if (!nameMatch || !noteMatch) {
    return res.json(replyText("특이사항 입력 형식을 확인해주세요.\n예: 김복두 어깨 수술 이력 있음"));
  }

  const name = nameMatch[0];
  const note = noteMatch;

  // 전문가 ID 가져오기
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("전문가 인증이 되지 않았습니다. 먼저 '전문가 등록'을 완료해주세요."));
  }

  // 해당 전문가가 등록한 회원 찾기
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
    .from("personal_conditions")
    .insert({
      member_id: member.id,
      note
    });

  if (error) {
    console.error("❌ 특이사항 저장 실패:", error);
    return res.json(replyText("특이사항 저장 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name} 회원의 특이사항이 저장되었습니다.`));
}

