// 📁 routes/adminWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";
import { assignmentSession, adminSession } from "../utils/sessionContext.mjs";

const router = express.Router();
const normalizeUtterance = (text) => text.replace(/\s+/g, " ").trim();

router.post("/", async (req, res) => {
  const rawUtterance = req.body.userRequest?.utterance || "";
  const utterance = normalizeUtterance(rawUtterance);
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🧑‍💼 [관리자 발화]:", JSON.stringify(utterance));

  // ✅ 오직 블럭 이동만 처리하는 발화 (버튼용)
  const blockOnly = ["예약 관리", "숙제 및 과제"];
  if (blockOnly.includes(utterance)) {
    console.log(`🟨 '${utterance}' → block 이동용 → 서버 무시`);
    return res.status(200).end();
  }

  try {
    // ✅ 멀티턴 흐름 중인 경우: 회원 등록
    if (adminSession[kakaoId]?.flow === "register-member") {
      return auth(kakaoId, utterance, res, "registerMemberFlow");
    }

    // ✅ 안내 메시지
    if (utterance === "전문가 등록") {
      return res.json(replyQuickReplies(
        "전문가 등록을 위해 아래와 같이 입력해주세요:\n\n예: 전문가 홍길동 01012345678 0412",
        ["메인 메뉴"]
      ));
    }

    if (utterance === "나의 회원 등록") {
      adminSession[kakaoId] = { flow: "register-member" };
      return res.json(replyQuickReplies(
        "📝 회원 등록을 위해 아래와 같이 입력해주세요:\n\n예: 회원 김영희 01012345678 1234",
        ["메인 메뉴"]
      ));
    }

    // ✅ 회원 목록
    if (/^나의\s*회원\s*(목록|현황)$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 과제 처리
    if (utterance === "과제 생성") {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    if (assignmentSession[kakaoId]?.flow === "assignment") {
      return assignment(kakaoId, utterance, res, "handleAssignmentFlow");
    }

    if (/^과제\s*현황$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    // ✅ 메인 메뉴
    if (/메인\s*메뉴/.test(utterance)) {
      return res.json(replyQuickReplies("🧭 트레이너 메뉴입니다. 원하는 기능을 선택해주세요.", [
        "나의 회원 등록",
        "나의 회원 목록",
        "과제 생성",
        "과제 현황"
      ]));
    }

    // ✅ fallback 기록
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "admin-fallback",
      handler: "admin-router",
      timestamp: new Date(),
      note: "admin fallback"
    });

    return res.json(replyQuickReplies("❓ 이해하지 못했어요. 아래 버튼을 선택해주세요.", [
      "메인 메뉴"
    ]));
  } catch (err) {
    console.error("💥 admin webhook error:", err.message);
    return res.json(replyQuickReplies("⚠️ 관리자 처리 중 오류가 발생했습니다.", [
      "메인 메뉴"
    ]));
  }
});

export default router;
