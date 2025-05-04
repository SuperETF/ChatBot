import express from "express";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMemberBySelf from "../handlers/entry/registerMemberBySelf.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [ENTRY] POST 요청 수신:", utterance);

  // ✅ 전문가 등록 (스스로 등록)
  if (/^전문가\s+[가-힣]{2,10}/.test(utterance)) {
    return registerTrainer(kakaoId, utterance, res);
  }

  // ✅ 회원 등록 (스스로 등록, 단 "나의 회원"은 제외)
  if (
    /^회원\s+[가-힣]{2,10}/.test(utterance) &&
    !utterance.startsWith("나의 회원")
  ) {
    return registerMemberBySelf(kakaoId, utterance, res);
  }

  // ✅ 메뉴 진입
  if (["메뉴", "등록", "홈"].includes(utterance)) {
    return routeToRoleMenu(kakaoId, res);
  }

  // ✅ 안내 메시지
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
