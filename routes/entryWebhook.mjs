import express from "express";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMember from "../handlers/entry/registerMember.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [ENTRY] POST 요청 수신");

  if (/^전문가\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
    return registerTrainer(kakaoId, utterance, res);
  }

  if (/^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
    return registerMember(kakaoId, utterance, res);
  }

  if (utterance === "메뉴") {
    return routeToRoleMenu(kakaoId, res);
  }

  return res.json({
    version: "2.0",
    template: {
      outputs: [{
        simpleText: { text: "‘회원 홍길동 01012345678 1234’ 또는 ‘전문가 김복두 01012345678 0412’ 형식으로 등록해 주세요." }
      }]
    }
  });
});

export default router;
