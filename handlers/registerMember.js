// ✅ registerMember.js

import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  // 이름 + 전화번호 패턴 감지
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText(
      `회원 등록을 위해 성함과 전화번호를 함께 입력해주세요.\n예시: 홍길동 01012345678`
    ));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  // Supabase에서 사전 등록된 회원 찾기
  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(
      `${name}님으로 등록된 회원이 없습니다. 관리자에게 문의해주세요.`
    ));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText(
      `이미 다른 카카오톡 계정으로 등록된 회원입니다.`
    ));
  }

  // kakao_id 연결
  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    return res.json(replyText("회원 등록 중 문제가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(
    `${name}님, 등록이 완료되었습니다.\n궁금하신 정보를 알려주시면 도와드릴게요.`
  ));
}