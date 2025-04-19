// 📄 handlers/system/fallback.mjs
import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

export default async function fallback(utterance, kakaoId, res, handler = null, action = null) {
  console.warn("🔁 fallback triggered:", utterance);
  
  // 🔎 분류는 성공했지만 실행할 handler/action이 없어서 fallback 된 경우 로그 출력
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
      note: "fallback.mjs triggered",
      model_used: "fallback-handler"
    });

    if (error) {
      console.error("❌ fallback_logs insert 실패:", error.message);
    }
  } catch (e) {
    console.error("🔥 fallback_logs insert 예외 발생:", e.message);
  }

  return res.json(replyText(
    `🤔 말씀하신 내용을 잘 이해하지 못했어요.\n\n`
  ));
}
