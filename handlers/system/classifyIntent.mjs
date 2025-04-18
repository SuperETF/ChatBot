import { openai } from "../../services/openai.mjs";
import { supabase } from "../../services/supabase.mjs";
import { fetchRecentHistory } from "../../utils/fetchHistoryForRAG.mjs";
import { fetchRecentFallback } from "../../utils/fetchRecentFallback.mjs";

const sessionContext = {};

const YES_KEYWORDS = ["네", "그래", "응", "좋아", "알겠어", "등록 원해", "등록할게", "진행해"];
const NO_KEYWORDS = ["아니요", "아니", "괜찮아요", "안 할래", "지금은 아니야"];
const AM_PM_KEYWORDS = ["오전", "오후"];

const fallbackModel = process.env.GPT_MODEL_ID_INTENT;

export default async function classifyIntent(utterance, kakaoId) {
  const clean = utterance.normalize("NFKC").trim();

  // ✅ 인증번호 포함 등록 정규식
  if (/^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(clean)) {
    return { intent: "전문가 등록", handler: "auth", action: "registerTrainer" };
  }
  if (/^회원\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(clean)) {
    return { intent: "회원 등록", handler: "auth", action: "registerTrainerMember" };
  }
  if (/^[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(clean)) {
    return { intent: "회원 본인 등록", handler: "auth", action: "registerMember" };
  }

  // ✅ 오전/오후 확인 응답
  if (AM_PM_KEYWORDS.includes(clean)) {
    return { intent: "시간 확인", handler: "booking", action: "confirmPendingTime" };
  }

  // ✅ 기본 예약 발화
  if (/\d{1,2}시/.test(clean) && /운동|예약/.test(clean)) {
    return { intent: "개인 운동 예약", handler: "booking", action: "reservePersonal" };
  }

  // ✅ 예약 내역 조회
  if (/예약\s*내역|내\s*예약|운동\s*몇\s*시|레슨\s*몇\s*시/.test(clean)) {
    return { intent: "예약 내역 조회", handler: "booking", action: "showMyReservations" };
  }

  // ✅ 예약 취소
  if (/취소/.test(clean) && /\d{1,2}시/.test(clean)) {
    return { intent: "예약 취소", handler: "booking", action: "cancelPersonal" };
  }

  // ✅ 예약 현황
  if (/몇\s*명|현황|자리\s*있어/.test(clean) && /\d{1,2}시/.test(clean)) {
    return { intent: "예약 현황", handler: "booking", action: "showSlotStatus" };
  }

  // ✅ YES/NO
  if (NO_KEYWORDS.includes(clean)) {
    sessionContext[kakaoId] = null;
    return { intent: "기타", handler: "fallback" };
  }

  if (YES_KEYWORDS.includes(clean)) {
    const last = sessionContext[kakaoId];
    return last?.handler ? last : { intent: "기타", handler: "fallback" };
  }

  // ✅ fallback GPT 분류
  const prompt = `다음 문장을 intent, handler, action으로 분류해줘.\n아래 형식으로 JSON만 출력해:\n{\n  "intent": "과제 등록",\n  "handler": "assignment",\n  "action": "assignWorkout"\n}\n\n문장: "${utterance}"`;

  try {
    if (!fallbackModel) {
      console.warn("⚠️ fallbackModel ID 미정의 → fallback 처리됨");
      return { intent: "기타", handler: "fallback", action: undefined };
    }

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
