import express from "express";
import classifyIntent from "../handlers/classifyIntent.js";

import reserveWorkout from "../handlers/reserveWorkout.js";
import recommendRoutine from "../handlers/recommendRoutine.js";
import showUserInfo from "../handlers/showUserInfo.js";
import inputHeartRate from "../handlers/inputHeartRate.js";
import recommendMeal from "../handlers/recommendMeal.js";
import fallback from "../handlers/fallback.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.user?.id;

  console.log("📩 사용자 발화:", utterance);

  const intent = await classifyIntent(utterance);
  console.log("🧠 GPT 분류 결과:", intent);

  const handlerMap = {
    "운동 예약": reserveWorkout,
    "루틴 추천": recommendRoutine,
    "식단 추천": recommendMeal,
    "심박수 입력": inputHeartRate,
    "내 정보 조회": showUserInfo
  };

  const handler = handlerMap[intent] || fallback;
  return handler(kakaoId, utterance, res);
});

export default router;
