// 📁 utils/fetchHistoryForRag.js
import { supabase } from "../services/supabase.mjs";

export async function fetchRecentHistory(kakaoId, limit = 5) {
  const { data, error } = await supabase
    .from("conversation_logs")
    .select("step, utterance")
    .eq("kakao_id", kakaoId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ 대화 히스토리 불러오기 실패:", error);
    return [];
  }

  return data.reverse().map(log => `(${log.step}) ${log.utterance}`);
}
