import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;
  console.log("🧑‍💼 관리자 발화:", utterance);

  try {
    // ✅ 전문가 등록 멘트 안내
    if (/^전문가\s*등록$/.test(utterance)) {
      return res.json(replyQuickReplies(
        "전문가 등록을 위해 아래 형식으로 입력해주세요:\n예: 전문가 홍길동 01012345678 1234",
        ["메인 메뉴"]
      ));
    }

    // ✅ 전문가 인증 요청
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 나의 회원 등록
    if (/^나의\s*회원\s*등록$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 나의 회원 목록
    if (/^나의\s*회원\s*목록$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 과제 생성
    if (/^과제\s*생성$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    // ✅ 과제 현황
    if (/^과제\s*현황$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    // ✅ 메인 메뉴
    if (/메인\s*메뉴/.test(utterance)) {
      return res.json(replyQuickReplies(
        "🧭 메인 메뉴입니다.\n- 나의 회원 등록\n- 과제 생성\n- 과제 현황",
        [
          { label: "나의 회원 등록", action: "message", messageText: "나의 회원 등록" },
          { label: "과제 생성", action: "message", messageText: "과제 생성" },
          { label: "과제 현황", action: "message", messageText: "과제 현황" }
        ]
      ));
    }

    // ✅ fallback 처리
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "admin-fallback",
      handler: "admin-router",
      timestamp: new Date(),
      note: "unrecognized utterance"
    });

    return res.json(replyQuickReplies(
      "❓ 요청을 이해하지 못했어요. 아래 버튼을 선택해보세요!",
      [
        { label: "나의 회원 등록", action: "message", messageText: "나의 회원 등록" },
        { label: "과제 생성", action: "message", messageText: "과제 생성" },
        { label: "과제 현황", action: "message", messageText: "과제 현황" }
      ]
    ));
  } catch (err) {
    console.error("💥 admin webhook error:", err.message);
    return res.json(replyText("⚠️ 관리자 처리 중 오류가 발생했습니다. 다시 시도해주세요."));
  }
});

export default router;
