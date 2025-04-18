// handlers/auth/registerMember.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerMember(kakaoId, utterance, res) {
  const match = utterance.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})\s+(\d{4})/);
  if (!match) {
    return res.json(replyText(
      "❗ 회원 등록 형식은 '이름 전화번호 인증번호'입니다.\n예: 김복두 01012345678 0412"
    ));
  }

  const name = match[1];
  const phone = match[2];
  const inputCode = match[3];

  const { data: member } = await supabase
    .from("members")
    .select("id, kakao_id, trainer_id, code")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member || !member.trainer_id) {
    return res.json(replyText("트레이너가 먼저 회원 정보를 등록해야 합니다. 담당 트레이너에게 문의해주세요."));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 회원입니다."));
  }

  if (member.code !== inputCode) {
    return res.json(replyText("❌ 인증번호가 일치하지 않습니다. 다시 확인해주세요."));
  }

  const { error } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (error) {
    return res.json(replyText("회원 등록 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${name}님, 등록이 완료되었습니다.`));
}
