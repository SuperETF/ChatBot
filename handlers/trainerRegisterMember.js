// ✅ handlers/trainerRegisterMember.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function trainerRegisterMember(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText("회원 등록 형식을 확인해주세요.\n예: 홍길동 01012345678 회원 등록"));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  // 이미 존재하는지 확인
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("이미 등록된 회원입니다."));
  }

  const { error } = await supabase
    .from("members")
    .insert({ name, phone });

  if (error) {
    console.error("❌ 회원 등록 실패:", error);
    return res.json(replyText("회원 등록 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name}님이 회원으로 등록되었습니다.`));
}