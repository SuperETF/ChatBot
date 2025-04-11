import { openai } from "../services/openai.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const cleanUtterance = utterance.normalize("NFKC").trim();

  // ✅ 긍정 응답일 경우: 이전 intent 재사용
  if (YES_KEYWORDS.includes(cleanUtterance)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ 긍정 응답 → 이전 intent 재사용:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
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

반환 형식(JSON):
{
  "intent": "통증 입력",
  "handler": "recordPain"
}

문장: "${utterance}"
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content.trim());

    // ✅ 다음 요청을 위해 sessionContext에 저장
    sessionContext[kakaoId] = {
      intent: result.intent,
      handler: result.handler
    };

    return result;
  } catch (e) {
    return { intent: "기타", handler: "fallback" };
  }
}