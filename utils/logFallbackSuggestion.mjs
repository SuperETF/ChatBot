import { supabase } from "../services/supabase.mjs";

export async function logFallbackSuggestion({ kakaoId, utterance, suggestion }) {
  const { error } = await supabase.from("fallback_logs").insert({
    kakao_id: kakaoId,
    utterance,
    suggestion
  });

  if (error) {
    console.error("❌ fallback 로그 저장 실패:", error);
  } else {
    console.log("📥 fallback 로그 저장 완료");
  }
}
