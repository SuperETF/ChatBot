console.log("📦 전체 req.body 확인:", req.body);

import express from "express";
import { supabase } from "../services/supabase.js";

const router = express.Router();

// 챗봇 응답 템플릿
function replyText(text) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: text
          }
        }
      ]
    }
  };
}

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.user?.id;

  console.log("📩 사용자 요청:", utterance);
  console.log("🧑‍💼 사용자 kakaoId:", kakaoId);

  if (!utterance || !kakaoId) {
    return res.status(400).json(replyText("요청 정보가 부족합니다."));
  }

  // ===============================
  // 1️⃣ 내 정보 보여줘
  // ===============================
  if (utterance.includes("내 정보")) {
    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("kakao_id", kakaoId)
      .single();

    if (!member) {
      return res.json(replyText("등록된 회원 정보가 없어요."));
    }

    const msg = `${member.name}님, 반가워요!\n남은 PT 횟수는 ${member.remaining_sessions}회입니다.`;
    return res.json(replyText(msg));
  }

  // ===============================
  // 2️⃣ 운동 예약해줘
  // ===============================
  if (utterance.includes("운동 예약") || utterance.includes("운동 예약해줘")) {
    // 1. 회원 찾기
    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("kakao_id", kakaoId)
      .single();

    if (!member) {
      return res.json(replyText("먼저 회원 등록이 필요해요!"));
    }

    // 2. 트레이너 중 하나 선택 (임시로 첫 번째 트레이너)
    const { data: trainers } = await supabase.from("trainers").select("*");
    if (!trainers || trainers.length === 0) {
      return res.json(replyText("등록된 트레이너가 없습니다."));
    }

    const trainer = trainers[0];

    // 3. 예약 시간 지정 (내일 오전 10시)
    const now = new Date();
    const reserved = new Date(now);
    reserved.setDate(now.getDate() + 1);
    reserved.setHours(10, 0, 0, 0);

    // 4. 스케줄 등록
    const { error } = await supabase.from("schedules").insert({
      member_id: member.id,
      trainer_id: trainer.id,
      datetime: reserved,
      body_part: "전신" // 기본값
    });

    if (error) {
      return res.json(replyText("예약 중 문제가 발생했어요. 다시 시도해주세요."));
    }

    const msg = `${member.name}님, ${trainer.name} 트레이너와\n${reserved.toLocaleString()}에 예약 완료됐어요!`;
    return res.json(replyText(msg));
  }

  // ===============================
  // 3️⃣ 기본 응답
  // ===============================
  return res.json(replyText("무슨 말씀인지 이해하지 못했어요. 😅"));
});

export default router;
