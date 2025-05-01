// ✅ routes/adminWebhook.mjs

import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";
import { assignmentSession } from "../utils/sessionContext.mjs";

const router = express.Router();

const normalizeUtterance = (text) => text.replace(/\s+/g, " ").trim();

router.post("/", async (req, res) => {
  const rawUtterance = req.body.userRequest?.utterance || "";
  const utterance = normalizeUtterance(rawUtterance);
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🧑‍💼 [관리자 발화]:", utterance);

  // ✅ 버튼 전용 블럭 무시 처리
  const blockOnly = ["멤버 등록", "예약 관리", "숙제 및 과제"];
  if (blockOnly.includes(utterance)) {
    console.log(`🟨 '${utterance}' → block 전용 → 서버 무시`);
    return res.status(200).end();
  }

  try {
    // ✅ 1. 전문가 등록 진입 (버튼 클릭 시)
    if (utterance === "전문가 등록") {
      console.log("✅ 전문가 등록 안내 메시지 출력");
      return res.json(replyQuickReplies(
        "전문가 등록을 위해 아래와 같이 입력해주세요:\n\n예: 전문가 홍길동 01012345678 0412",
        ["메인 메뉴"]
      ));
    }

    // ✅ 2. 전문가 정보 입력 시 → 등록 처리
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 3. 회원 등록 안내
    if (utterance === "나의 회원 등록") {
      return res.json(replyQuickReplies(
        "📝 회원 등록을 위해 아래와 같이 입력해주세요:\n\n예: 회원 김영희 01012345678 1234",
        ["메인 메뉴"]
      ));
    }

    // ✅ 4. 회원 등록 처리
    if (/^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 5. 회원 목록 조회
    if (/^나의\s*회원\s*(목록|현황)$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 6. 과제 생성 진입
    if (utterance === "과제 생성") {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    // ✅ 7. 멀티턴 과제 흐름
    if (assignmentSession[kakaoId]?.flow === "assignment") {
      return assignment(kakaoId, utterance, res, "handleAssignmentFlow");
    }

    // ✅ 8. 과제 현황 조회
    if (/^과제\s*현황$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    // ✅ 9. 메인 메뉴
    if (/메인\s*메뉴/.test(utterance)) {
      return res.json(replyQuickReplies("🧭 메인 메뉴입니다.", [
        "나의 회원 등록",
        "나의 회원 목록",
        "과제 생성",
        "과제 현황"
      ]));
    }

    // ✅ 10. fallback 처리
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "admin-fallback",
      handler: "admin-router",
      timestamp: new Date(),
      note: "admin fallback"
    });

    return res.json(replyQuickReplies("❓ 요청을 이해하지 못했어요. 아래 버튼을 선택해주세요.", [
      "메인 메뉴"
    ]));

  } catch (err) {
    console.error("💥 admin webhook error:", err.message);
    return res.json(replyQuickReplies("⚠️ 관리자 기능 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", [
      "메인 메뉴"
    ]));
  }
});

export default router;
