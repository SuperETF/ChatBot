// ✅ routes/adminWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

import booking from "../handlers/admin/booking/index.mjs";
import { auth } from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";

const router = express.Router();

router.post("/admin", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📥 관리자 발화:", utterance);

  try {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!trainer) {
      return res.json(replyText("관리자 권한이 없습니다. 인증된 전문가만 사용 가능합니다."));
    }

    // === Intent 분기 ===
    if (/회원\s*등록/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (/회원\s*목록/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    if (/예약\s*현황|예약\s*조회/.test(utterance)) {
      return booking(kakaoId, utterance, res, "showMyReservations");
    }

    if (/예약\s*취소/.test(utterance)) {
      return booking(kakaoId, utterance, res, "cancelPersonal");
    }

    if (/루틴\s*추천|루틴\s*생성|과제\s*배정/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    if (/루틴\s*배정|과제\s*배정|회원\s*루틴/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    return res.json(replyQuickReplies("가능한 기능 목록입니다:", [
      "회원 등록", "회원 목록", "예약 현황", "예약 취소",
      "루틴 추천", "루틴 배정"
    ]));

  } catch (err) {
    console.error("💥 admin webhook error:", err);
    return res.json(replyText("관리자 챗봇 처리 중 오류가 발생했습니다."));
  }
});

export default router;
