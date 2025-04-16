import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js";
import { fetchRecentHistory } from "../utils/fetchHistoryForRAG.js";
import { fetchRecentFallback } from "../utils/fetchRecentFallback.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const cleanUtterance = utterance.normalize("NFKC").trim();

  // 1. 부정 응답
  if (NO_KEYWORDS.includes(cleanUtterance)) {
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  // 2. 긍정 응답 → 최근 intent 이어서 복원
  if (YES_KEYWORDS.includes(cleanUtterance)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      return { intent: last.intent, handler: last.handler };
    }
    return { intent: "회원 등록", handler: "trainerRegisterMember" };
  }

  // 3. '등록' 포함 응답
  if (cleanUtterance === "등록" || cleanUtterance.startsWith("등록")) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      return { intent: last.intent, handler: last.handler };
    }
    return { intent: "기타", handler: "fallback" };
  }

  // ✅ 4. 정규식 기반 rule match (우선 처리)

  if (/^회원 등록\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    return { intent: "회원 등록", handler: "trainerRegisterMember" };
  }

  if (/^회원\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    return { intent: "회원 등록", handler: "registerMember" };
  }

  if (/^전문가\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    return { intent: "전문가 등록", handler: "registerTrainer" };
  }

  if (cleanUtterance === "레슨") {
    return { intent: "운동 예약", handler: "showTrainerSlots" };
  }

  if (/^[월화수목금토일]\s\d{2}:\d{2}\s~\s\d{2}:\d{2}$/.test(cleanUtterance)) {
    return { intent: "레슨 시간 선택", handler: "confirmReservation" };
  }

  if (cleanUtterance === "개인 운동") {
    return { intent: "개인 운동 예약 시작", handler: "showPersonalWorkoutSlots" };
  }

  if (/^\d{1,2}시$/.test(cleanUtterance)) {
    return { intent: "개인 운동 예약", handler: "reservePersonalWorkout" };
  }

  if (/^\d{1,2}시 취소$/.test(cleanUtterance)) {
    return { intent: "개인 운동 예약 취소", handler: "cancelPersonalWorkout" };
  }

  // ✅ 5. GPT 분류 fallback
  const prompt = `
다음 문장을 intent와 handler로 분류해줘:

"${utterance}"

기능 목록:
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

예시:
- "회원 등록 홍길동 01012345678" → 회원 등록 / trainerRegisterMember
- "회원 홍길동 01012345678" → 회원 등록 / registerMember
- "전문가 김철수 01098765432" → 전문가 등록 / registerTrainer

결과 형식 (JSON):
{
  "intent": "회원 등록",
  "handler": "registerMember"
}
`;

  try {
    const recentHistory = await fetchRecentHistory(kakaoId);
    const recentFallback = await fetchRecentFallback(kakaoId);

    const messages = [
      {
        role: "system",
        content: `🧠 최근 대화 기록:\n${recentHistory.join("\n")}\n\n🔁 이전 fallback 로그:\n${recentFallback.join("\n")}`
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

    // 전문가인 경우 핸들러 전환
    if (result.intent === "회원 등록") {
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (trainer) {
        result.handler = "trainerRegisterMember";
      }
    }

    sessionContext[kakaoId] = {
      intent: result.intent,
      handler: result.handler
    };

    return result;
  } catch (e) {
    console.warn("⚠️ GPT 분류 실패:", e);
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }
}
