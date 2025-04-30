import express from "express";
import { supabase } from "../services/supabase.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";

const router = express.Router();

router.post("/admin", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📥 관리자 발화:", utterance);

  try {
    // ✅ 전문가 인증 여부 확인
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    // ✅ 인증되지 않은 경우
    if (!trainer) {
      if (utterance === "전문가 등록") {
        return auth(kakaoId, utterance, res, "registerTrainerMember");
      }
      return res.json(replyQuickReplies(
        "❗️전문가 인증이 필요합니다. 먼저 '전문가 등록'을 진행해주세요.", 
        [{ label: "전문가 등록", action: "message", messageText: "전문가 등록" }]
      ));
    }

    // ✅ 인증된 전문가만 아래 기능 접근 가능
    if (utterance === "나의 회원 등록") {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (utterance === "나의 회원 목록") {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    if (utterance === "과제 생성") {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    if (utterance === "과제 현황") {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    // ✅ fallback
    return res.json(replyQuickReplies("🧭 가능한 전문가 기능입니다:", [
      { label: "나의 회원 등록", messageText: "나의 회원 등록" },
      { label: "나의 회원 목록", messageText: "나의 회원 목록" },
      { label: "과제 생성", messageText: "과제 생성" },
      { label: "과제 현황", messageText: "과제 현황" }
    ]));

  } catch (err) {
    console.error("💥 admin webhook error:", err);
    return res.json(replyText("⚠️ 관리자 챗봇 처리 중 오류가 발생했습니다."));
  }
});

export default router;