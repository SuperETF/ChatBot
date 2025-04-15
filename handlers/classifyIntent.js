import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js"; // ✅ 누락된 import
import { fetchRecentHistory } from "../utils/fetchHistoryForRAG.js";
import { fetchRecentFallback } from "../utils/fetchRecentFallback.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const cleanUtterance = utterance.normalize("NFKC").trim();

  // 🔸 1. 부정 응답
  if (NO_KEYWORDS.includes(cleanUtterance)) {
    console.log("🛑 부정 응답 → 컨텍스트 초기화");
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  // 🔸 2. 긍정 응답 → 직전 intent 이어서 진행
  if (YES_KEYWORDS.includes(cleanUtterance)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ 컨텍스트 기반 intent 복원:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
  }

  // 🔸 3. '등록'으로 시작하는 응답 → 직전 intent 복원
  if (cleanUtterance === "등록" || cleanUtterance.match(/^등록.*$/)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      console.log("↪️ '등록' 포함 발화 → 이전 intent 유지:", last.intent);
      return { intent: last.intent, handler: last.handler };
    }
    return { intent: "기타", handler: "fallback" };
  }

  // 🔸 4. 패턴 기반 룰 매칭 우선 처리
  if (/^회원 등록\s[가-힣]+\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 회원 등록");
    return { intent: "회원 등록", handler: "trainerRegisterMember" };
  }

  if (/^회원\s[가-힣]+\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 일반 회원 등록");
    return { intent: "회원 등록", handler: "registerMember" };
  }

  if (/^전문가\s[가-힣]+\s01[0-9]{7,8}$/.test(cleanUtterance)) {
    console.log("📌 rule-match: 전문가 등록");
    return { intent: "전문가 등록", handler: "registerTrainer" };
  }

  // 🔸 5. GPT 분류
  const prompt = `
아래는 사용자의 발화입니다:
"${utterance}"

다음 intent와 handler 중 하나로 정확히 분류해주세요:

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

✅ 예시1: "회원 등록 이지은 01012345678" → intent: 회원 등록, handler: trainerRegisterMember
✅ 예시2: "전문가 김철수 01023456789" → intent: 전문가 등록, handler: registerTrainer
✅ 예시3: "회원 박민지 01099887766" → intent: 회원 등록, handler: registerMember

반환 형식(JSON):
{
  "intent": "통증 입력",
  "handler": "recordPain"
}
`;

  try {
    const recentHistory = await fetchRecentHistory(kakaoId);
    const recentFallback = await fetchRecentFallback(kakaoId);

    const messages = [
      {
        role: "system",
        content: `🧠 이전 대화:\n${recentHistory.join("\n")}\n\n🔁 fallback 로그:\n${recentFallback.join("\n")}`
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

    // ✅ 전문가 여부 확인 후 handler 전환
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
