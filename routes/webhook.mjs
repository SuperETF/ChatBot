// ✅ routes/webhook.mjs
import express from "express";
import { replyText } from "../utils/reply.mjs";
import { parseNaturalDateTime } from "../utils/parseNaturalDateTime.mjs";
import {
  assignmentSession,
  reserveSession,
  cancelSession,
  statusSession
} from "../utils/sessionContext.mjs";

import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";

import * as auth from "../handlers/auth/index.mjs";
import assignment from "../handlers/assignment/index.mjs";
import assignRoutineToMember from "../handlers/assignment/assignRoutineToMember.mjs";

import { reservePersonal } from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus, {
  confirmSlotStatus
} from "../handlers/booking/showSlotStatus.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";

import dayjs from "dayjs";

const router = express.Router();

/**
 * 조금 더 유연해진 정규식 패턴들.
 * 실제 환경에 맞춰 필요시 계속 확장하거나 수정 가능.
 */
const REGEX = {
  // 오전/오후 단일 발화
  AM_OR_PM: /^(오전|오후)$/,

  // 전문가/트레이너 등록 (예: "전문가 홍길동 01012345678 1234")
  REGISTER_TRAINER: /^(전문가|코치|트레이너)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,

  // 회원 등록 (예: "회원 김철수 01012345678 1234" or "김철수 01012345678 1234")
  REGISTER_MEMBER_PREFIX: /^(회원|멤버)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_ONLY: /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,

  // 회원 목록(조회) 관련
  LIST_MEMBERS: /(회원|멤버)(목록|조회|내역|현황)/,

  /**
   * 예약/운동/레슨 인식
   *  - 오늘/내일/모레/이번주/다음주 등 날짜 표현
   *  - 오전/오후
   *  - 시 단위
   */
  RESERVE_INTENT: new RegExp(
    `(` +
      `(운동|레슨|예약|pt|스케줄|스케쥴)` + // 예약을 의미하는 키워드
      `)` +
      `.*(` +
      `(오늘|내일|모레|이번주|다음주)?` + // 날짜 표현 (선택)
      `\\s*(오전|오후)?\\s*\\d{1,2}\\s*시` + // 시간 표현
      `)`,
    "i"
  ),

  // 취소 의도 (예: "10시 취소해줘", "오전 10시 취소")
  CANCEL_INTENT: new RegExp(
    `(취소|캔슬|cancel).*(\\d{1,2}\\s*시)`, 
    "i"
  ),

  // 잔여 현황 확인 (예: "10시 자리 있나요?", "오후 3시 몇 명 가능?")
  STATUS_INTENT: new RegExp(
    `(몇\\s*명|현황|자리\\s*있어|가능|얼마나).*(\\d{1,2}\\s*시)`,
    "i"
  ),

  // 과제 intent
  TODAY_ASSIGNMENT: /(오늘\s*과제|과제\s*있어|오늘\s*숙제)/,
  UPCOMING_ASSIGNMENT: /(예정된\s*(과제|숙제)|앞으로|차후)/,
  START_ASSIGNMENT: /(과제\s*시작|숙제\s*시작|시작하기|개시)/,
  FINISH_ASSIGNMENT: /(과제\s*종료|숙제\s*종료|종료하기|끝|마침)/,

  // 특정 동작(운동명) + 날짜/요일 매칭 (예: "스쿼트 매일", "푸시업 내일부터", "런지 목요일에")
  ASSIGN_WORKOUT: new RegExp(
    `[가-힣]{2,10}.*(스쿼트|런지|플랭크|버피|푸시업|과제|숙제).*(매일|오늘|내일|모레|[0-9]{1,2}일|월|화|수|목|금|토|일)`,
    "i"
  ),

  // 루틴(추천/생성/등록/만들) 의도
  CREATE_ROUTINE: new RegExp(
    `(루틴\\s*(추천|생성|등록|만들))|` +
      `((추천|생성|등록|만들)\\s*루틴)|` +
      `([가-힣]{2,10})?\\s*(상체|하체|유산소|초보자)?\\s*루틴\\s*(추천|생성|등록|만들)?|` +
      `(상체.*(추천|루틴))`,
    "i"
  ),

  // 루틴 배정(사람 이름 + "루틴 배정")
  ASSIGN_ROUTINE: /^[가-힣]{2,10}(?:\s+루틴\s*배정)?$/
};

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance?.split("\n")[0]?.trim();

  console.log("🟡 발화 입력:", utterance);

  try {
    /**
     * (1) 오전/오후 응답 처리 (멀티턴)
     *     - 기존 세션 상태(reserveSession/cancelSession/statusSession)가 대기중인지에 따라
     *       confirmPendingTime, confirmCancelPendingTime, confirmSlotStatus를 수행
     */
    if (REGEX.AM_OR_PM.test(utterance)) {
      const isAm = utterance.includes("오전");
      const isPm = utterance.includes("오후");

      // 예약 세션이 대기 중인 경우
      if (reserveSession[kakaoId]?.type === "pending-am-or-pm") {
        return confirmPendingTime(kakaoId, utterance, res);
      }
      // 취소 세션이 대기 중인 경우
      if (cancelSession[kakaoId]?.type === "pending-cancel-confirmation") {
        return confirmCancelPendingTime(kakaoId, utterance, res);
      }
      // 상태 확인 세션이 대기 중인 경우
      if (statusSession[kakaoId]?.type === "pending-status-confirmation") {
        let time = dayjs(statusSession[kakaoId].base_time);
        if (isPm && time.hour() < 12) time = time.add(12, "hour");
        if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");
        delete statusSession[kakaoId];
        return confirmSlotStatus(kakaoId, time, res);
      }

      return res.json(replyText("확정할 요청이 없습니다. 다시 시도해주세요."));
    }

    /**
     * (2) 등록/로그인 Intent (전문가/회원 구분)
     *     - 첫 줄 기준으로 구분
     */
    if (REGEX.REGISTER_TRAINER.test(firstLine)) {
      console.log("✅ 전문가 등록 인식됨:", firstLine);
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }
    if (REGEX.REGISTER_MEMBER_PREFIX.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }
    if (REGEX.REGISTER_MEMBER_ONLY.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    /**
     * (3) 회원 목록 조회
     */
    const normalized = utterance.replace(/\s+/g, "");
    if (REGEX.LIST_MEMBERS.test(normalized)) {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    /**
     * (4) 예약 관련 Intent
     *     - 정규식 순서가 중요하므로 하단에 유지.
     */
    // 예약
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

    /**
     * (5) 과제/숙제 관련 Intent
     */
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

    /**
     * (6) 특정 운동 + 날짜 패턴 (과제 배정)
     */
    if (REGEX.ASSIGN_WORKOUT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    /**
     * (7) 루틴 생성/추천/등록
     */
    if (REGEX.CREATE_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }
    if (REGEX.ASSIGN_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    // 루틴 날짜 입력(멀티턴)
    if (assignmentSession[kakaoId]?.type === "pending-routine-dates") {
      const { trainerId, memberId, routineList } = assignmentSession[kakaoId];
      delete assignmentSession[kakaoId];

      const dateList = parseNaturalDateTime(utterance);
      if (!dateList || dateList.length === 0) {
        return res.json(
          replyText("❗ 날짜를 이해하지 못했어요. 예: '내일부터 3일간'처럼 입력해주세요.")
        );
      }
      return assignRoutineToMember(trainerId, memberId, routineList, dateList, res);
    }

    /**
     * (8) 모든 조건에 해당하지 않을 경우 fallback
     */
    return fallback(utterance, kakaoId, res, "none", "none");
  } catch (error) {
    console.error("💥 webhook error:", error);

    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: error.message,
      note: "webhook catch"
    });

    return res.json(
      replyText("🚧 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    );
  }
});

export default router;
