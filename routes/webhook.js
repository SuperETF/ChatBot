import express from "express";
import { supabase } from "../services/supabase.js";
import classifyIntent from "../handlers/system/classifyIntent.js";

// 수정 핸들러
import booking from "../handlers/booking.js";
import auth from "../handlers/auth.js";

// 📂 auth
import registerMember from "../handlers/auth/registerMember.js";
import registerTrainer from "../handlers/auth/registerTrainer.js";
import trainerRegisterMember from "../handlers/auth/trainerRegisterMember.js";
import listMembers from "../handlers/auth/listMembers.js";

// ✅ webhook.js 내 assignment 구조 대응
import assignment from "../handlers/assignment.js";
import { startWorkout } from "../handlers/startWorkout.js";
import { completeWorkout } from "../handlers/completeWorkout.js";
import { reportWorkoutCondition } from "../handlers/reportWorkoutCondition.js";
// ✅ 과제 알림
import { getTodayAssignment } from "../handlers/getTodayAssignment.js";

// 📂 reservation (레슨 + 개인 운동)
import registerAvailability from "../handlers/reservation/registerAvailability.js";
import showTrainerSlots from "../handlers/reservation/showTrainerSlots.js";
import confirmReservation from "../handlers/reservation/confirmReservation.js";
import showPersonalWorkoutSlots from "../handlers/reservation/showPersonalWorkoutSlots.js";
import reservePersonalWorkout from "../handlers/reservation/reservePersonalWorkout.js";
import cancelPersonalWorkout from "../handlers/reservation/cancelPersonalWorkout.js";

// 📂 health
import recordBodyComposition from "../handlers/health/recordBodyComposition.js";
import recordHeartRate from "../handlers/health/recordHeartRate.js";
import recordStrengthRecord from "../handlers/health/recordStrengthRecord.js";
import recordPainReport from "../handlers/health/recordPainReport.js";
import recordPersonalCondition from "../handlers/health/recordPersonalCondition.js";
import handleFreeInput from "../handlers/health/handleFreeInput.js";

// 📂 recommend
import recommendRoutine from "../handlers/recommend/recommendRoutine.js";
import recommendMeal from "../handlers/recommend/recommendMeal.js";

// 📂 reminder
import handleConditionReport from "../handlers/reminder/handleConditionReport.js";

// 📂 fallback/system
import fallback from "../handlers/system/fallback.js";

// 유틸
import { replyText, replyButton } from "../utils/reply.js";
import { logMultiTurnStep } from "../utils/log.js";


const router = express.Router();
const sessionContext = {};
const SESSION_TTL_MS = 2 * 60 * 1000;

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  console.log("📩 사용자 발화:", utterance);
  console.log("👤 사용자 ID:", kakaoId);

  const ctx = sessionContext[kakaoId];
  if (ctx && Date.now() - ctx.timestamp > SESSION_TTL_MS) {
    console.log("⏳ 세션 만료 → 초기화");
    sessionContext[kakaoId] = null;
  }

  if (["안 할래", "취소", "그만", "등록 안 해"].includes(utterance)) {
    sessionContext[kakaoId] = null;
    return res.json(replyText("진행을 취소했어요. 언제든지 다시 시작하실 수 있어요."));
  }

  if (["등록", "등록할게"].includes(utterance)) {
    const ctx = sessionContext[kakaoId];
    if (ctx?.intent === "회원 등록" && ctx?.data?.name && ctx?.data?.phone) {
      sessionContext[kakaoId] = null;
      return trainerRegisterMember(kakaoId, `회원 등록 ${ctx.data.name} ${ctx.data.phone}`, res);
    }
  }

  if (ctx?.intent === "회원 등록") {
    if (ctx.step === "askName") {
      ctx.data.name = utterance;
      ctx.step = "askPhone";
      ctx.timestamp = Date.now();
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
      return res.json(replyText("전화번호도 입력해주세요."));
    }
    if (ctx.step === "askPhone") {
      ctx.data.phone = utterance;
      ctx.step = "confirmRegister";
      ctx.timestamp = Date.now();
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });
      return res.json(replyButton(
        `${ctx.data.name}님(${ctx.data.phone})을 등록하시겠습니까?`,
        ["등록"]
      ));
    }
  }

  // ✅ intent 분류
  const { intent, handler } = await classifyIntent(utterance, kakaoId);
  console.log("[INTENT] 분류 결과:", intent);

  // intent 분류 이후 분기
