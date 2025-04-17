import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

export default async function fallback(utterance, kakaoId, res) {
  console.warn("🔁 fallback triggered:", utterance);

  try {
    const { error } = await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "기타",
      handler: "fallback",
      action: null,
      error_message: null,
      note: "fallback.mjs triggered",
      model_used: "fallback-handler" // ✅ GPT fallback과 구분하기 위해 명시
    });

    if (error) {
      console.error("❌ fallback_logs insert 실패:", error.message);
    }
  } catch (e) {
    console.error("🔥 fallback_logs insert 예외 발생:", e.message);
  }

  return res.json(replyText(
    `🤔 말씀하신 내용을 잘 이해하지 못했어요.\n\n` +
    `아래 예시처럼 입력해보실 수 있어요:\n\n` +
    `• 김복두 01012345678 회원 등록\n` +
    `• 다음 주 화요일 오후 3시 수업 예약\n` +
    `• 금요일 개인 운동 신청\n\n` +
    `조금만 더 구체적으로 입력해주시면 바로 도와드릴게요!`
  ));
}
