import { supabase } from "../services/supabase.js";

export async function logMultiTurnStep({ kakaoId, intent, step, utterance }) {
  const { error } = await supabase.from("conversation_logs").insert({
    kakao_id: kakaoId,
    intent,
    step,
    utterance
  });

  if (error) {
    console.error("❌ 멀티턴 로그 저장 실패:", error);
  } else {
    console.log(`📑 멀티턴 기록됨: ${intent} - ${step} - ${utterance}`);
  }
}