// ✅ routes/webhook.mjs

import express from "express";
import dayjs from "dayjs";

// DB 등
import { supabase } from "../services/supabase.mjs";

// 세션
import {
  reserveSession,
  cancelSession,
  assignmentSession,
  statusSession
} from "../utils/sessionContext.mjs";

// fallback
import fallback from "../handlers/system/fallback.mjs";

// 예약
import {
  reservePersonal,
  handleMultiTurnReserve as handleReserveMulti
} from "../handlers/booking/reservePersonal.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";

// 과제
import assignment from "../handlers/assignment/index.mjs";
import assignRoutineToMember from "../handlers/assignment/assignRoutineToMember.mjs";

// 회원 등록
import * as auth from "../handlers/auth/index.mjs";

// 자연어 파서
import { parseNaturalDateTime } from "../utils/parseNaturalDateTime.mjs";

const router = express.Router();

/**
 * (A) 메인 메뉴 / 도움말 처리
 *     - "메인 메뉴"나 "도움말" 발화가 들어오면
 *       모든 세션 초기화 후 안내 메시지를 보냄
 */
function handleMainOrHelp(utterance, kakaoId, res) {
  // 메인 메뉴
  if (/메인\s*메뉴/i.test(utterance)) {
    delete reserveSession[kakaoId];
    delete cancelSession[kakaoId];
    delete assignmentSession[kakaoId];
    delete statusSession[kakaoId];

    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "메인 메뉴입니다.\n원하시는 기능을 선택하세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "회원목록",
            action: "message",
            messageText: "회원목록"
          },
          {
            label: "운동 예약",
            action: "message",
            messageText: "운동 예약"
          },
          {
            label: "오늘 과제",
            action: "message",
            messageText: "오늘 과제"
          }
        ]
      }
    });
  }

  // 도움말
  if (/도움말|help/i.test(utterance)) {
    delete reserveSession[kakaoId];
    delete cancelSession[kakaoId];
    delete assignmentSession[kakaoId];
    delete statusSession[kakaoId];

    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text:
                "📖 도움말\n" +
                "- 회원 등록: '회원 홍길동 01012345678 1234'\n" +
                "- 회원목록: '회원목록' or '멤버조회'\n" +
                "- 예약: '3시 운동 예약', '운동 3시 예약'\n" +
                "- 취소: '3시 취소'\n" +
                "- 과제: '오늘 과제', '과제 시작', '루틴 추천' 등\n" +
                "- 메인 메뉴로 돌아가려면 '메인 메뉴'라고 입력하세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "메인 메뉴",
            action: "message",
            messageText: "메인 메뉴"
          }
        ]
      }
    });
  }

  return null; // 두 발화 아니면 null
}

/**
 * (B) 정규식 확장
 *     - STATUS_INTENT, ASSIGN_WORKOUT, CREATE_ROUTINE 개선
 */
const STATUS_INTENT = new RegExp(
  `((자리|현황|가능).*?(\\d{1,2}\\s*시))|((\\d{1,2}\\s*시).*?(자리|현황|가능))`,
  "i"
);

const ASSIGN_WORKOUT = new RegExp(
  // 이름(선택) + 운동 + 날짜
  `(?:[가-힣]{2,10}\\s+)?` +
    `(스쿼트|런지|푸시업|플랭크|버피|과제|숙제).*?(오늘|내일|모레|[0-9]{1,2}일|월|화|수|목|금|토|일|매일)`,
  "i"
);

const CREATE_ROUTINE = new RegExp(
  // 기존 OR + 중간에 .*? 허용
  `((루틴\\s*(추천|생성|등록|만들))|` +
  `((추천|생성|등록|만들)\\s*루틴)|` +
  `([가-힣]{2,10})?\\s*(상체|하체|유산소|초보자)?\\s*루틴\\s*.*?(추천|생성|등록|만들)?|` +
  `(상체.*?(추천|루틴)))`,
  "i"
);

/**
 * (C) 나머지 정규식
 */
