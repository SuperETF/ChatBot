import express from "express";
import auth from "../handlers/member/auth/index.mjs"; // ✅ default로 import
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";
import assignment from "../handlers/member/assignment/index.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;
  console.log("🟡 발화 입력:", utterance);

  try {
    // — 멀티턴 예약 세션 체크
    if (sessionContext[kakaoId]?.flow === "personal-reservation") {
      return booking(kakaoId, utterance, res, "handleReservationFlow");
    }

    // — 회원 등록 흐름만
    if (/^회원\s*등록$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    // — 개인 운동 예약 시작
    if (/^개인\s*운동$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startPersonalReservation");
    }

    // — 과제 확인 흐름
    if (/^오늘\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }
    if (/^예정된\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }

    // — fallback
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "❓ 이해하지 못했어요. 다시 시도해주세요." } }]
      }
    });
  } catch (err) {
    console.error("💥 webhook error:", err);
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "⚡ 오류가 발생했어요." } }]
      }
    });
  }
});

export default router;
