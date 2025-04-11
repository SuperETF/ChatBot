// ✅ listMembers.js – 전문가 ID 기준 필터링 추가

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function listMembers(kakaoId, utterance, res) {
  // 전문가 ID 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("전문가 인증 정보가 없습니다. 먼저 '전문가 등록'을 진행해주세요."));
  }

  // 전문가가 등록한 회원 목록만 조회
  const { data: members, error } = await supabase
    .from("members")
    .select("name, phone")
    .eq("trainer_id", trainer.id);

  if (error || !members || members.length === 0) {
    return res.json(replyText("아직 등록된 회원이 없습니다."));
  }

  const list = members.map(m => `• ${m.name} (${m.phone})`).join("\n");

  return res.json(replyText(`📋 등록된 회원 목록:\n${list}`));
}