const REGEX = {
  AM_OR_PM: /^(오전|오후)$/i,

  // 전문가/회원 등록
  REGISTER_TRAINER: /^(전문가|코치|트레이너)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_PREFIX: /^(회원|멤버)\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  REGISTER_MEMBER_ONLY: /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/,
  LIST_MEMBERS: /(회원|멤버)\s*(목록|조회|내역|현황)/i,

  // "3시 운동 예약" or "운동 3시 예약"
  RESERVE_INTENT: new RegExp(
    `((\\d{1,2}\\s*시).*?(운동|레슨|예약))|((운동|레슨|예약).*?(\\d{1,2}\\s*시))`,
    "i"
  ),

  // 취소
  CANCEL_INTENT: new RegExp(`(취소|캔슬|cancel).*?(\\d{1,2}\\s*시)`, "i"),

  // 잔여 현황(개선)
  STATUS_INTENT,
  
  // 과제
  TODAY_ASSIGNMENT: /(오늘\s*과제|과제\s*있어|오늘\s*숙제)/i,
  UPCOMING_ASSIGNMENT: /(예정된\s*(과제|숙제)|앞으로|차후)/i,
  START_ASSIGNMENT: /(과제\s*시작|숙제\s*시작|시작하기|개시)/i,
  FINISH_ASSIGNMENT: /(과제\s*종료|숙제\s*종료|종료하기|끝|마침)/i,

  // 운동 + 날짜
  ASSIGN_WORKOUT,

  // 루틴
  CREATE_ROUTINE,
  ASSIGN_ROUTINE: /^[가-힣]{2,10}(?:\s+루틴\s*배정)?$/i
};

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance.split("\n")[0]?.trim() || "";

  console.log("🟡 발화 입력:", utterance);

  try {
    // (1) "메인 메뉴" / "도움말" 처리
    const mainHelpResp = handleMainOrHelp(utterance, kakaoId, res);
    if (mainHelpResp) {
      return mainHelpResp; // 세션 초기화 + 안내
    }

    // (2) 예약 세션 멀티턴
    if (reserveSession[kakaoId]?.type) {
      return handleReserveMulti(kakaoId, utterance, res);
    }

    // (3) 오전/오후
    if (REGEX.AM_OR_PM.test(utterance)) {
      // 예약
      if (reserveSession[kakaoId]?.type === "pending-am-or-pm") {
        return confirmPendingTime(kakaoId, utterance, res);
      }
      // 취소
      if (cancelSession[kakaoId]?.type === "pending-cancel-confirmation") {
        return confirmCancelPendingTime(kakaoId, utterance, res);
      }
      // 현황
      if (statusSession[kakaoId]?.type === "pending-status-confirmation") {
        let time = dayjs(statusSession[kakaoId].base_time);
        if (utterance.includes("오후") && time.hour() < 12) {
          time = time.add(12, "hour");
        } else if (utterance.includes("오전") && time.hour() >= 12) {
          time = time.subtract(12, "hour");
        }
        delete statusSession[kakaoId];
        return confirmSlotStatus(kakaoId, time, res);
      }
      // fallback
      return fallback(utterance, kakaoId, res, "am-or-pm", null);
    }

    // (4) 전문가/회원 등록
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

    // (5) 예약
    if (REGEX.RESERVE_INTENT.test(utterance)) {
      console.log("✅ 예약 intent 매칭됨:", utterance);
      return reservePersonal(kakaoId, utterance, res);
    }
    if (REGEX.CANCEL_INTENT.test(utterance)) {
      return cancelPersonal(kakaoId, utterance, res);
    }
    if (REGEX.STATUS_INTENT.test(utterance)) {
      return showSlotStatus(kakaoId, utterance, res);
    }

    // (6) 과제
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
    if (REGEX.ASSIGN_WORKOUT.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    // 루틴 생성/추천
    if (REGEX.CREATE_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }
    if (REGEX.ASSIGN_ROUTINE.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    // (7) 루틴 날짜 멀티턴
    if (assignmentSession[kakaoId]?.type === "pending-routine-dates") {
      const { trainerId, memberId, routineList } = assignmentSession[kakaoId];
      delete assignmentSession[kakaoId];

      const dateList = parseNaturalDateTime(utterance);
      if (!dateList || dateList.length === 0) {
        return fallback(utterance, kakaoId, res, "assignment", "pending-routine-dates");
      }
      return assignRoutineToMember(trainerId, memberId, routineList, dateList, res);
    }

    // (8) fallback
    return fallback(utterance, kakaoId, res, "none", null);

  } catch (err) {
    console.error("💥 webhook error:", err);
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: err.message,
      note: "webhook catch"
    });
    return fallback(utterance, kakaoId, res, "error-catch", null);
  }
});

export default router;
