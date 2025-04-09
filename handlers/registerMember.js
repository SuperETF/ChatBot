import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);
  const nameMatch = utterance.match(/[가-힣]{2,4}/);

  if (!phoneMatch || !nameMatch) {
    return res.json(replyText(`회원 등록을 위해 성함과 전화번호를 함께 입력해주세요.\n📌 예시: 홍길동 01012345678`));
  }

  const phone = phoneMatch[0];
  const name = nameMatch[0];

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("등록된 회원 정보를 찾을 수 없습니다. 관리자에게 문의해주세요."));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 사용자입니다."));
  }

  await supabase.from("members").update({ kakao_id: kakaoId }).eq("id", member.id);

  return res.json(replyText(`${name}님, 등록이 완료되었습니다! 정보를 확인해드릴까요?`));
}
