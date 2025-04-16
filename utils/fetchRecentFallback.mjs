// 📁 utils/fetchRecentFallback.js
import { supabase } from "../services/supabase.js";

export async function fetchRecentFallback(kakaoId, limit = 3) {
  const { data, error } = await supabase
    .from("fallback_logs")
    .select("utterance, suggestion, user_response")
    .eq("kakao_id", kakaoId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ 최근 fallback 로그 조회 실패:", error);
    return [];
  }

  return data.map(f => `질문: ${f.utterance}\n추천: ${f.suggestion}\n선택: ${f.user_response || "선택 안됨"}`);
}
