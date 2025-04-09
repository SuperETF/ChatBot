import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const phoneMatch = utterance.match(/(01[016789][0-9]{7,8})/);

  if (!nameMatch || !phoneMatch) {
    return res.json(replyText(
      `회원 등록을 위해 성함과 전화번호를 함께 입력해주세요.\n📌 예시: 홍길동 01012345678`
    ));
  }

  const name = nameMatch[0];
  const phone = phoneMatch[0];

  console.log("🔍 입력된 이름:", name);
  console.log("📞 입력된 번호:", phone);
  console.log("👤 kakao_id:", kakaoId);

  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton(
      `등록된 정보를 찾을 수 없습니다.\n상담 연결을 도와드릴까요?`,
      ["상담 연결", "다시 입력"]
    ));
  }

  if (member.kakao_id && member.kakao_id !== kakaoId) {
    return res.json(replyText("⚠️ 이미 다른 계정으로 등록된 회원입니다."));
  }

  const { error: updateError } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (updateError) {
    console.error("❌ kakao_id 업데이트 실패:", updateError);
    return res.json(replyText("회원 등록 중 오류가 발생했습니다. 다시 시도해주세요."));
  }

  console.log("✅ 등록 성공: kakao_id 연결됨");

  return res.json(replyButton(
    `✅ ${name}님, 회원 등록이 완료되었습니다!\n어떤 기능을 도와드릴까요?`,
    ["내 정보", "운동 예약", "루틴 추천"]
  ));
}
