import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const match = utterance.match(/([가-힣]{2,4})\\s*(010[0-9]{7,8})/);
  if (!match) {
    return res.json(replyText("성함과 전화번호를 형식에 맞게 입력해주세요. 예: 홍길동 01012345678"));
  }

  const [_, name, phone] = match;

  const { data: existing, error } = await supabase
    .from("members")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!existing) {
    return res.json(replyText("등록된 회원 정보를 찾을 수 없어요. 관리자에게 문의해주세요."));
  }

  // 이미 다른 kakao_id에 등록된 경우 막기
  if (existing.kakao_id && existing.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정에서 등록된 사용자입니다."));
  }

  // 연결
  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", existing.id);

  if (updateError) {
    return res.json(replyText("회원 등록 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name}님, 등록이 완료되었습니다! 정보를 조회해드릴까요?`));
}
