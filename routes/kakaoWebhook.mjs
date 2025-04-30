import express from "express";
import adminWebhook from "./adminWebhook.mjs";
import memberWebhook from "./memberWebhook.mjs";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🎯 [웹훅 진입]:", utterance);

  // ✅ admin 판단 기준
  const adminTriggers = ["전문가", "나의 회원", "과제"];
  const isAdminKeyword = adminTriggers.some(keyword => utterance.includes(keyword));

  // ✅ 실제 전문가로 등록돼 있는지 확인
  const { data: trainer } = await import("../services/supabase.mjs").then(({ supabase }) =>
    supabase.from("trainers").select("id").eq("kakao_id", kakaoId).maybeSingle()
  );

  if (trainer || isAdminKeyword) {
    return adminWebhook(req, res);
  } else {
    return memberWebhook(req, res);
  }
});

export default router;
