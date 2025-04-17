// classifyIntent.mjs (최종 안정화 버전)
import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { fetchRecentHistory } from "../../utils/fetchHistoryForRAG.mjs";
import { fetchRecentFallback } from "../../utils/fetchRecentFallback.mjs";

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const sessionContext = {};

export default async function classifyIntent(utterance, kakaoId) {
  const clean = utterance.normalize("NFKC").trim();

  const hourMatch = clean.match(/^\d{1,2}시/);
  if (hourMatch) {
    return { intent: "개인 운동 예약", handler: "booking", action: "reservePersonal" };
  }

  if (NO_KEYWORDS.includes(clean)) {
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  if (YES_KEYWORDS.includes(clean)) {
    const last = sessionContext[kakaoId];
    if (last?.handler) return last;
    return { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  }

  if (clean === "등록" || clean.startsWith("등록")) {
    const last = sessionContext[kakaoId];
    if (last?.handler) return last;
    return { intent: "기타", handler: "fallback" };
  }

  if (clean === "레슨") {
    return { intent: "운동 예약", handler: "booking", action: "showTrainerSlots" };
  }

  if (/[월화수목금토일].*?\d{1,2}시\s*~\s*\d{1,2}시/.test(clean)) {
    return { intent: "가용 시간 등록", handler: "booking", action: "registerAvailability" };
  }

  if (clean === "개인 운동") {
    return { intent: "개인 운동 예약 시작", handler: "booking", action: "showPersonalSlots" };
  }

  if (/예약.*있|예약된.*시간/.test(clean)) {
    return { intent: "예약 조회", handler: "booking", action: "showMyReservations" };
  }

  if (/오늘.*(과제|운동|뭐해|뭐 해야|스케줄)/.test(clean)) {
    return { intent: "오늘의 과제 조회", handler: "assignment", action: "getTodayAssignment" };
  }

  if (clean === "전문가 등록" || /전문가.*01[016789]\d{7,8}/.test(clean)) {
    return { intent: "전문가 등록", handler: "auth", action: "registerTrainer" };
  }

  if (/회원 등록.*01[016789]\d{7,8}/.test(clean) || /회원.*01[016789]\d{7,8}/.test(clean)) {
    return { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  }

  if (/^\d{1,2}시 취소$/.test(clean)) {
    return { intent: "개인 운동 예약 취소", handler: "booking", action: "cancelPersonal" };
  }

  if (/^[월화수목금토일]\s*\(\d{4}-\d{2}-\d{2}\)\s\d{2}:\d{2}\s~\s\d{2}:\d{2}$/.test(clean)) {
    return { intent: "레슨 시간 선택", handler: "booking", action: "confirmReservation" };
  }

  if (/레슨.*예약|레슨.*신청|수업.*예약/.test(clean)) {
    return { intent: "운동 예약", handler: "booking", action: "showTrainerSlots" };
  }

  if (/^[가-힣]{2,10}(,|\s).*(런지|스쿼트|플랭크|팔굽혀펴기|버피|과제|운동)/.test(clean)) {
    return { intent: "과제 등록", handler: "assignment", action: "assignWorkout" };
  }

  if (clean === "시작하기") {
    return { intent: "운동 시작", handler: "workout", action: "startWorkout" };
  }

  if (clean === "운동 완료") {
    return { intent: "운동 완료", handler: "workout", action: "completeWorkout" };
  }

  if (clean.length > 5 && /통증|무릎|어깨|허리|아픔|불편/.test(clean)) {
    return { intent: "운동 특이사항", handler: "workout", action: "reportWorkoutCondition" };
  }

  // 🧠 GPT fallback
  const prompt = `다음 문장을 intent, handler, action으로 분류해줘.\n아래 형식으로 JSON만 출력해:\n{\n  \"intent\": \"운동 시작\",\n  \"handler\": \"workout\",\n  \"action\": \"startWorkout\"\n}\n\n문장: \"${utterance}\"`;

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

    // 📌 fallback 결과 보정
    if (!result.intent || !result.handler) throw new Error("GPT fallback: 필수 필드 누락");

    if (result.intent === "운동 지시" && result.handler === "workout") {
      result.intent = "과제 등록";
      result.handler = "assignment";
      result.action = "assignWorkout";
    }
    if (result.intent === "회원 목록 조회" && result.handler === "member") {
      result.handler = "auth";
      result.action = "listMembers";
    }
    if (result.intent === "예약 확인" && result.handler === "reservation") {
      result.handler = "booking";
      result.action = "showPersonalSlots";
    }
    if (result.intent === "수업 시간 조회" && result.handler === "classSchedule") {
      result.handler = "booking";
      result.action = "showTrainerSlots";
    }
    if (result.intent === "운동 시작" && result.handler === "setWorkout") {
      result.handler = "workout";
      result.action = "startWorkout";
    }
    if (result.intent === "운동 완료" && result.handler === "setWorkout") {
      result.handler = "workout";
      result.action = "completeWorkout";
    }
    if (result.intent === "운동 특이사항" && result.handler === "report") {
      result.handler = "workout";
      result.action = "reportWorkoutCondition";
    }

    if (!result.action) {
      result.action = result.handler;
    }

    sessionContext[kakaoId] = result;
    return result;
  } catch (e) {
    console.warn("⚠️ GPT fallback 분류 실패:", e.message);
    sessionContext[kakaoId] = null;

    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: e.message || null,
      note: "classifyIntent fallback"
    });

    return { intent: "기타", handler: "fallback", action: undefined };
  }
}
