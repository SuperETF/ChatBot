import express from "express";
import { supabase } from "../services/supabase.js";
import classifyIntent from "../handlers/system/classifyIntent.js";

// 📂 핸들러 그룹
import booking from "../handlers/booking.js";
import auth from "../handlers/auth.js";
import assignment from "../handlers/assignment.js";
import { startWorkout } from "../handlers/startWorkout.js";
import { completeWorkout } from "../handlers/completeWorkout.js";
import { reportWorkoutCondition } from "../handlers/reportWorkoutCondition.js";
import { getTodayAssignment } from "../handlers/getTodayAssignment.js";

// 📂 유틸
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
      return auth(kakaoId, `회원 등록 ${ctx.data.name} ${ctx.data.phone}`, res, "registerTrainerMember");
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
  const { intent, handler, action } = await classifyIntent(utterance, kakaoId);
  console.log("[INTENT] 분류 결과:", intent);

  // ✅ handler 기반 분기
  if (handler === "auth") return auth(kakaoId, utterance, res, action);
  if (handler === "booking") return booking(kakaoId, utterance, res, action);
  if (handler === "assignment") return assignment(kakaoId, utterance, res, action);
  if (handler === "startWorkout") return startWorkout(kakaoId, res);
  if (handler === "completeWorkout") return completeWorkout(kakaoId, res);
  if (handler === "reportWorkoutCondition") return reportWorkoutCondition(kakaoId, utterance, res);
  if (handler === "getTodayAssignment") return getTodayAssignment(kakaoId, res);

  return fallback(utterance, kakaoId, res);
});

export default router;