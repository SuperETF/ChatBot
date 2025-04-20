// ✅ src/routes/webhook.mjs

import express from "express";
import dayjs from "dayjs";
import { supabase } from "../services/supabase.mjs";

// 세션
import {
  reserveSession,
  cancelSession,
  assignmentSession,
  statusSession
} from "../../utils/sessionContext.mjs";

// fallback
import fallback from "../../handlers/system/fallback.mjs";

// 예약(booking) 관련
import {
  reservePersonal,
  handleMultiTurnReserve as handleReserveMulti
} from "../../handlers/booking/reservePersonal.mjs";

import confirmPendingTime from "../../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../../handlers/booking/confirmCancelPendingTime.mjs";
import cancelPersonal from "../../handlers/booking/cancelPersonal.mjs";

// 잔여 현황
import showSlotStatus, {
  confirmSlotStatus
} from "../../handlers/booking/showSlotStatus.mjs";

// 과제(assignment) 관련
import assignment from "../../handlers/assignment/index.mjs";
import assignRoutineToMember from "../../handlers/assignment/assignRoutineToMember.mjs";

// 회원 등록(auth) 관련
import * as auth from "../../handlers/auth/index.mjs";

// utils
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";


const router = express.Router();

/**
 * 예시 정규식 모음
 */
const REGEX = {
  AM_OR_PM: /^(오전|오후)$/,
  REGISTER_TRAINER: /^(전문가|코치|트레이너)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_PREFIX: /^(회원|멤버)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_ONLY: /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  LIST_MEMBERS: /(회원|멤버)(목록|조회|내역|현황)/,

  // 예약 키워드 예: "3시 운동 예약" 등
  RESERVE_INTENT: new RegExp(`(운동|예약|레슨).*?(\\d{1,2}\\s*시)`, "i"),

  // 취소 의도
  CANCEL_INTENT: new RegExp(`(취소|캔슬|cancel).*(\\d{1,2}\\s*시)`, "i"),

  // 잔여 현황
  STATUS_INTENT: new RegExp(`(자리|현황|가능).*(\\d{1,2}\\s*시)`, "i"),

  // 과제 intent
  TODAY_ASSIGNMENT: /(오늘\s*과제|과제\s*있어|오늘\s*숙제)/,
  UPCOMING_ASSIGNMENT: /(예정된\s*(과제|숙제)|앞으로|차후)/,
  START_ASSIGNMENT: /(과제\s*시작|숙제\s*시작|시작하기|개시)/,
  FINISH_ASSIGNMENT: /(과제\s*종료|숙제\s*종료|종료하기|끝|마침)/,

  // 운동명 + 날짜
  ASSIGN_WORKOUT: new RegExp(
    `[가-힣]{2,10}.*(스쿼트|런지|플랭크|버피|푸시업|과제|숙제).*(매일|오늘|내일|모레|[0-9]{1,2}일|월|화|수|목|금|토|일)`,
    "i"
  ),

  // 루틴 생성/추천
  CREATE_ROUTINE: new RegExp(
    `(루틴\\s*(추천|생성|등록|만들))|` +
      `((추천|생성|등록|만들)\\s*루틴)|` +
      `([가-힣]{2,10})?\\s*(상체|하체|유산소|초보자)?\\s*루틴\\s*(추천|생성|등록|만들)?|` +
      `(상체.*(추천|루틴))`,
    "i"
  ),
  // 루틴 배정
  ASSIGN_ROUTINE: /^[가-힣]{2,10}(?:\s+루틴\s*배정)?$/
};

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance?.split("\n")[0]?.trim();

  console.log("🟡 발화 입력:", utterance);

  try {
    // 1) 예약 멀티턴 세션
    if (reserveSession[kakaoId]?.type) {
      return handleReserveMulti(kakaoId, utterance, res);
    }

    // 2) 오전/오후 단일 발화
    if (REGEX.AM_OR_PM.test(utterance)) {
      const isAm = utterance.includes("오전");
      const isPm = utterance.includes("오후");

      // 예약 세션
      if (reserveSession[kakaoId]?.type === "pending-am-or-pm") {
        return confirmPendingTime(kakaoId, utterance, res);
      }
      // 취소 세션
      if (cancelSession[kakaoId]?.type === "pending-cancel-confirmation") {
        return confirmCancelPendingTime(kakaoId, utterance, res);
      }
      // 잔여 현황 세션
      if (statusSession[kakaoId]?.type === "pending-status-confirmation") {
        let time = dayjs(statusSession[kakaoId].base_time);
        if (isPm && time.hour() < 12) time = time.add(12, "hour");
        if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");
        delete statusSession[kakaoId];
        return confirmSlotStatus(kakaoId, time, res);
      }

      // 세션이 없다면 fallback
      return fallback(utterance, kakaoId, res, "am-or-pm", null);
    }

    // 3) 전문가/회원 등록
    if (REGEX.REGISTER_TRAINER.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }
    if (REGEX.REGISTER_MEMBER_PREFIX.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }
    if (REGEX.REGISTER_MEMBER_ONLY.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    // 회원 목록
    const normalized = utterance.replace(/\s+/g, "");
    if (REGEX.LIST_MEMBERS.test(normalized)) {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    // 4) 예약 Intent
    if (REGEX.RESERVE_INTENT.test(utterance)) {
      console.log("✅ 예약 intent 매칭됨:", utterance);
      return reservePersonal(kakaoId, utterance, res);
    }

    // 취소
    if (REGEX.CANCEL_INTENT.test(utterance)) {
      return cancelPersonal(kakaoId, utterance, res);
    }

    // 잔여 현황
    if (REGEX.STATUS_INTENT.test(utterance)) {
      return showSlotStatus(kakaoId, utterance, res);
    }

    // 5) 과제/숙제
    if (REGEX.TODAY_ASSIGNMENT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }
    if (REGEX.UPCOMING_ASSIGNMENT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }
    if (REGEX.START_ASSIGNMENT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "startAssignment");
    }
    if (REGEX.FINISH_ASSIGNMENT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "finishAssignment");
    }

    // 특정 운동 + 날짜 => 과제 배정
    if (REGEX.ASSIGN_WORKOUT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    // 루틴 생성/추천
    if (REGEX.CREATE_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }
    // 루틴 배정
    if (REGEX.ASSIGN_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    // 루틴 날짜 입력(멀티턴)
    if (assignmentSession[kakaoId]?.type === "pending-routine-dates") {
      const { trainerId, memberId, routineList } = assignmentSession[kakaoId];
      delete assignmentSession[kakaoId];

      const dateList = parseNaturalDateTime(utterance);
      if (!dateList || dateList.length === 0) {
        return fallback(utterance, kakaoId, res, "assignment", "pending-routine-dates");
      }
      return assignRoutineToMember(trainerId, memberId, routineList, dateList, res);
    }

    // 6) 모두 아니면 fallback
    return fallback(utterance, kakaoId, res, "none", null);

  } catch (error) {
    console.error("💥 webhook error:", error);

    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: error.message,
      note: "webhook catch"
    });

    return fallback(utterance, kakaoId, res, "catch-error", null);
  }
});

export default router;
