// 📄 handlers/system/fallback.mjs
import { replyButton } from "../../utils/reply.mjs"; 
import { supabase } from "../../services/supabase.mjs";

/**
 * fallback
 * - 인식하지 못한 발화나, 매칭된 handler/action이 없는 경우
 * - fallback_logs 테이블에 로그 저장
 * - 사용자에게 QuickReplies 제시
 */
export default async function fallback(utterance, kakaoId, res, handler = null, action = null) {
  console.warn("🔁 fallback triggered:", utterance);

  // 실행할 handler/action은 분류되었지만 실제로 함수가 없어서 실패한 경우
  if (handler || action) {
    console.warn("⚠️ 실행 가능한 핸들러/액션이 없음:", { handler, action });
  }

  try {
    // DB에 로그 저장
    const { error } = await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "기타",
      handler: handler || "fallback",
      action: action || null,
      error_message: null,
      note: "fallback.mjs triggered",
      model_used: "fallback-handler"
    });

    if (error) {
      console.error("❌ fallback_logs insert 실패:", error.message);
    }
  } catch (e) {
    console.error("🔥 fallback_logs insert 예외 발생:", e.message);
  }

  // QuickReplies 버튼 예시
  return res.json(
    replyButton(
      "🤔 말씀하신 내용을 잘 이해하지 못했어요.\n어떻게 도와드릴까요?",
      ["메인 메뉴", "도움말"]
    )
  );
}
