// ✅ handlers/recordStrengthRecord.js – 근력 기록 입력 핸들러

import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function recordStrengthRecord(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const numberMatch = utterance.match(/\d{2,3}/g);

  if (!nameMatch || !numberMatch || numberMatch.length < 2) {
    return res.json(replyText("근력 입력 형식을 확인해주세요.\n예: 김복두 벤치 70kg 스쿼트 90kg"));
  }

  const name = nameMatch[0];
  const weights = numberMatch.map(n => parseInt(n));

  const bench = weights[0] || null;
  const squat = weights[1] || null;
  const deadlift = weights[2] || null;

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
    .from("strength_records")
    .insert({
      member_id: member.id,
      bench,
      squat,
      deadlift
    });

  if (error) {
    console.error("❌ 근력 기록 저장 실패:", error);
    return res.json(replyText("근력 기록 저장 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name} 회원의 근력 정보가 저장되었습니다.`));
}