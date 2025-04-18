import express from "express";
import { replyText } from "../utils/reply.mjs";
import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";
import * as auth from "../handlers/auth/index.mjs";

// 예약 관련 핸들러
import reservePersonal, { sessionContext as reserveSession } from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal, { sessionContext as cancelSession } from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus, { sessionContext as statusSession, confirmSlotStatus } from "../handlers/booking/showSlotStatus.mjs";
import showMyReservations from "../handlers/booking/showMyReservations.mjs";
import confirmPendingTime from "../handlers/booking/confirmPendingTime.mjs";
import confirmCancelPendingTime from "../handlers/booking/confirmCancelPendingTime.mjs";
import generateRoutine from "../handlers/assignment/generateRoutinePreview.mjs";


// 과제 관련 핸들러
import assignment from "../handlers/assignment/index.mjs";

import dayjs from "dayjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const firstLine = utterance?.split("\n")[0]?.trim();

  try {
    // ✅ 오전/오후 응답 처리
    if (/^오전$|^오후$/.test(utterance.trim())) {
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

    // ✅ 트레이너 등록
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }

    // ✅ 회원 등록 (트레이너)
    if (/^회원\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 본인 회원 등록
    if (/^[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 회원 목록 (트레이너)
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

      // ✅ 오늘 과제 (회원)
if (/오늘\s*과제|과제\s*있어/.test(utterance)) {
  return assignment(kakaoId, utterance, res, "getTodayAssignment");
}

// ✅ 예정된 과제 (회원)
if (/예정된\s*과제|예정된\s*숙제|앞으로/.test(utterance)) {
  return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
}

// ✅ 과제 시작
if (/과제\s*시작|시작하기/.test(utterance)) {
  return assignment(kakaoId, utterance, res, "startAssignment");
}

// ✅ 과제 종료
if (/과제\s*종료|종료하기/.test(utterance)) {
  return assignment(kakaoId, utterance, res, "finishAssignment");
}

// ✅ 과제 부여 (트레이너 전용, 이름 + 과제 포함 시)
if (/^[가-힣]{2,10}(님|씨)?\s+(런지|스쿼트|플랭크|버피|과제|숙제)/.test(utterance)) {
  return assignment(kakaoId, utterance, res, "assignWorkout");
}
// ✅ 루틴 생성 → 트레이너가 확인 후 회원에게 과제로 등록
if (/루틴.*(만들|추천|생성|등록)/.test(utterance) || /운동 루틴/.test(utterance)) {
  // 루틴은 즉시 등록하는 게 아니라 "미리보기" 출력만 한다면
  const routine = generateRoutine(utterance); // ["푸시업 20개", ...]
  return res.json({
    text: `🤖 AI 루틴 추천:\n- ${routine.join("\n- ")}`,
    quickReplies: [
      { label: "홍길동에게 배정", action: "message", messageText: "홍길동 루틴 배정" }
    ]
  });
}

// ✅ 트레이너가 회원에게 배정 명령 시
if (/([가-힣]{2,10})\s+루틴\s+배정/.test(utterance)) {
  const name = utterance.match(/([가-힣]{2,10})/)[1];
  const routine = generateRoutine("상체"); // 또는 최근 생성된 goal 활용

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  const today = new Date();
  const dates = Array.from({ length: 3 }, (_, i) =>
    new Date(today.setDate(today.getDate() + i + 1)).toISOString().slice(0, 10)
  );

  return assignRoutineToMember(trainer.id, member.id, routine, dates, res);
}
    // ❌ fallback
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
