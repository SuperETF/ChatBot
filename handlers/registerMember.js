import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  // 1. 사용자가 아직 name + phone을 입력하지 않았을 경우 → 안내문 출력
  const hasPhoneNumber = utterance.match(/(01[016789])[0-9]{3,4}[0-9]{4}/);
  const hasName = utterance.match(/[가-힣]{2,4}/);

  if (!hasPhoneNumber || !hasName) {
    return res.json(replyText("성함과 전화번호를 입력해주세요. 예: 홍길동 01012345678"));
  }

  // 2. 이름/전화번호 매칭 시도
  const name = hasName[0];
  const phone = hasPhoneNumber[0];

  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("등록된 회원을 찾을 수 없습니다. 관리자에게 문의해주세요."));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText("이미 다른 계정으로 등록된 회원입니다."));
  }

  // 3. 등록 성공 → kakao_id 연결
  await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  return res.json(replyText(`${name}님 등록이 완료되었습니다. 정보를 조회해드릴까요?`));
}
