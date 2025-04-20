// ✅ routes/webhook.mjs
import express from "express";
import { replyText } from "../utils/reply.mjs";
import { parseNaturalDateTime } from "../utils/parseNaturalDateTime.mjs";

// 세션들
import {
  assignmentSession,
  reserveSession,
  cancelSession,
  statusSession
} from "../utils/sessionContext.mjs";

import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";

// 회원·전문가 등록 등
import * as auth from "../handlers/auth/index.mjs";
import assignment from "../handlers/assignment/index.mjs";
import assignRoutineToMember from "../handlers/assignment/assignRoutineToMember.mjs";

// 예약 관련
import {
  reservePersonal,
  handleMultiTurnReserve as handleReserveMulti
} from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus, {
  confirmSlotStatus
} from "../handlers/booking/showSlotStatus.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";

import dayjs from "dayjs";

const router = express.Router();

/**
 * 조금 더 유연해진 정규식 패턴.
 * "예약해줘", "운동해줄래", "스케줄 가능해?" 등 파생 표현과
 * 시간(오후 3시, 3시 30분) 순서를 무시하고 모두 매칭하기 위해 OR(|)로 구성.
 */
const RESERVE_KEYWORDS = `(?:
  예약(?:해|해줘|좀|해주세요|해줄래)? |
  운동(?:해|좀| 할래| 가능해| 해줄래| 잡아줘)? |
  레슨 |
  pt |
  스케줄 |
  스케쥴
)`;

const TIME_PATTERN = `(?:
  (오늘|내일|모레|이번주|다음주)?\\s*
  (오전|오후)?\\s*
  (?:
    \\d{1,2}시\\s*(\\d{1,2})?\\s*분? |
    \\d{1,2}:\\d{1,2} |
    \\d{1,2}시
  )
  (\\s*쯤)?
)`;

// 예약 의도 정규식: 시간→키워드 | 키워드→시간
const RESERVE_INTENT = new RegExp(
  [
    // 1) 시간 먼저, 뒤에 예약 키워드
    `(${TIME_PATTERN}).*(${RESERVE_KEYWORDS})`,
    // 2) 예약 키워드 먼저, 뒤에 시간
    `(${RESERVE_KEYWORDS}).*(${TIME_PATTERN})`
  ].join("|"),
  "i"
);

const REGEX = {
  // 오전/오후 단일 발화
  AM_OR_PM: /^(오전|오후)$/,

  // 전문가/트레이너 등록
  REGISTER_TRAINER: /^(전문가|코치|트레이너)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,

  // 회원 등록
  REGISTER_MEMBER_PREFIX: /^(회원|멤버)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_ONLY: /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,

  // 회원 목록
  LIST_MEMBERS: /(회원|멤버)(목록|조회|내역|현황)/,

  // 예약 Intent (확장판)
  RESERVE_INTENT,

  // 취소 Intent
  CANCEL_INTENT: new RegExp(`(취소|캔슬|cancel).*(\\d{1,2}\\s*시)`, "i"),

  // 잔여 현황 확인
  STATUS_INTENT: new RegExp(`(몇\\s*명|현황|자리\\s*있어|가능|얼마나).*(\\d{1,2}\\s*시)`, "i"),

  // 과제 intent
  TODAY_ASSIGNMENT: /(오늘\s*과제|과제\s*있어|오늘\s*숙제)/,
  UPCOMING_ASSIGNMENT: /(예정된\s*(과제|숙제)|앞으로|차후)/,
  START_ASSIGNMENT: /(과제\s*시작|숙제\s*시작|시작하기|개시)/,
  FINISH_ASSIGNMENT: /(과제\s*종료|숙제\s*종료|종료하기|끝|마침)/,

  // 특정 운동 + 날짜/요일
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
    /**
     * STEP A) 먼저 "예약 멀티턴" 상태인지 확인
     *         - 예약 흐름(pending-date / pending-confirm 등) 중이면
     *           handleReserveMulti()가 우선 처리
     */
    if (reserveSession[kakaoId]?.type) {
      return handleReserveMulti(kakaoId, utterance, res);
    }

    /**
     * STEP B) 오전/오후 단일 발화 처리
     */
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
      // 상태 확인 세션
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
     * (1) 등록/로그인 Intent
     */
    if (REGEX.REGISTER_TRAINER.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }
    if (REGEX.REGISTER_MEMBER_PREFIX.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }
    if (REGEX.REGISTER_MEMBER_ONLY.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    /**
     * (2) 회원 목록 조회
     */
    const normalized = utterance.replace(/\s+/g, "");
    if (REGEX.LIST_MEMBERS.test(normalized)) {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    /**
     * (3) 예약 Intent
     */
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
     * (4) 과제/숙제 관련
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
     * (5) 특정 운동 + 날짜/요일
     */
    if (REGEX.ASSIGN_WORKOUT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    /**
     * (6) 루틴 생성/추천/등록/배정
     */
    if (REGEX.CREATE_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }
    if (REGEX.ASSIGN_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    // 멀티턴: 루틴 날짜 입력
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
     * (7) 매칭 안 될 경우 fallback
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
