// routes/webhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import assignment from "../handlers/member/assignment/index.mjs";
import * as auth from "../handlers/member/auth/index.mjs";
import booking, { sessionContext } from "../handlers/member/booking/index.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🟡 발화 입력:", utterance);

  try {
    // — 멀티턴 예약 흐름 분기
    if (sessionContext[kakaoId]?.type) {
      return booking(kakaoId, utterance, res, "handleReserveMulti");
    }

    // — 회원 등록 흐름 (전문가 등록 분리)
    if (/^(회원|멤버)\s*등록하기$/.test(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "회원 등록을 선택하셨습니다. 계속 진행하려면 아래 양식으로 입력해주세요:\n예: 회원 홍길동 01012345678 1234"
              }
            }
          ]
        }
      });
    }
    if (/^(회원|멤버)\s*등록\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // — 예약 유형 선택 안내
    if (/^개인\s*운동\s*예약$/.test(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "예약 유형을 선택해주세요." } }],
          quickReplies: [
            { label: "개인 운동", action: "message", messageText: "개인 운동" },
            { label: "1:1 레슨", action: "message", messageText: "1:1 레슨" }
          ]
        }
      });
    }
    if (/^(개인\s*운동|1:1\s*레슨)$/.test(utterance)) {
      return booking(kakaoId, utterance, res, "reservePersonal");
    }
    
    // — 과제 확인 흐름
    if (/^과제\s*확인하기$/.test(utterance)) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: "확인할 과제를 선택해주세요." } }],
          quickReplies: [
            { label: "오늘 과제", action: "message", messageText: "오늘 과제" },
            { label: "예정된 과제", action: "message", messageText: "예정된 과제" }
          ]
        }
      });
    }
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
        outputs: [
          {
            simpleText: {
              text: "죄송합니다. 이해하지 못했어요. 메인 메뉴에서 다시 선택해주세요."
            }
          }
        ],
        quickReplies: [
          { label: "회원 등록하기", action: "message", messageText: "회원 등록하기" },
          { label: "개인 운동 예약", action: "message", messageText: "개인 운동 예약" },
          { label: "과제 확인하기", action: "message", messageText: "과제 확인하기" }
        ]
      }
    });
  } catch (err) {
    console.error("💥 webhook error:", err);
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: err.message,
      note: "webhook catch"
    });
    return res.json({
      version: "2.0",
      template: {
        outputs: [{ simpleText: { text: "문제가 발생했어요. 다시 시도해주세요." } }]
      }
    });
  }
});

export default router;
