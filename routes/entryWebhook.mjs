import express from "express";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMember from "../handlers/entry/registerMember.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [ENTRY] POST 요청 수신:", utterance);

  // 1. 전문가 등록 입력 형식 (자동 등록)
  if (/^전문가\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
    return registerTrainer(kakaoId, utterance, res);
  }

  // 2. 회원 등록 입력 형식 (자동 등록)
  if (/^회원\s+[가-힣]{2,10}\s+01[016789]\d{7,8}\s+\d{4}$/.test(utterance)) {
    return registerMember(kakaoId, utterance, res);
  }

  // 3. 메뉴 발화 → 역할 기반 라우팅
  if (utterance === "메뉴") {
    return routeToRoleMenu(kakaoId, res);
  }

  // 4. 안내용 발화
  if (utterance === "회원 등록") {
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "회원 등록을 위해 아래 형식대로 입력해 주세요:\n\n예: 회원 김철수 01012345678 1234"
          }
        }]
      }
    });
  }

  if (utterance === "전문가 등록") {
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "전문가 등록을 위해 아래 형식대로 입력해 주세요:\n\n예: 전문가 홍길동 01012345678 0412"
          }
        }]
      }
    });
  }

  // 5. fallback (형식 안내)
  return res.json({
    version: "2.0",
    template: {
      outputs: [{
        simpleText: {
          text: "‘회원 홍길동 01012345678 1234’ 또는 ‘전문가 김복두 01012345678 0412’ 형식으로 등록해 주세요."
        }
      }]
    }
  });
});

export default router;
