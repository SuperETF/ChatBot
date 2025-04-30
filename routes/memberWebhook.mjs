import express from "express";
import auth from "../handlers/member/auth/index.mjs";
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";
import assignment from "../handlers/member/assignment/index.mjs";
import { supabase } from "../services/supabase.mjs";
import { cancelContext } from "../handlers/member/booking/showCancelableReservations.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;
  console.log("🟡 발화 입력:", utterance);

  try {
    // ✅ 관리자 전용 발화 차단
    if (/^(내\s*회원|전문가\s*등록|과제\s*생성|과제\s*현황)/.test(utterance)) {
      return res.json(replyQuickReplies(
        "❗ 이 기능은 전문가용 챗봇에서만 사용 가능합니다.\n'메인 메뉴'로 돌아가주세요.",
        [{ label: "메인 메뉴", messageText: "메인 메뉴" }]
      ));
    }

    // ✅ 멀티턴 흐름 처리
    if (sessionContext[kakaoId]?.flow === "personal-reservation") {
      return booking(kakaoId, utterance, res, "handleReservationFlow");
    }

    if (sessionContext[kakaoId]?.flow === "cancel") {
      return booking(kakaoId, utterance, res, "handleCancelFlow");
    }

    // ✅ 회원 등록
    if (
      /^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance) ||
      /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)
    ) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (/^회원\s*등록$/.test(utterance)) {
      return res.json(replyQuickReplies(
        "회원 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 홍길동 01012345678 1234",
        [{ label: "메인 메뉴", messageText: "메인 메뉴" }]
      ));
    }

    // ✅ 예약 흐름
    if (/^개인\s*운동(\s*예약)?$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startPersonalReservation");
    }

    if (/^예약\s*취소$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startCancelReservation");
    }

    if (cancelContext[kakaoId]?.flow === "cancel-waiting") {
      return booking(kakaoId, utterance, res, "handleCancelFlow");
    }

    if (
      /^내\s*(예약|일정|스케줄)$/.test(utterance) ||
      /예약\s*확인/.test(utterance)
    ) {
      return booking(kakaoId, utterance, res, "showMyReservations");
    }

    // ✅ 과제 확인
    if (/^오늘\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }

    if (/^예정된\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }

    // ✅ 메인 메뉴
    if (/메인\s*메뉴/i.test(utterance)) {
      delete sessionContext[kakaoId];
      return res.json(replyQuickReplies("🧭 메인 메뉴입니다:", [
        { label: "회원 등록", messageText: "회원 등록" },
        { label: "개인 운동 예약", messageText: "개인 운동 예약" },
        { label: "예약 확인", messageText: "예약 확인" },
        { label: "오늘 과제", messageText: "오늘 과제" }
      ]));
    }

    // ✅ 도움말
    if (/도움말|help/i.test(utterance)) {
      delete sessionContext[kakaoId];
      return res.json(replyQuickReplies("📖 도움말\n- 회원 등록: '홍길동 01012345678 1234'\n- 예약: '개인 운동'\n- 예약 취소: '예약 취소'\n- 예약 확인: '내 예약'\n- 과제 확인: '오늘 과제'", [
        { label: "메인 메뉴", messageText: "메인 메뉴" }
      ]));
    }

    // ✅ fallback 기록 + 응답
    try {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        utterance,
        intent: "member-fallback",
        handler: "member-router",
        timestamp: new Date(),
        note: "member fallback"
      });
    } catch (insertErr) {
      console.error("❌ fallback_logs insert 실패:", insertErr.message);
    }

    return res.json(replyQuickReplies("❓ 이해하지 못했어요. 아래에서 선택해보세요!", [
      { label: "회원 등록", messageText: "회원 등록" },
      { label: "개인 운동 예약", messageText: "개인 운동 예약" },
      { label: "예약 확인", messageText: "예약 확인" },
      { label: "오늘 과제", messageText: "오늘 과제" }
    ]));

  } catch (err) {
    console.error("💥 webhook error:", err);

    try {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        utterance,
        intent: "member-catch",
        handler: "member-router",
        error_message: err.message,
        timestamp: new Date(),
        note: "try-catch error"
      });
    } catch (catchInsertErr) {
      console.error("❌ catch fallback_logs insert 실패:", catchInsertErr.message);
    }

    return res.json(replyText("⚡ 오류가 발생했어요. 잠시 후 다시 시도해주세요."));
  }
});

export default router;
