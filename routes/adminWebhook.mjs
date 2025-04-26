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
    // ✅ 먼저 전문가 인증 여부 확인
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (!trainer) {
      // 관리자 등록 (전문가 인증) 플로우
      if (/^전문가\s*등록$/.test(utterance)) {
        return auth(kakaoId, utterance, res, "registerTrainerMember");
      }
      // 인증 안 됐으면 다른 기능 사용 불가
      return res.json(replyText("❗️ 전문가 인증이 필요합니다. 먼저 '전문가 등록'을 진행해주세요."));
    }

    // ✅ 인증된 전문가만 아래 기능 접근 가능

    // 회원 등록
    if (/^회원\s*등록$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    // 회원 목록
    if (/^회원\s*목록$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    // 과제 부여 (루틴 추천)
    if (/^과제\s*부여$|^루틴\s*추천$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    // 과제 배정 (회원에게 루틴 배정)
    if (/^루틴\s*배정$|^과제\s*배정$/.test(utterance)) {
      return assignment(kakaoId, utterance, res, "assignRoutineToMember");
    }

    // fallback
    return res.json(replyQuickReplies("가능한 관리자 기능 목록입니다:", [
      "전문가 등록", "회원 등록", "회원 목록", "과제 부여", "과제 배정"
    ]));

  } catch (err) {
    console.error("💥 admin webhook error:", err);
    return res.json(replyText("관리자 챗봇 처리 중 오류가 발생했습니다."));
  }
});

export default router;
