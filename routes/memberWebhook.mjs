import express from "express";
import auth from "../handlers/member/auth/index.mjs";
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";
import assignment from "../handlers/member/assignment/index.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;
  console.log("🟡 발화 입력:", utterance);

  try {
    // ✅ 예약 멀티턴 흐름
    if (sessionContext[kakaoId]?.flow === "personal-reservation") {
      return booking(kakaoId, utterance, res, "handleReservationFlow");
    }

    // ✅ 회원 등록 입력 포맷: [이름] [전화번호] [비밀번호] or "회원 조만갑 ..."
    if (
      /^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance) ||
      /^[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)
    ) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 회원 등록 안내 (유도 버튼)
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
          ]
        }
      });
    }

    // ✅ 개인 운동 예약 시작
    if (/^개인\s*운동$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "startPersonalReservation");
    }

    // ✅ 과제 확인 흐름
    if (/^오늘\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getTodayAssignment");
    }
    if (/^예정된\s*과제$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getUpcomingAssignments");
    }

    // ✅ fallback
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "❓ 이해하지 못했어요. 다시 시도해주세요."
            }
          }
        ]
      }
    });
  } catch (err) {
    console.error("💥 webhook error:", err);
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "⚡ 오류가 발생했어요. 잠시 후 다시 시도해주세요." } }
        ]
      }
    });
  }
});

export default router;
