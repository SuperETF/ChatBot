import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

const router = express.Router();

// ✅ 오픈빌더 블록 ID (각 블록의 실제 ID로 교체 필요)
const MAIN_MENU_BLOCK_ID = "your_main_menu_block_id";

router.post("/", async (req, res) => {
  const body = req.body || {};
  const utterance = (body.userRequest?.utterance || "").trim();
  const kakaoId = body.userRequest?.user?.id;

  console.log("📩 [관리자 발화]:", utterance);

  try {
    if (!utterance || !kakaoId) {
      return res.status(400).json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "❌ 요청 형식이 잘못되었습니다. 버튼을 눌러 다시 시도해주세요."
              }
            }
          ]
        }
      });
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    // ✅ 전문가 등록 안내
    if (!trainer && utterance === "전문가 등록") {
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "✅ 전문가 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 전문가 홍길동 01012345678 0412"
              }
            }
          ],
          quickReplies: [
            {
              label: "메인 메뉴",
              action: "block",
              blockId: MAIN_MENU_BLOCK_ID
            }
          ]
        }
      });
    }

    // ✅ 전문가 인증 포맷
    if (!trainer && /^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 인증된 전문가 기능 분기
    if (utterance === "나의 회원 등록") {
      return auth(kakaoId, utterance, res, "registerMember");
    }

    if (utterance === "나의 회원 목록") {
      return auth(kakaoId, utterance, res, "listMembers");
    }

    if (utterance === "과제 생성") {
      return assignment(kakaoId, utterance, res, "generateRoutinePreview");
    }

    if (utterance === "과제 현황") {
      return assignment(kakaoId, utterance, res, "getAssignmentStatus");
    }

    // ✅ fallback
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "❓ 알 수 없는 요청입니다. 버튼을 선택해주세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "메인 메뉴",
            action: "block",
            blockId: MAIN_MENU_BLOCK_ID
          }
        ]
      }
    });
  } catch (err) {
    console.error("💥 admin webhook error:", err.message);
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "⚠️ 관리자 기능 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "메인 메뉴",
            action: "block",
            blockId: MAIN_MENU_BLOCK_ID
          }
        ]
      }
    });
  }
});

export default router;
