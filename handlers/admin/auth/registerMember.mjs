// handlers/admin/auth/registerMember.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function registerMember(kakaoId, utterance, res) {
  const match = utterance.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);
  if (!match) {
    return res.json(replyText("📌 등록 형식은 '이름 전화번호' 입니다.\n예: 김영희 01012345678"));
  }

  const name = match[1];
  const phone = match[2];

  // ✅ 트레이너 인증 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("❗️ 전문가 인증이 필요합니다."));
  }

  // ✅ 이미 등록된 회원인지 확인
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("phone", phone)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("⚠️ 이미 등록된 회원입니다."));
  }

  // ✅ 회원 등록
  const { error } = await supabase
    .from("members")
    .insert({
      name,
      phone,
      trainer_id: trainer.id
    });

  if (error) {
    console.error("❌ 회원 등록 실패:", error.message);
    return res.json(replyText("회원 등록 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name} 회원이 성공적으로 등록되었습니다.`));
}
