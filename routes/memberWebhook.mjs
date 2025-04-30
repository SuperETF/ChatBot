import auth from "../handlers/member/auth/index.mjs";
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";
import assignment from "../handlers/member/assignment/index.mjs";
import { supabase } from "../services/supabase.mjs";
import { cancelContext } from "../handlers/member/booking/showCancelableReservations.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

export default async function memberWebhook(req, res) {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🟡 회원 발화:", utterance);

  try {
    // 관리자 발화 차단
    if (/^(내\s*회원|전문가\s*등록|과제\s*생성|과제\s*현황)/.test(utterance)) {
      return res.json(replyQuickReplies(
        "❗ 이 기능은 전문가용 챗봇에서만 사용 가능합니다.",
        [{ label: "메인 메뉴", messageText: "메인 메뉴" }]
      ));
    }

    // 멀티턴 흐름
    if (sessionContext[kakaoId]?.flow === "personal-reservation") {
      return booking(kakaoId, utterance, res, "handleReservationFlow");
    }

    if (sessionContext[kakaoId]?.flow === "cancel") {
      return booking(kakaoId, utterance, res, "handleCancelFlow");
    }

    // 회원 등록
    if (
      /^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance) ||
      /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)
    ) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (utterance === "회원 등록") {
      return res.json(replyText("회원 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 홍길동 01012345678 1234"));
    }

    // 예약 흐름
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

    // 과제 확인
    if (utterance === "오늘 과제") {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }

    if (utterance === "예정된 과제") {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }

    // 메인 메뉴
    if (/메인\s*메뉴/.test(utterance)) {
      delete sessionContext[kakaoId];
      return res.json(replyQuickReplies("🧭 메인 메뉴입니다:", [
        { label: "회원 등록", messageText: "회원 등록" },
        { label: "개인 운동 예약", messageText: "개인 운동 예약" },
        { label: "예약 확인", messageText: "예약 확인" },
        { label: "오늘 과제", messageText: "오늘 과제" }
      ]));
    }

    // fallback
    return res.json(replyQuickReplies("❓ 이해하지 못했어요. 아래에서 선택해보세요!", [
      { label: "회원 등록", messageText: "회원 등록" },
      { label: "개인 운동 예약", messageText: "개인 운동 예약" },
      { label: "예약 확인", messageText: "예약 확인" },
      { label: "오늘 과제", messageText: "오늘 과제" }
    ]));
  } catch (err) {
    console.error("❌ member webhook error:", err.message);
    return res.json(replyText("⚠️ 회원 챗봇 처리 중 오류가 발생했습니다."));
  }
}
