// ✅ handlers/system/fallback.mjs
import { replyButton } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

/**
 * fallback
 * - 발화 인식 실패 or handler/action 없음
 * - fallback_logs 테이블에 로그 저장 + QuickReplies 안내
 */
export default async function fallback(utterance, kakaoId, res, handler = null, action = null) {
  console.warn("🔁 fallback triggered:", utterance);

  if (handler || action) {
    console.warn("⚠️ 실행 가능한 핸들러/액션이 없음:", { handler, action });
  }

  try {
    const { error } = await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "기타",
      handler: handler || "fallback",
      action: action || null,
      error_message: null,
      note: "fallback.mjs triggered"
    });
    if (error) {
      console.error("❌ fallback_logs insert 실패:", error.message);
    }
  } catch (e) {
    console.error("🔥 fallback_logs insert 예외 발생:", e.message);
  }

  // QuickReplies
  return res.json(
    replyButton(
      "🤔 말씀하신 내용을 잘 이해하지 못했어요.\n어떻게 도와드릴까요?",
      ["메인 메뉴", "도움말"]
    )
  );
}
