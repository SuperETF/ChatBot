import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  // ✅ '회원' prefix 제거
  const clean = utterance.replace(/^회원\s*/, "").trim();
  const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

  if (!namePhoneMatch) {
    return res.json(replyText("이름과 전화번호를 정확히 입력해주세요. 예: 김복두 01012345678"));
  }

  const name = namePhoneMatch[1];
  const phone = namePhoneMatch[2];

  // ✅ Supabase에 이미 트레이너가 등록한 회원인지 확인
  const { data: member, error } = await supabase
    .from("members")
    .select("id, kakao_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`${name}님은 아직 등록되지 않은 회원입니다. 트레이너에게 먼저 등록을 요청해주세요.`));
  }

  if (member.kakao_id) {
    return res.json(replyText(`${name}님은 이미 등록된 회원입니다.`));
  }

  // ✅ kakao_id 연결
  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.error("❌ kakao_id 연결 실패:", updateError);
    return res.json(replyText("회원 등록 중 오류가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(`${name}님, 등록이 완료되었습니다! 환영합니다.`));
}
