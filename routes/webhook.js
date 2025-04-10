// ✅ webhook.js – 트레이너 등록 예외 처리 포함 최종 리팩토링

import express from "express";
import { supabase } from "../services/supabase.js";
import classifyIntent from "../handlers/classifyIntent.js";

import reserveWorkout from "../handlers/reserveWorkout.js";
import recommendRoutine from "../handlers/recommendRoutine.js";
import showUserInfo from "../handlers/showUserInfo.js";
import inputHeartRate from "../handlers/inputHeartRate.js";
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

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 사용자 발화:", utterance);
  console.log("🧑‍💼 사용자 ID:", kakaoId);

  const intent = await classifyIntent(utterance);
  console.log("🧠 GPT 분류 결과:", intent);

  // 트레이너 등록 intent는 무조건 실행 (kakao_id 없으므로)
  if (intent === "트레이너 등록") {
    return registerTrainer(kakaoId, utterance, res);
  }

  // 트레이너 여부 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  const isTrainer = !!trainer;

  // 트레이너 전용 intent 처리
  if (isTrainer) {
    if (intent === "회원 목록 조회") return listMembers(kakaoId, utterance, res);
    if (intent === "체성분 입력") return recordBodyComposition(kakaoId, utterance, res);
    if (intent === "통증 입력") return recordPainReport(kakaoId, utterance, res);
    if (intent === "가용 시간 등록") return registerAvailability(kakaoId, utterance, res);
    if (intent === "트레이너 회원 등록") return trainerRegisterMember(kakaoId, utterance, res);
  }

  // 공통 intent 처리
  const handlerMap = {
    "운동 예약": reserveWorkout,
    "루틴 추천": recommendRoutine,
    "식단 추천": recommendMeal,
    "심박수 입력": inputHeartRate,
    "내 정보 조회": showUserInfo,
    "회원 등록": registerMember,
    "개인 운동 시간 조회": showPersonalWorkoutSlots,
    "개인 운동 예약": reservePersonalWorkout,
    "개인 운동 예약 취소": cancelPersonalWorkout
  };

  const handler = handlerMap[intent] || fallback;
  return handler(kakaoId, utterance, res);
});

export default router;