if (handler === "auth") {
  return auth(kakaoId, utterance, res, action);
  
}

// intent 분기
if (handler === "getTodayAssignment") {
  return getTodayAssignment(kakaoId, res);
}

// intent 분류 이후 분기
if (handler === "assignment") {
  return assignment(kakaoId, utterance, res, action);
}

if (handler === "startWorkout") {
  return startWorkout(kakaoId, res);
}

if (handler === "completeWorkout") {
  return completeWorkout(kakaoId, res);
}

if (handler === "reportWorkoutCondition") {
  return reportWorkoutCondition(kakaoId, utterance, res);
}

  // ✅ 운동 예약 intent 처리

  if (handler === "booking") {
    return booking(kakaoId, utterance, res, action);
  }

  if (utterance === "레슨" || intent === "운동 예약") {
    return showTrainerSlots(kakaoId, res);
  }

  if (/^[월화수목금토일]\s\d{2}:\d{2}\s~\s\d{2}:\d{2}$/.test(utterance)) {
    return confirmReservation(kakaoId, utterance, res);
  }

  if (ctx?.intent === "특이사항 입력") {
    return handleConditionReport(kakaoId, utterance, res);
  }

  if (utterance === "개인 운동") {
    return showPersonalWorkoutSlots(kakaoId, res);
  }

  if (/^\d{1,2}시 취소$/.test(utterance)) {
    return cancelPersonalWorkout(kakaoId, utterance, res);
  }

  if (/^\d{1,2}시$/.test(utterance)) {
    return reservePersonalWorkout(kakaoId, utterance, res);
  }

  if (intent === "회원 등록" && handler === "trainerRegisterMember") {
    const clean = utterance.replace(/^회원 등록\s*/, "").trim();
    const namePhoneMatch = clean.match(/([가-힣]{2,4})\s+(01[016789][0-9]{7,8})/);

    if (namePhoneMatch) {
      const name = namePhoneMatch[1];
      const phone = namePhoneMatch[2];
      sessionContext[kakaoId] = {
        intent,
        handler,
        data: { name, phone },
        step: "confirmRegister",
        timestamp: Date.now()
      };
      return res.json(replyButton(
        `${name}님(${phone})을 등록하시겠습니까?`,
        ["등록"]
      ));
    }

    sessionContext[kakaoId] = {
      intent,
      handler,
      step: "askName",
      data: {},
      timestamp: Date.now()
    };
    return res.json(replyText("회원님의 성함을 알려주세요."));
  }

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  const isTrainer = !!trainer;
  console.log("[DEBUG] 전문가 인증 여부:", isTrainer);

  if (isTrainer) {
    if (intent === "회원 목록 조회") return listMembers(kakaoId, utterance, res);
    if (intent === "체성분 입력") return recordBodyComposition(kakaoId, utterance, res);
    if (intent === "통증 입력") return recordPainReport(kakaoId, utterance, res);
    if (intent === "가용 시간 등록") return registerAvailability(kakaoId, utterance, res);
    if (intent === "회원 등록") return trainerRegisterMember(kakaoId, utterance, res);
    if (intent === "근력 기록 입력") return recordStrengthRecord(kakaoId, utterance, res);
    if (intent === "특이사항 입력") return recordPersonalCondition(kakaoId, utterance, res);
  }

  const handlerFunc = {
    "루틴 추천": recommendRoutine,
    "식단 추천": recommendMeal,
    "내 정보 조회": showUserInfo,
    "전문가 등록": registerTrainer,
    "회원 등록": registerMember,
    "심박수 입력": recordHeartRate,
    "자유 입력": handleFreeInput
  }[intent];

  if (handlerFunc) {
    return handlerFunc(kakaoId, utterance, res);
  }

  return fallback(utterance, kakaoId, res);
});

export default router;