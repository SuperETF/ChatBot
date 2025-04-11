import express from "express";
import { supabase } from "../services/supabase.js";
import classifyIntent from "../handlers/classifyIntent.js";

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
import { replyText } from "../utils/reply.js";
import { logMultiTurnStep } from "../utils/log.js";

const router = express.Router();
const sessionContext = {};
const SESSION_TTL_MS = 2 * 60 * 1000; // 2분

function parseBodyFromUtterance(text) {
  const weight = text.match(/체중\s?(\d{2,3})/);
  const fat = text.match(/체지방\s?(\d{1,2})/);
  const muscle = text.match(/근육\s?(\d{2,3})/);
  if (weight && fat && muscle) {
    return {
      weight: Number(weight[1]),
      fat: Number(fat[1]),
      muscle: Number(muscle[1])
    };
  }
  return null;
}

const handlerMap = {
  "운동 예약": reserveWorkout,
  "루틴 추천": recommendRoutine,
  "식단 추천": recommendMeal,
  "내 정보 조회": showUserInfo,
  "회원": registerMember,
  "회원 등록": trainerRegisterMember,
  "전문가 등록": registerTrainer,
  "회원 목록 조회": listMembers,
  "체성분 입력": recordBodyComposition,
  "심박수 입력": recordHeartRate,
  "통증 입력": recordPainReport,
  "가용 시간 등록": registerAvailability,
  "근력 기록 입력": recordStrengthRecord,
  "특이사항 입력": recordPersonalCondition,
  "개인 운동 예약": reservePersonalWorkout,
  "개인 운동 시간 조회": showPersonalWorkoutSlots,
  "개인 운동 예약 취소": cancelPersonalWorkout,
};

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 사용자 발화:", utterance);
  console.log("👤 사용자 ID:", kakaoId);

  const ctx = sessionContext[kakaoId];
  if (ctx && Date.now() - ctx.timestamp > SESSION_TTL_MS) {
    console.log("⏳ 세션 만료 → 초기화");
    sessionContext[kakaoId] = null;
  }

  if (["안 할래", "취소", "그만", "등록 안 해"].includes(utterance.trim())) {
    sessionContext[kakaoId] = null;
    return res.json(replyText("진행을 취소했어요. 언제든지 다시 시작하실 수 있어요."));
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
      const { name, phone } = ctx.data;
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });
      sessionContext[kakaoId] = null;
      return registerMember(kakaoId, `${name} ${phone}`, res);
    }
  }

  if (ctx?.intent === "전문가 등록") {
    if (ctx.step === "askName") {
      ctx.data.name = utterance;
      ctx.step = "askPhone";
      ctx.timestamp = Date.now();
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
      return res.json(replyText("전화번호도 입력해주세요."));
    }
    if (ctx.step === "askPhone") {
      ctx.data.phone = utterance;
      const { name, phone } = ctx.data;
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });
      sessionContext[kakaoId] = null;
      return registerTrainer(kakaoId, `${name} ${phone}`, res);
    }
  }

  if (ctx?.intent === "자유 입력" && ctx.step === "askBody") {
    const bodyParsed = parseBodyFromUtterance(utterance);
    if (bodyParsed) {
      ctx.data.body = bodyParsed;
      await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askBody", utterance });
      await recordBodyComposition(ctx.data.name, ctx.data.body, res);
      if (ctx.data.pain) await recordPainReport(ctx.data.name, ctx.data.pain, res);
      if (ctx.data.notes) await recordPersonalCondition(ctx.data.name, ctx.data.notes, res);
      sessionContext[kakaoId] = null;
      return res.json(replyText(`${ctx.data.name}님의 모든 정보가 기록되었습니다.`));
    } else {
      return res.json(replyText("체중, 체지방, 근육량을 숫자로 입력해주세요. 예: 체중 70 체지방 20 근육 30"));
    }
  }

  const { intent, handler } = await classifyIntent(utterance, kakaoId);
  console.log("[INTENT] 분류 결과:", intent);

  if (intent === "회원 등록") {
    sessionContext[kakaoId] = {
      intent,
      handler,
      step: "askName",
      data: {},
      timestamp: Date.now()
    };
    return res.json(replyText("회원님의 성함을 알려주세요."));
  }

  if (intent === "전문가 등록") {
    sessionContext[kakaoId] = {
      intent,
      handler,
      step: "askName",
      data: {},
      timestamp: Date.now()
    };
    return res.json(replyText("전문가님의 성함을 알려주세요."));
  }

  if (intent === "자유 입력") {
    const result = await handleFreeInput(utterance);
    if (!result.name) return res.json(replyText("이름을 인식하지 못했어요. 다시 입력해주세요."));
    if (!result.body) {
      sessionContext[kakaoId] = {
        intent,
        handler,
        step: "askBody",
        data: { ...result },
        timestamp: Date.now()
      };
      return res.json(replyText(`${result.name}님의 체중, 체지방, 근육량도 알려주세요.`));
    }
    if (result.body) await recordBodyComposition(result.name, result.body, res);
    if (result.pain) await recordPainReport(result.name, result.pain, res);
    if (result.notes) await recordPersonalCondition(result.name, result.notes, res);
    return res.json(replyText(`${result.name}님의 정보가 기록되었습니다.`));
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

  const fallbackHandler = handlerMap[intent] || fallback;
  return fallbackHandler(kakaoId, utterance, res);
});

export default router;
