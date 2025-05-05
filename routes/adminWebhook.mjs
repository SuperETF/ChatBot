// 📁 routes/adminWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyQuickReplies } from "../utils/reply.mjs";
import { adminSession, assignmentSession } from "../utils/sessionContext.mjs";

const router = express.Router();
const normalizeUtterance = (text) => text.replace(/\s+/g, " ").trim();

router.post("/", async (req, res) => {
  const rawUtterance = req.body.userRequest?.utterance || "";
  const utterance = normalizeUtterance(rawUtterance);
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🧑‍💼 [ADMIN] 발화:", utterance);

  try {
    // ✅ 멀티턴 흐름: 회원 등록
    if (adminSession[kakaoId]?.flow === "register-member") {
      return auth(kakaoId, utterance, res, "registerMemberFlow");
    }

    // ✅ 멀티턴 흐름: 과제 생성 진행 중
    if (assignmentSession[kakaoId]?.flow === "assignment") {
      return assignment(kakaoId, utterance, res, "handleAssignmentFlow");
    }

    // ✅ 발화 기반 intent 처리
    if (/^나의\s*회원\s*등록$/.test(utterance)) {
      adminSession[kakaoId] = { flow: "register-member" };
      return res.json(replyQuickReplies(
        "📝 등록할 회원 정보를 입력해주세요.\n예: 회원 김영희 01012345678 1234",
        ["메인 메뉴"]
      ));
    }

    if (/^나의\s*회원\s*(목록|현황)$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    if (/^과제\s*생성$/.test(utterance)) {
      assignmentSession[kakaoId] = { flow: "assignment" };
      return res.json(replyQuickReplies(
        "🎯 과제를 생성할 회원의 이름을 입력해주세요.",
        ["메인 메뉴"]
      ));
    }

    if (/^과제\s*현황$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    if (/메인\s*메뉴/.test(utterance)) {
      return res.json(replyQuickReplies("🧭 트레이너 메뉴입니다. 원하는 기능을 선택해주세요.", [
        "나의 회원 등록",
        "나의 회원 목록",
        "과제 생성",
        "과제 현황"
      ]));
    }

    // ✅ fallback 처리
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      intent: "admin-fallback",
      handler: "adminWebhook",
      timestamp: new Date(),
      note: "adminWebhook fallback"
    });

    return res.json(replyQuickReplies("❓ 이해하지 못했어요. 아래 메뉴 중 하나를 선택해주세요.", [
      "메인 메뉴"
    ]));
  } catch (err) {
    console.error("💥 adminWebhook error:", err.message);
    return res.json(replyQuickReplies("⚠️ 관리자 기능 처리 중 오류가 발생했습니다.", [
      "메인 메뉴"
    ]));
  }
});

export default router;