import express from "express";
import { supabase } from "../services/supabase.js";
import classifyIntent from "../handlers/classifyIntent.js";

// 핸들러
import reserveWorkout from "../handlers/reserveWorkout.js";
import recommendRoutine from "../handlers/recommendRoutine.js";
import showUserInfo from "../handlers/showUserInfo.js";
import recordHeartRate from "../handlers/recordHeartRate.js";
import recommendMeal from "../handlers/recommendMeal.js";
import registerMember from "../handlers/registerMember.js";
import registerTrainer from "../handlers/registerTrainer.js";
import listMembers from "../handlers/listMembers.js";
import recordBodyComposition from "../handlers/recordBodyComposition.js";
import recordPainReport from "../handlers/recordPainReport.js";
import registerAvailability from "../handlers/registerAvailability.js";
import showPersonalWorkoutSlots from "../handlers/showPersonalWorkoutSlots.js";
import reservePersonalWorkout from "../handlers/reservePersonalWorkout.js";
import cancelPersonalWorkout from "../handlers/cancelPersonalWorkout.js";
import trainerRegisterMember from "../handlers/trainerRegisterMember.js";
import fallback from "../handlers/fallback.js";
import recordStrengthRecord from "../handlers/recordStrengthRecord.js";
import recordPersonalCondition from "../handlers/recordPersonalCondition.js";
import handleFreeInput from "../handlers/handleFreeInput.js";
import showTrainerSlots from "../handlers/showTrainerSlots.js";
import confirmReservation from "../handlers/confirmReservation.js";
import handleConditionReport from "../handlers/handleConditionReport.js";

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

  // ✅ 운동 예약 intent 직접 처리
  if (utterance === "레슨" || intent === "운동 예약") {
    return showTrainerSlots(kakaoId, res);
  }

  if (/^[월화수목금토일]\s\d{2}:\d{2}\s~\s\d{2}:\d{2}$/.test(utterance)) {
    return confirmReservation(kakaoId, utterance, res);
  }

  if (ctx?.intent === "특이사항 입력") {
    return handleConditionReport(kakaoId, utterance, res);
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
    "자유 입력": handleFreeInput,
    "개인 운동 예약": reservePersonalWorkout,
    "개인 운동 시간 조회": showPersonalWorkoutSlots,
    "개인 운동 예약 취소": cancelPersonalWorkout
  }[intent];

  if (handlerFunc) {
    return handlerFunc(kakaoId, utterance, res);
  }

  return fallback(utterance, kakaoId, res);
});

export default router;
