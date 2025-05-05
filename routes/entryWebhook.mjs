// 📁 routes/entryWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import axios from "axios";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMemberBySelf from "../handlers/entry/registerMemberBySelf.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [ENTRY] POST 요청 수신:", utterance);

  // ✅ 사용자 역할 판단
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  // ✅ 트레이너: adminWebhook으로 포워딩
  if (trainer) {
    console.log("➡️ 트레이너 → adminWebhook으로 포워딩");
    const { data } = await axios.post("https://yourdomain.com/kakao/admin", req.body);
    return res.json(data);
  }

  // ✅ 회원: memberWebhook으로 포워딩
  if (member) {
    console.log("➡️ 회원 → memberWebhook으로 포워딩");
    const { data } = await axios.post("https://yourdomain.com/kakao/webhook", req.body);
    return res.json(data);
  }

  // ✅ 미등록자만 직접 처리
  if (/^전문가\s+[가-힣]{2,10}/.test(utterance)) {
    return registerTrainer(kakaoId, utterance, res);
  }

  if (/^회원\s+[가-힣]{2,10}/.test(utterance)) {
    return registerMemberBySelf(kakaoId, utterance, res);
  }

  if (["메뉴", "등록", "홈"].includes(utterance)) {
    return routeToRoleMenu(kakaoId, res);
  }

  if (utterance === "회원 등록") {
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "회원 등록을 위해 아래 형식으로 입력해 주세요:\n\n예: 회원 김철수 01012345678 1234"
          }
        }]
      }
    });
  }

  // ✅ fallback 처리
  return res.json({
    version: "2.0",
    template: {
      outputs: [{
        simpleText: {
          text: "‘회원 김영희 01012345678 1234’ 또는 ‘전문가 홍길동 01012345678 0412’ 형식으로 입력해 주세요."
        }
      }]
    }
  });
});

export default router;
