import express from 'express';
import { supabase } from '../services/supabase.js';

const router = express.Router();

// 챗봇 메시지 응답 템플릿 함수
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

// POST /kakao/webhook
router.post('/', async (req, res) => {
  const utterance = req.body.userRequest?.utterance;
  const kakaoId = req.body.user?.id;

  if (!utterance || !kakaoId) {
    return res.status(400).send("Invalid Request");
  }

  console.log(`[카카오 챗봇 요청] ${utterance} / from: ${kakaoId}`);

  // 1️⃣ 내 정보 조회
  if (utterance.includes("내 정보")) {
    const { data: member } = await supabase
      .from("members")
      .select("*")
      .eq("kakao_id", kakaoId)
      .single();

    if (!member) {
      return res.json(replyText("등록된 회원 정보가 없어요."));
    }

    return res.json(replyText(`${member.name}님, 남은 PT는 ${member.remaining_sessions}회입니다.`));
  }

  // 2️⃣ 기타 기본 응답
  return res.json(replyText("요청하신 기능은 아직 준비 중입니다."));
});

export default router;
