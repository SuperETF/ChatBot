import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

export default async function fallback(utterance, kakaoId, res) {
  console.warn("🔁 fallback triggered:", utterance);

  // fallback 로그 저장 (정확한 필드로)
  const { error } = await supabase.from("fallback_logs").insert({
    kakao_id: kakaoId,
    utterance,
    intent: "기타",
    handler: "fallback",
    action: null,
    error_message: null,
    note: "fallback.mjs triggered"
  });

  if (error) {
    console.error("❌ fallback_logs insert 실패:", error.message);
  }

  return res.json(replyText(
    "🤔 말씀하신 내용을 잘 이해하지 못했어요.\n\n" +
    "• 회원 김복두 01012345678\n" +
    "• 개인 운동\n" +
    "• 수업 예약\n\n" +
    "이런 식으로 다시 입력해보세요!"
  ));
}
