import { openai } from "../../services/openai.js";
import { supabase } from "../../services/supabase.js";
import { fetchRecentHistory } from "../utils/fetchHistoryForRAG.js";
import { fetchRecentFallback } from "../utils/fetchRecentFallback.js";
import { getTodayAssignment } from "../handlers/getTodayAssignment.js";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const clean = utterance.normalize("NFKC").trim();

  // 1. 부정 응답
  if (NO_KEYWORDS.includes(clean)) {
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  // 2. 긍정 응답 → 최근 intent 이어서 복원
  if (YES_KEYWORDS.includes(clean)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      return { intent: last.intent, handler: last.handler, action: last.action };
    }
    return { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  }

  // 3. 등록 문장 포함
  if (clean === "등록" || clean.startsWith("등록")) {
    const last = sessionContext[kakaoId];
    if (last?.handler) {
      return { intent: last.intent, handler: last.handler, action: last.action };
    }
    return { intent: "기타", handler: "fallback" };
  }

  // intent 분기
if (handler === "getTodayAssignment") {
  return getTodayAssignment(kakaoId, res);
}


// classifyIntent.js 예시 결과:
if (/오늘.*(과제|운동|뭐해|뭐 해야|스케줄)/.test(utterance)) {
  return { intent: "오늘의 과제 조회", handler: "getTodayAssignment" };
}

  // ✅ 4. rule-based 분기 (handler + action)
  if (clean === "개인 운동") return { intent: "개인 운동 예약 시작", handler: "booking", action: "showPersonalSlots" };
  if (/^\d{1,2}시 취소$/.test(clean)) return { intent: "개인 운동 예약 취소", handler: "booking", action: "cancelPersonal" };
  if (/^\d{1,2}시$/.test(clean)) return { intent: "개인 운동 예약", handler: "booking", action: "reservePersonal" };
  if (/^[월화수목금토일]\s\d{2}:\d{2}\s~\s\d{2}:\d{2}$/.test(clean)) return { intent: "레슨 시간 선택", handler: "booking", action: "confirmReservation" };
  if (clean === "레슨") return { intent: "운동 예약", handler: "booking", action: "showTrainerSlots" };
  if (/[월화수목금토일].*?시\s*~\s*\d{1,2}시/.test(clean)) return { intent: "가용 시간 등록", handler: "auth", action: "registerAvailability" };
  if (/^회원 등록\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(clean)) return { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  if (/^회원\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(clean)) return { intent: "회원 등록", handler: "auth", action: "registerMember" };
  if (/^전문가\s[가-힣]{2,4}\s01[0-9]{7,8}$/.test(clean)) return { intent: "전문가 등록", handler: "auth", action: "registerTrainer" };

  // ✅ 5. 과제 흐름
  if (/^[가-힣]{2,4},.*(스쿼트|팔굽혀펴기|런지|운동|과제)/.test(clean)) return { intent: "과제 등록", handler: "assignment", action: "assignWorkout" };
  if (clean === "시작하기") return { intent: "운동 시작", handler: "startWorkout" };
  if (clean === "운동 완료") return { intent: "운동 완료", handler: "completeWorkout" };
  if (clean.length > 5 && /통증|무릎|어깨|허리|아픔|불편/.test(clean)) return { intent: "운동 특이사항", handler: "reportWorkoutCondition" };

  // fallback → GPT
  const prompt = `다음 문장을 intent와 handler, action으로 분류해줘:

"${utterance}"

기능 목록 예시:
- 회원 등록 → auth/registerMember
- 운동 예약 → booking/showTrainerSlots
- 개인 운동 예약 → booking/reservePersonal
- 과제 등록 → assignment/assignWorkout
- 운동 시작 → startWorkout
- 운동 완료 → completeWorkout
- 특이사항 보고 → reportWorkoutCondition

JSON 형식:
{
  "intent": "운동 완료",
  "handler": "completeWorkout"
}`;

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

    sessionContext[kakaoId] = {
      intent: result.intent,
      handler: result.handler,
      action: result.action || null
    };

    return result;
  } catch (e) {
    console.warn("⚠️ GPT 분류 실패:", e);
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }
}