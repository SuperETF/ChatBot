import express from "express";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMemberBySelf from "../handlers/entry/registerMemberBySelf.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [ENTRY] POST 요청 수신:", utterance);

  // ✅ 1. 전문가 등록 입력 형식
  if (/^전문가\s+[가-힣]{2,10}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/.test(utterance)) {
    return registerTrainer(kakaoId, utterance, res);
  }
  
  // ✅ 2. 회원 등록 입력 형식
  if (/^회원\s+[가-힣]{2,10}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/.test(utterance)) {
    return registerMemberBySelf(kakaoId, utterance, res);
  }
  
  // ✅ 3. 메뉴 진입 (역할 분기) - "등록" 포함
  if (["메뉴", "메인 메뉴", "홈", "등록"].includes(utterance)) {
    return routeToRoleMenu(kakaoId, res);
  }

  // ✅ 4. 안내 메시지 ("회원 등록")
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

  // ✅ 5. 안내 메시지 ("전문가 등록")
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

  // ✅ 6. fallback 응답
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
