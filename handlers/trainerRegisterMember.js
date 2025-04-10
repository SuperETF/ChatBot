// ✅ handlers/trainerRegisterMember.js – 트레이너 ID 포함 리팩토링

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function trainerRegisterMember(kakaoId, utterance, res) {
    const cleaned = utterance.replace("회원 등록", "").trim();
    const nameMatch = cleaned.match(/[가-힣]{2,4}/);
    const phoneMatch = cleaned.match(/(01[016789]\d{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText("회원 등록 형식을 확인해주세요.\n예: 회원 등록 홍길동 01012345678"));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  // ✅ 트레이너 식별
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .single();

  if (!trainer) {
    return res.json(replyText("전문가 인증이 되지 않았습니다. 먼저 '전문가 등록'을 진행해주세요."));
  }

  // ✅ 중복 확인
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("이미 등록된 회원입니다."));
  }

  // ✅ 트레이너 ID 포함하여 등록
  const { error } = await supabase
    .from("members")
    .insert({ name, phone, trainer_id: trainer.id });

  if (error) {
    console.error("❌ 회원 등록 실패:", error);
    return res.json(replyText("회원 등록 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name}님이 회원으로 등록되었습니다.`));
}