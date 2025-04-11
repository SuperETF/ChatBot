import { openai } from "../services/openai.js";
import { fetchRecentHistory } from "../utils/fetchHistoryForRAG.js";
import { fetchRecentFallback } from "../utils/fetchRecentFallback.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const cleanUtterance = utterance.normalize("NFKC").trim();

  if (NO_KEYWORDS.includes(cleanUtterance)) {
    console.log("🛑 부정 응답 → 컨텍스트 초기화");
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  if (YES_KEYWORDS.includes(cleanUtterance)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ 컨텍스트 기반 intent 복원:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
  }

  if (cleanUtterance === "등록" || cleanUtterance.match(/^등록.*$/)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ '등록' 포함 발화 → 이전 intent 유지:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
    return { intent: "기타", handler: "fallback" };
  }

  const prompt = `
다음 사용자 발화를 intent와 handler로 분류해줘.

지원 기능:
- 운동 예약 → bookWorkout
- 루틴 추천 → recommendRoutine
- 식단 추천 → recommendDiet
- 심박수 입력 → recordHeartRate
- 통증 입력 → recordPain
- 체성분 입력 → recordBodyComposition
- 회원 등록 → registerMember
- 전문가 등록 → registerTrainer
- 자유 입력 → handleFreeInput
- 기타 → fallback

❗️주의사항:
- 사용자가 '등록할게', '진행해', '그래'라고 말한 경우, 반드시 직전 질문의 intent를 유지하세요.
- '등록'이라는 단어만 보고 '회원 등록'으로 착각하지 마세요.

반환 형식(JSON):
{
  "intent": "통증 입력",
  "handler": "recordPain"
}

문장: "${utterance}"
`;

  try {
    const recentHistory = await fetchRecentHistory(kakaoId);
    const recentFallback = await fetchRecentFallback(kakaoId);

    const messages = [
      {
        role: "system",
        content: `아래는 이전 대화 흐름과 fallback 추천 로그입니다.\n\n🧠 대화 히스토리:\n${recentHistory.join("\n")}\n\n🧠 이전 fallback 로그:\n${recentFallback.join("\n")}`
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content.trim());

    sessionContext[kakaoId] = {
      intent: result.intent,
      handler: result.handler
    };

    return result;
  } catch (e) {
    console.warn("⚠️ GPT 분류 실패, fallback 으로 전환");
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }
}
