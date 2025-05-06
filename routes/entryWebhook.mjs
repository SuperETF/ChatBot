// 📁 routes/entryWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";
import registerTrainer from "../handlers/entry/registerTrainer.mjs";
import registerMemberBySelf from "../handlers/entry/registerMemberBySelf.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📨 [ENTRY] 발화:", utterance);

  // ✅ 등록 진입 발화 처리
  if (/^등록$/.test(utterance)) {
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

    if (trainer) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "🧑‍🏫 전문가님, 메뉴로 이동합니다."
              }
            }
          ],
          quickReplies: [
            {
              label: "전문가 메뉴",
              action: "block",
              blockId: "68133a8b2c50e1482b18ddfd"
            }
          ]
        }
      });
    }

    if (member) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "👤 회원님, 메뉴로 이동합니다."
              }
            }
          ],
          quickReplies: [
            {
              label: "회원 메뉴",
              action: "block",
              blockId: "67e66dfba6c9712a60fb0f93"
            }
          ]
        }
      });
    }

    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "🛎️ 등록을 시작하려면 아래 버튼을 눌러주세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "등록 시작",
            action: "block",
            blockId: "68133c2647b70d2c1d62b4d1"
          }
        ]
      }
    });
  }

  // ✅ 전문가 등록 입력 유도
  if (/^전문가 등록$/.test(utterance)) {
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "전문가 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 전문가 홍길동 01012345678 1234"
            }
          }
        ],
        quickReplies: [
          { label: "메인 메뉴", action: "message", messageText: "메인 메뉴" }
        ]
      }
    });
  }

  // ✅ 회원 등록 입력 유도
  if (/^회원 등록$/.test(utterance)) {
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "회원 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 홍길동 01012345678 1234"
            }
          }
        ],
        quickReplies: [
          { label: "메인 메뉴", action: "message", messageText: "메인 메뉴" }
        ]
      }
    });
  }

  // ✅ 전문가 등록 처리 (공백 포함, 하이픈 허용, 이름 유연)
  if (/^전문가\s+[가-힣\s]{2,20}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/.test(utterance)) {
    console.log("✅ 전문가 등록 정규식 매칭 성공:", utterance);
    return registerTrainer(kakaoId, utterance, res);
  } else if (/^전문가/.test(utterance)) {
    console.warn("❌ 전문가 등록 정규식 매칭 실패:", utterance);
  }

  // ✅ 회원 등록 처리 (하이픈 허용, 이름 단어 1개)
  if (/^[가-힣]{2,10}\s+01[016789][-]?\d{3,4}[-]?\d{4}\s+\d{4}$/.test(utterance)) {
    console.log("✅ 회원 등록 정규식 매칭 성공:", utterance);
    return registerMemberBySelf(kakaoId, utterance, res);
  } else if (/^[가-힣]+\s+01/.test(utterance)) {
    console.warn("❌ 회원 등록 정규식 매칭 실패:", utterance);
  }

  // ✅ fallback 처리 + 로그
  console.warn("📛 fallback 발생 - 처리되지 않은 발화:", utterance);
  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `❓ 요청하신 기능을 이해하지 못했습니다.\n입력하신 문장: \"${utterance}\"\n\n'등록'이라고 다시 입력해보세요.`
          }
        }
      ]
    }
  });
});

export default router;