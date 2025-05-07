// 📁 routes/entryWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMemberBySelf from "../handlers/entry/registerMemberBySelf.mjs";
import routeToRoleMenu from "../handlers/entry/routeToRoleMenu.mjs";
import { entrySession } from "../utils/entrySession.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId   = req.body.userRequest?.user?.id;

  console.log("📨 [ENTRY] 발화:", utterance);

  // 1) “등록” 버튼 진입 처리
  if (/^등록$/.test(utterance)) {
    const { data: trainer } = await supabase
      .from("trainers").select("id").eq("kakao_id", kakaoId).maybeSingle();
    const { data: member }  = await supabase
      .from("members") .select("id").eq("kakao_id", kakaoId).maybeSingle();

    if (trainer) {
      return res.json({
        version:"2.0",
        template:{
          outputs:[{ simpleText:{ text:"🧑‍🏫 전문가님, 메뉴로 이동합니다." } }],
          quickReplies:[{
            label:"메인 메뉴",
            action:"message",
            messageText:"메인 메뉴"
          }]
        }
      });
    }

    if (member) {
      return res.json({
        version:"2.0",
        template:{
          outputs:[{ simpleText:{ text:"👤 회원님, 메뉴로 이동합니다." } }],
          quickReplies:[{
            label:"메인 메뉴",
            action:"message",
            messageText:"메인 메뉴"
          }]
        }
      });
    }

    return res.json({
      version:"2.0",
      template:{
        outputs:[{ simpleText:{ text:"🛎️ 등록을 시작하려면 아래 버튼을 눌러주세요." } }],
        quickReplies:[{
          label:"등록 시작",
          action:"message",
          messageText:"등록 시작"
        }]
      }
    });
  }

  // 2) “메인 메뉴” 분기
  if (/^메인\s?메뉴$/.test(utterance)) {
    return routeToRoleMenu(kakaoId, res);
  }

  // 3) 회원/전문가 등록 모드 설정
  if (/^전문가 등록$/.test(utterance)) {
    entrySession[kakaoId] = { mode:"trainer" };
    return res.json({
      version:"2.0",
      template:{
        outputs:[{ simpleText:{
          text:"전문가 정보를 입력해주세요:\n예) 홍길동 01012345678 1234"
        }}],
        quickReplies:[{
          label:"입력하기",
          action:"message",
          messageText:"입력하기"
        }]
      }
    });
  }

  if (/^회원 등록$/.test(utterance)) {
    entrySession[kakaoId] = { mode:"member" };
    return res.json({
      version:"2.0",
      template:{
        outputs:[{ simpleText:{
          text:"회원 정보를 입력해주세요:\n예) 홍길동 01012345678 1234"
        }}],
        quickReplies:[{
          label:"입력하기",
          action:"message",
          messageText:"입력하기"
        }]
      }
    });
  }

  // 4) 세션 모드에 따른 입력 처리 (catch-all)
  const ctx = entrySession[kakaoId];
  if (ctx?.mode === "trainer") {
    const trainerPattern = /^[가-힣\s]{2,20}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/;
    if (trainerPattern.test(utterance)) {
      delete entrySession[kakaoId];
      return registerTrainer(kakaoId, utterance, res);
    }
    return res.json({
      version:"2.0",
      template:{
        outputs:[{ simpleText:{
          text:"❗ 형식이 올바르지 않습니다.\n예시) 홍길동 01012345678 1234"
        }}]
      }
    });
  }

  if (ctx?.mode === "member") {
    const memberPattern = /^[가-힣]{2,10}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/;
    if (memberPattern.test(utterance)) {
      delete entrySession[kakaoId];
      return registerMemberBySelf(kakaoId, utterance, res);
    }
    return res.json({
      version:"2.0",
      template:{
        outputs:[{ simpleText:{
          text:"❗ 형식이 올바르지 않습니다.\n예시) 홍길동 01012345678 1234"
        }}]
      }
    });
  }

  // 5) “메뉴” 분기 (catch-all 이후)
  if (/^메뉴$/.test(utterance)) {
    return routeToRoleMenu(kakaoId, res);
  }

  // 6) 최종 fallback (모든 입력 잡기)
  return res.json({
    version:"2.0",
    template:{
      outputs:[{ simpleText:{
        text:`❓ 이해하지 못했습니다.\n입력: “${utterance}”\n‘등록’, ‘회원 등록’, ‘전문가 등록’ 중 선택해 주세요.`
      }}]
    }
  });
});

export default router;
