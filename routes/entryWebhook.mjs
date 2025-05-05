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

  console.log("📩 [ENTRY] 발화:", utterance);

  // 1. 역할 판단
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

  const role = trainer ? "trainer" : member ? "member" : "guest";

  // 2. 인텐트 추출
  const intent = (() => {
    if (/과제 생성/.test(utterance)) return "create-assignment";
    if (/오늘 과제/.test(utterance)) return "today-assignment";
    if (/회원 등록/.test(utterance)) return "register-member";
    if (/전문가 등록/.test(utterance)) return "register-trainer";
    if (["메뉴", "홈", "기능"].includes(utterance)) return "menu";
    return "unknown";
  })();

  // 3. 라우팅 테이블 정의
  const routingTable = {
    trainer: {
      "create-assignment": { forward: "/kakao/admin" },
      "register-member": { forward: "/kakao/admin" },
      "menu": { forward: "/kakao/admin" },
    },
    member: {
      "today-assignment": { forward: "/kakao/webhook" },
      "menu": { forward: "/kakao/webhook" },
    },
    guest: {
      "register-member": { handler: registerMemberBySelf },
      "register-trainer": { handler: registerTrainer },
      "menu": { handler: routeToRoleMenu },
    }
  };

  const route = routingTable[role]?.[intent];

  // 4. 라우팅 처리
  if (!route) {
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "❓ 요청하신 기능을 인식하지 못했습니다. 다시 시도해 주세요."
            }
          }
        ]
      }
    });
  }

  if (route.forward) {
    console.log(`🔁 포워딩 → ${route.forward}`);
    const { data } = await axios.post(`https://yourdomain.com${route.forward}`, req.body);
    return res.json(data);
  }

  if (route.handler) {
    return route.handler(kakaoId, utterance, res);
  }
});

export default router;