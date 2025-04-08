import express from "express";
import classifyIntent from "../handlers/classifyIntent.js";

import reserveWorkout from "../handlers/reserveWorkout.js";
import recommendRoutine from "../handlers/recommendRoutine.js";
import showUserInfo from "../handlers/showUserInfo.js";
import inputHeartRate from "../handlers/inputHeartRate.js";
import fallback from "../handlers/fallback.js";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("📩 카카오 Webhook 요청 수신됨");

  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.user?.id;

  if (!utterance || !kakaoId) {
    return fallback(res, "요청 정보가 부족해요.");
  }

  const intent = await classifyIntent(utterance);

  const handlerMap = {
    "운동 예약": reserveWorkout,
    "루틴 추천": recommendRoutine,
    "심박수 입력": inputHeartRate,
    "내 정보 조회": showUserInfo
  };

  const handler = handlerMap[intent] || fallback;
  return handler(kakaoId, utterance, res);
});

export default router;
