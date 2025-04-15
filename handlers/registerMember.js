import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText("이름과 전화번호를 정확히 입력해주세요. 예: 홍길동 01012345678"));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  // ✅ 트레이너가 미리 등록한 회원인지 확인
  const { data: member, error } = await supabase
    .from("members")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("❌ 아직 등록되지 않은 회원입니다. 트레이너에게 먼저 등록을 요청해주세요."));
  }

  if (member.kakao_id) {
    return res.json(replyText("이미 등록된 회원입니다. 다른 계정으로 등록되었을 수 있어요."));
  }

  // ✅ kakao_id 연결
  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.error("❌ 회원 등록 실패:", updateError);
    return res.json(replyText("회원 등록 중 오류가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(`${name}님, 등록이 완료되었습니다! 이제 서비스를 이용하실 수 있어요.`));
}
