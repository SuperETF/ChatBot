// 📁 routes/memberWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import { replyQuickReplies } from "../utils/reply.mjs";
import getTodayAssignment from "../handlers/member/assignment/getTodayAssignment.mjs";
import completeTodayAssignments from "../handlers/member/assignment/completeTodayAssignments.mjs";
import getAssignmentStatus from "../handlers/member/assignment/getAssignmentStatus.mjs";
import startAssignmentSchedule from "../handlers/member/assignment/startAssignmentSchedule.mjs";
import completeAssignmentSchedule from "../handlers/member/assignment/startAssignment.mjs";
import auth from "../handlers/member/auth/index.mjs";
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";
import { cancelContext } from "../handlers/member/booking/showCancelableReservations.mjs";

const router = express.Router();
const normalizeUtterance = (text) => text.replace(/\s+/g, " ").trim();

router.post("/", async (req, res) => {
  const rawUtterance = req.body.userRequest?.utterance || "";
  const utterance = normalizeUtterance(rawUtterance);
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("👤 [MEMBER] 발화:", utterance);

  try {
    // ✅ 멀티턴 흐름 감지: 예약
    if (sessionContext[kakaoId]?.flow === "personal-reservation") {
      return booking(kakaoId, utterance, res, "handleReservationFlow");
    }

    if (sessionContext[kakaoId]?.flow === "cancel") {
      return booking(kakaoId, utterance, res, "handleCancelFlow");
    }

    if (cancelContext[kakaoId]?.flow === "cancel-waiting") {
      return booking(kakaoId, utterance, res, "handleCancelFlow");
    }

    // ✅ 회원 등록
    if (/^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance) ||
        /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (/^회원\s*등록$/.test(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "회원 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 홍길동 01012345678 1234"
              }
            }
          ],
          quickReplies: [{ label: "메인 메뉴", action: "message", messageText: "메인 메뉴" }]
        }
      });
    }

    // ✅ 예약 관련
    if (/^개인\s*운동(\s*예약)?$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startPersonalReservation");
    }

    if (/^예약\s*취소$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startCancelReservation");
    }

    if (/^내\s*(예약|일정|스케줄)$/.test(utterance) || /예약\s*확인/.test(utterance)) {
      return booking(kakaoId, utterance, res, "showMyReservations");
    }

    // ✅ 과제 멀티턴: 개별 시작/완료
    if (/^과제시작_\d+$/.test(utterance)) {
      return startAssignmentSchedule(kakaoId, utterance, res);
    }

    if (/^과제완료_\d+$/.test(utterance)) {
      return completeAssignmentSchedule(kakaoId, utterance, res);
    }

    // ✅ 오늘 과제 확인/완료
    if (/^오늘\s*과제$/.test(utterance)) {
      return getTodayAssignment(kakaoId, utterance, res);
    }

    if (/^오늘\s*과제\s*완료$/.test(utterance)) {
      return completeTodayAssignments(kakaoId, utterance, res);
    }

    // ✅ 과제 현황
    if (/^과제\s*현황$/.test(utterance)) {
      return getAssignmentStatus(kakaoId, utterance, res);
    }

    // ✅ 메인 메뉴
    if (/메인\s*메뉴/i.test(utterance)) {
      delete sessionContext[kakaoId];
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text:
                  "🧭 메인 메뉴입니다.\n- 회원 등록\n- 개인 운동 예약\n- 예약 확인/취소\n- 오늘 과제 확인"
              }
            }
          ],
          quickReplies: [
            { label: "회원 등록", action: "message", messageText: "회원 등록" },
            { label: "개인 운동", action: "message", messageText: "개인 운동" },
            { label: "예약 취소", action: "message", messageText: "예약 취소" },
            { label: "오늘 과제", action: "message", messageText: "오늘 과제" }
          ]
        }
      });
    }

    // ✅ 도움말
    if (/도움말|help/i.test(utterance)) {
      delete sessionContext[kakaoId];
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text:
                  "📖 도움말\n" +
                  "- 회원 등록: '홍길동 01012345678 1234'\n" +
                  "- 예약: '개인 운동'\n" +
                  "- 예약 취소: '예약 취소'\n" +
                  "- 예약 확인: '내 예약'\n" +
                  "- 과제 확인: '오늘 과제'\n\n'메인 메뉴'라고 입력하시면 처음부터 다시 시작할 수 있어요."
              }
            }
          ],
          quickReplies: [
            { label: "메인 메뉴", action: "message", messageText: "메인 메뉴" }
          ]
        }
      });
    }

    // ✅ fallback 처리
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "member-fallback",
      handler: "memberWebhook",
      timestamp: new Date(),
      note: "member fallback"
    });

    return res.json(replyQuickReplies("❓ 이해하지 못했어요. 아래 버튼을 선택해주세요.", [
      "회원 등록",
      "개인 운동 예약",
      "예약 확인",
      "오늘 과제"
    ]));
  } catch (err) {
    console.error("💥 memberWebhook error:", err);

    try {
      await supabase.from("fallback_logs").insert({
        kakao_id: kakaoId,
        utterance,
        intent: "member-catch",
        handler: "memberWebhook",
        error_message: err.message,
        timestamp: new Date(),
        note: "try-catch error"
      });
    } catch (catchInsertErr) {
      console.error("❌ catch fallback_logs insert 실패:", catchInsertErr.message);
    }

    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "⚡ 오류가 발생했어요. 잠시 후 다시 시도해주세요."
            }
          }
        ]
      }
    });
  }
});

export default router;