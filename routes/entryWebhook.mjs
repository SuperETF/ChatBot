// 📁 routes/entryWebhook.mjs
import express from "express";
import { supabase } from "../services/supabase.mjs";

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
      // 전문가 메뉴로 이동
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
              blockId: "680b09d42c50e1482b17d9ea" // ✅ 관리자 첫 블럭 ID
            }
          ]
        }
      });
    }

    if (member) {
      // 회원 메뉴로 이동
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
              blockId: "67e66dddabcdb40ec9fbddad" // ✅ 회원 첫 블럭 ID
            }
          ]
        }
      });
    }

    // 미등록 사용자 → 등록 시작 블럭 이동
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
            blockId: "68133a3223dc6c3328128cd3" // ✅ 등록 첫 화면 블럭 ID
          }
        ]
      }
    });
  }

  // fallback
  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: "❓ 요청하신 기능을 이해하지 못했습니다. '등록'이라고 입력해보세요."
          }
        }
      ]
    }
  });
});

export default router;
