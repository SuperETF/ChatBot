// ✅ routes/webhook.mjs
import express from "express";
import { replyText } from "../utils/reply.mjs";
import { parseNaturalDateTime } from "../utils/parseNaturalDateTime.mjs";
import { assignmentSession, reserveSession, cancelSession, statusSession } from "../utils/sessionContext.mjs";

import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";

import * as auth from "../handlers/auth/index.mjs";
import assignment from "../handlers/assignment/index.mjs";
import assignRoutineToMember from "../handlers/assignment/assignRoutineToMember.mjs";

import reservePersonal from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus, { confirmSlotStatus } from "../handlers/booking/showSlotStatus.mjs";
import showMyReservations from "../handlers/booking/showMyReservations.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";

import dayjs from "dayjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance?.split("\n")[0]?.trim();

  console.log("🟡 발화 입력:", utterance);

  try {
    // ✅ 오전/오후 응답 처리 (멀티턴)
    if (/^오전$|^오후$/.test(utterance)) {
      const isAm = utterance.includes("오전");
      const isPm = utterance.includes("오후");

      if (reserveSession[kakaoId]?.type === "pending-am-or-pm") {
        return confirmPendingTime(kakaoId, utterance, res);
      }
      if (cancelSession[kakaoId]?.type === "pending-cancel-confirmation") {
        return confirmCancelPendingTime(kakaoId, utterance, res);
      }
      if (statusSession[kakaoId]?.type === "pending-status-confirmation") {
        let time = dayjs(statusSession[kakaoId].base_time);
        if (isPm && time.hour() < 12) time = time.add(12, "hour");
        if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");
        delete statusSession[kakaoId];
        return confirmSlotStatus(kakaoId, time, res);
      }
      return res.json(replyText("확정할 요청이 없습니다. 다시 시도해주세요."));
    }

    // ✅ 등록 intent
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }
    if (/^회원\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }
    if (/^[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 회원 목록
    const normalized = utterance.replace(/\s+/g, "");
    if (/회원(목록|조회|내역|현황)/.test(normalized)) {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 예약 intent
    if (
      /(운동|레슨|예약|PT|신청|가능)/.test(utterance) &&
      /(오늘|내일|이번주)?\s*(오전|오후)?\s*\d{1,2}\s*시/.test(utterance)
    ) {
      console.log("✅ 예약 intent 매칭됨:", utterance);
      return reservePersonal(kakaoId, utterance, res);
    }

    if (/취소/.test(utterance) && /\d{1,2}\s*시/.test(utterance)) {
      return cancelPersonal(kakaoId, utterance, res);
    }

    if (/몇\s*명|현황|자리\s*있어/.test(utterance) && /\d{1,2}\s*시/.test(utterance)) {
      return showSlotStatus(kakaoId, utterance, res);
    }

    // ✅ 과제 intent
    if (/오늘\s*과제|과제\s*있어/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }
    if (/예정된\s*과제|예정된\s*숙제|앞으로/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }
    if (/과제\s*시작|시작하기/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "startAssignment");
    }
    if (/과제\s*종료|종료하기/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "finishAssignment");
    }

    if (
      /[가-힣]{2,10}/.test(utterance) &&
      /(런지|스쿼트|플랭크|버피|푸시업|과제|숙제)/.test(utterance) &&
      /(매일|오늘|내일|[0-9]{1,2}일|월|화|수|목|금|토|일)/.test(utterance)
    ) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    // ✅ 루틴 생성 + 멀티턴 배정 흐름
    if (
      /(루틴\s*(추천|생성|등록|만들))|((추천|생성|등록|만들)\s*루틴)|([가-힣]{2,10})?\s*(상체|하체|유산소|초보자)?\s*루틴\s*(추천|생성|등록|만들)?|상체.*(추천|루틴)/.test(utterance)
    ) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    if (/^[가-힣]{2,10}(?:\s+루틴\s*배정)?$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    if (assignmentSession[kakaoId]?.type === "pending-routine-dates") {
      const { trainerId, memberId, routineList } = assignmentSession[kakaoId];
      delete assignmentSession[kakaoId];

      const dateList = parseNaturalDateTime(utterance);
      if (!dateList || dateList.length === 0) {
        return res.json(replyText("❗ 날짜를 이해하지 못했어요. 예: '내일부터 3일간'처럼 입력해주세요."));
      }
      return assignRoutineToMember(trainerId, memberId, routineList, dateList, res);
    }

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
    return res.json(replyText("🚧 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
  }
});

export default router;