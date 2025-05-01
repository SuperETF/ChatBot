// ✅ routes/entryWebhook.mjs

import express from "express";
import { supabase } from "../services/supabase.mjs";

const router = express.Router();

// 블럭 ID 정의 (오픈빌더에서 복사한 실제 값)
const BLOCK_IDS = {
  WELCOME: "68133a3223dc6c3328128cd3",        // 비회원: 회원/전문가 선택 블럭
  MEMBER_MAIN: "67e66dddabcdb40ec9fbddad",    // 등록된 회원 메인 메뉴
  TRAINER_MAIN: "680b09d42c50e1482b17d9ea"    // 등록된 전문가 메인 메뉴
};

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  // ✅ "등록" 아닌 발화는 무시 (보안/혼동 방지)
  if (utterance !== "등록") {
    return res.json({
      version: "2.0",
      text: "‘등록’이라고 입력하시면 시작됩니다."
    });
  }

  // ✅ 전문가 여부 확인
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (trainer) {
    return res.json({
      version: "2.0",
      redirectBlock: BLOCK_IDS.TRAINER_MAIN
    });
  }

  // ✅ 회원 여부 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (member) {
    return res.json({
      version: "2.0",
      redirectBlock: BLOCK_IDS.MEMBER_MAIN
    });
  }

  // ✅ 둘 다 아니면 웰컴 블럭
  return res.json({
    version: "2.0",
    redirectBlock: BLOCK_IDS.WELCOME
  });
});

export default router;
