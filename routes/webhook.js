// ✅ webhook.js – 전문가 회원 등록 포함 + 디버깅 로그 + 확장 가능

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

const router = express.Router();

const handlerMap = {
  "운동 예약": reserveWorkout,
  "루틴 추천": recommendRoutine,
  "식단 추천": recommendMeal,
  "내 정보 조회": showUserInfo,
  "회원": registerMember,
  "개인 운동 시간 조회": showPersonalWorkoutSlots,
  "개인 운동 예약": reservePersonalWorkout,
  "개인 운동 예약 취소": cancelPersonalWorkout,
  "전문가 등록": registerTrainer,
  "회원 등록": trainerRegisterMember,
  "체성분 입력": recordBodyComposition,
  "심박수 입력": recordHeartRate,
  "통증 입력": recordPainReport,
  "근력 기록 입력": recordStrengthRecord,
  "특이사항 입력": recordPersonalCondition,
};

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 사용자 발화:", utterance);
  console.log("🧑‍💼 사용자 ID:", kakaoId);

  const intent = await classifyIntent(utterance);
  console.log("[INTENT] 분류 결과:", intent);

  if (intent === "전문가 등록") {
    console.log("✅ 전문가 등록 intent 처리 진입");
    return registerTrainer(kakaoId, utterance, res);
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
    if (result.body) await recordBodyComposition(result.name, result.body);
if (result.pain) await recordPain(result.name, result.pain);
if (result.notes) await recordSpecialNote(result.name, result.notes);

  }

  const handler = handlerMap[intent] || fallback;
  return handler(kakaoId, utterance, res);
});

export default router;

