// handlers/auth/registerTrainer.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerTrainer(kakaoId, utterance, res) {
  const match = utterance.match(/전문가\s*([가-힣]{2,10})\s+(01[016789][0-9]{7,8})\s+(\d{4})/);
  if (!match) {
    return res.json(replyText("❗ 전문가 등록 형식은 '전문가 이름 전화번호 인증번호'입니다.\n예: 전문가 홍길동 01012345678 0412"));
  }

  const name = match[1];
  const phone = match[2];
  const inputCode = match[3];

  const { data: existing } = await supabase
    .from("trainers")
    .select("id, kakao_id, code")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!existing) {
    return res.json(replyText("해당 트레이너는 등록된 정보가 없습니다. 관리자에게 문의해주세요."));
  }

  if (existing.kakao_id && existing.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 트레이너입니다."));
  }

  if (existing.code !== inputCode) {
    return res.json(replyText("❌ 인증번호가 일치하지 않습니다. 다시 확인해주세요."));
  }

  const { error } = await supabase
    .from("trainers")
    .update({ kakao_id: kakaoId })
    .eq("id", existing.id);

  if (error) {
    return res.json(replyText("트레이너 인증 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${name} 트레이너님, 인증이 완료되었습니다.`));
}
