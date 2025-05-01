// ✅ handlers/entry/registerMember.mjs

import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerMember(kakaoId, utterance, res) {
  const match = utterance.match(/^회원\s+([가-힣]{2,10})\s+(01[016789]\d{7,8})\s+(\d{4})$/);
  if (!match) {
    return res.json(replyText(
      "회원 등록 형식은 '회원 이름 전화번호 인증번호'입니다.\n예: 회원 김철수 01012345678 1234"
    ));
  }

  const name = match[1];
  const phone = match[2];
  const inputCode = match[3];

  // ✅ Supabase에서 미리 등록된 회원 정보 조회
  const { data: member, error: fetchError } = await supabase
    .from("members")
    .select("id, kakao_id, code")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (fetchError) {
    console.error("❌ 회원 조회 실패:", fetchError.message);
    return res.json(replyText("❗ 인증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
  }

  if (!member) {
    return res.json(replyText("해당 회원 정보가 없습니다. 관리자에게 문의해주세요."));
  }

  if (member.kakao_id && member.kakao_id === kakaoId) {
    return res.json(replyText(`${name} 회원님, 이미 등록된 계정입니다.`));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText("❗ 이미 다른 계정으로 등록된 회원입니다."));
  }

  if (member.code !== inputCode) {
    return res.json(replyText("❌ 인증번호가 일치하지 않습니다. 다시 확인해주세요."));
  }

  // ✅ 등록 처리
  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.error("❌ 회원 등록 실패:", updateError.message);
    return res.json(replyText("등록 중 오류가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${name} 회원님, 등록이 완료되었습니다.`));
}
