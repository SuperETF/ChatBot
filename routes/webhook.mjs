import express from "express";
import { replyText } from "../utils/reply.mjs";
import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";
import * as auth from "../handlers/auth/index.mjs";

import reservePersonal from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus from "../handlers/booking/showSlotStatus.mjs";
import showMyReservations from "../handlers/booking/showMyReservations.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";
import confirmSlotStatusPending from "../handlers/booking/confirmSlotStatus.mjs";

import { sessionContext as reserveSession } from "../handlers/booking/reservePersonal.mjs";
import { sessionContext as cancelSession } from "../handlers/booking/cancelPersonal.mjs";
import { sessionContext as statusSession } from "../handlers/booking/showSlotStatus.mjs";

import assignment from "../handlers/assignment/index.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance?.split("\n")[0]?.trim();

  try {
    // ✅ 오전/오후 응답 처리
    if (/^오전$|^오후$/.test(utterance.trim())) {
      const r = reserveSession[kakaoId];
      const c = cancelSession[kakaoId];
      const s = statusSession[kakaoId];

      if (r?.type === "pending-am-or-pm") return confirmPendingTime(kakaoId, utterance, res);
      if (c?.type === "pending-cancel-confirmation") return confirmCancelPendingTime(kakaoId, utterance, res);
      if (s?.type === "pending-status-confirmation") return confirmSlotStatusPending(kakaoId, utterance, res);

      return res.json(replyText("확정할 요청이 없습니다. 다시 시도해주세요."));
    }

    // ✅ 트레이너 등록
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }

    // ✅ 트레이너가 회원 등록
    if (/^회원\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 회원 본인 등록
    if (/^[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 회원 목록
    if (firstLine === "회원 목록") {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 내 예약 내역
    if (/예약\s*내역|내\s*예약|운동\s*몇\s*시|레슨\s*몇\s*시/.test(utterance)) {
      return showMyReservations(kakaoId, utterance, res);
    }

    // ✅ 예약 취소
    if (/취소/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return cancelPersonal(kakaoId, utterance, res);
    }

    // ✅ 예약 현황
    if (/몇\s*명|현황|자리\s*있어/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return showSlotStatus(kakaoId, utterance, res);
    }

    // ✅ 운동 예약
    if (/운동|예약/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return reservePersonal(kakaoId, utterance, res);
    }

    // ✅ 과제 부여
    if (/과제|런지|스쿼트|플랭크|버피|운동/.test(utterance) && /[가-힣]{2,10}/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignWorkout");
    }

    // ✅ 오늘 과제
    if (/오늘\s*과제|과제\s*있어/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }

    // ✅ 예정 과제
    if (/예정된\s*과제|앞으로/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }

    // ✅ 과제 시작/종료
    if (/과제\s*시작/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "startAssignment");
    }

    if (/과제\s*종료/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "finishAssignment");
    }

    // ❌ fallback 처리
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
