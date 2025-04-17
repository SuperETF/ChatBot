import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { fetchRecentHistory } from "../../utils/fetchHistoryForRAG.mjs";
import { fetchRecentFallback } from "../../utils/fetchRecentFallback.mjs";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];

const sessionContext = {};

// ✅ intent 분류용 파인튜닝 GPT만 사용
const fallbackModel = process.env.GPT_MODEL_ID_INTENT;

export default async function classifyIntent(utterance, kakaoId) {
  const clean = utterance.normalize("NFKC").trim();

  // ✅ 빠른 rule 기반 intent 분기
  if (/^\d{1,2}시/.test(clean)) return { intent: "개인 운동 예약", handler: "booking", action: "reservePersonal" };
  if (NO_KEYWORDS.includes(clean)) {
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }
  if (YES_KEYWORDS.includes(clean)) {
    const last = sessionContext[kakaoId];
    return last?.handler ? last : { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  }
  if (clean === "레슨") return { intent: "운동 예약", handler: "booking", action: "showTrainerSlots" };
  if (clean === "개인 운동") return { intent: "개인 운동 예약 시작", handler: "booking", action: "showPersonalSlots" };
  if (clean === "시작하기") return { intent: "운동 시작", handler: "workout", action: "startWorkout" };
  if (clean === "운동 완료") return { intent: "운동 완료", handler: "workout", action: "completeWorkout" };

  // ✅ fallback GPT intent 분류 시작
  const prompt = `다음 문장을 intent, handler, action으로 분류해줘.\n아래 형식으로 JSON만 출력해:\n{\n  "intent": "과제 등록",\n  "handler": "assignment",\n  "action": "assignWorkout"\n}\n\n문장: "${utterance}"`;

  try {
    if (!fallbackModel) throw new Error("❌ fallback GPT 모델 ID가 정의되지 않았습니다. .env를 확인하세요.");

    const recentHistory = await fetchRecentHistory(kakaoId);
    const recentFallback = await fetchRecentFallback(kakaoId);

    const messages = [
      {
        role: "system",
        content: `🧠 최근 대화 기록:\n${recentHistory.join("\n")}\n\n🔁 이전 fallback 로그:\n${recentFallback.join("\n")}`
      },
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: fallbackModel,
      messages,
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content.trim());

    if (!result.intent || !result.handler) throw new Error("GPT fallback: intent 또는 handler 누락");

    // 액션 누락 시 기본 handler명으로 fallback
    result.action = result.action || result.handler;

    sessionContext[kakaoId] = result;

    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: result.intent,
      handler: result.handler,
      action: result.action,
      error_message: null,
      note: "GPT-3.5 fallback (intent)",
      model_used: fallbackModel
    });

    return result;

  } catch (e) {
    console.warn("⚠️ GPT fallback intent 분류 실패:", e.message);
    sessionContext[kakaoId] = null;

    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "기타",
      handler: "fallback",
      action: null,
      error_message: e.message || null,
      note: "classifyIntent fallback",
      model_used: fallbackModel || "gpt-fallback-error"
    });

    return { intent: "기타", handler: "fallback", action: undefined };
  }
}
