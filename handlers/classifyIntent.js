import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js";
import { fetchRecentHistory } from "../utils/fetchHistoryForRAG.js";
import { fetchRecentFallback } from "../utils/fetchRecentFallback.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const cleanUtterance = utterance.normalize("NFKC").trim();

  // ❌ 1. 부정 응답 → 세션 초기화
  if (NO_KEYWORDS.includes(cleanUtterance)) {
    console.log("🛑 부정 응답 → 컨텍스트 초기화");
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  // 🔁 2. 긍정 응답 → 이전 컨텍스트 기반 intent 복원
  if (YES_KEYWORDS.includes(cleanUtterance)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ 컨텍스트 기반 intent 복원:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }

    // fallback 방지: 최근 intent가 없더라도 안전하게 회원 등록으로 유지
    return { intent: "회원 등록", handler: "trainerRegisterMember" };
  }

  // ↩️ 3. '등록'이라는 단어로만 온 경우 → 이전 컨텍스트 유지
  if (cleanUtterance === "등록" || cleanUtterance.startsWith("등록")) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ '등록' 포함 발화 → 이전 intent 유지:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
    return { intent: "기타", handler: "fallback" };
  }

  // ✅ 4. 명확한 패턴 기반 intent 우선 매칭
  if (/^회원 등록\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 트레이너가 회원 등록");
    return { intent: "회원 등록", handler: "trainerRegisterMember" };
  }

  if (/^회원\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 회원 본인 등록");
    return { intent: "회원 등록", handler: "registerMember" };
  }

  if (/^전문가\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 전문가 등록");
    return { intent: "전문가 등록", handler: "registerTrainer" };
  }

  // 🤖 5. GPT 분류 수행
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

    // 🧠 전문가일 경우 → 회원 등록 핸들러를 trainerRegisterMember로 변경
    if (result.intent === "회원 등록") {
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (trainer) {
        result.handler = "trainerRegisterMember";
        console.log("👨‍🏫 전문가로 감지됨 → 핸들러 변경: trainerRegisterMember");
      }
    }

    sessionContext[kakaoId] = {
      intent: result.intent,
      handler: result.handler
    };

    return result;
  } catch (e) {
    console.warn("⚠️ GPT 분류 실패, fallback 으로 전환", e);
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }
}
