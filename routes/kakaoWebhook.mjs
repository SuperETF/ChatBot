import express from "express";
import adminWebhook from "./adminWebhook.mjs";
import memberWebhook from "./memberWebhook.mjs";
import { supabase } from "../services/supabase.mjs";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🎯 [웹훅 진입]:", utterance);

  // ✅ admin 판단 기준: "완전 일치"만 허용
  const adminKeywords = [
    "전문가 등록",
    "내 회원 등록",
    "내 회원 목록",
    "과제 생성",
    "과제 현황"
  ];

  const isAdminFlow = adminKeywords.includes(utterance); // 🎯 핵심 수정: includes(utterance)

  // ✅ 실제 전문가로 등록돼 있는지 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainer || isAdminFlow) {
    console.log("🔐 관리자 흐름으로 분기됨");
    return adminWebhook(req, res);
  } else {
    console.log("🙋‍♂️ 회원 흐름으로 분기됨");
    return memberWebhook(req, res);
  }
});

export default router;
