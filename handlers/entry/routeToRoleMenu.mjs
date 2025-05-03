import { supabase } from "../../services/supabase.mjs";

// 블럭 ID 직접 선언 (초기 진입용)
const BLOCK_IDS = {
  WELCOME: "68133c2647b70d2c1d62b4d1",       // 비회원: 등록 선택 블럭
  MEMBER_MAIN: "67e66dfba6c9712a60fb0f93",   // 회원 메인 메뉴
  TRAINER_MAIN: "68133a8b2c50e1482b18ddfd"   // 전문가 메인 메뉴
};

export default async function routeToRoleMenu(kakaoId, res) {
  try {
    // ✅ 전문가 여부 확인
    const { data: trainer } = await supabase
      .from("trainers")
      .select("name")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (trainer?.name) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `✅ ${trainer.name} 트레이너님, 전문가 메뉴로 이동할 수 있어요.`
            }
          }],
          quickReplies: [
            {
              label: "전문가 메뉴",
              action: "block",
              messageText: "메인 메뉴",
              blockId: BLOCK_IDS.TRAINER_MAIN
            }
          ]
        }
      });
    }

    // ✅ 회원 여부 확인
    const { data: member } = await supabase
      .from("members")
      .select("name")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    if (member?.name) {
      return res.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `🙋‍♀️ ${member.name} 회원님, 아래 버튼을 눌러 메인 메뉴로 이동하세요.`
            }
          }],
          quickReplies: [
            {
              label: "회원 메뉴",
              action: "block",
              messageText: "메인 메뉴",
              blockId: BLOCK_IDS.MEMBER_MAIN
            }
          ]
        }
      });
    }

    // ❌ 등록되지 않은 사용자: 웰컴 블럭으로 이동 버튼
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance: "메뉴",
      role: "guest",
      handler: "routeToRoleMenu",
      created_at: new Date()
    });

    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "⚠️ 아직 등록되지 않은 사용자입니다. 아래에서 회원 또는 전문가 등록을 진행해 주세요."
          }
        }],
        quickReplies: [
          {
            label: "등록하러 가기",
            action: "block",
            messageText: "회원 등록",
            blockId: BLOCK_IDS.WELCOME
          }
        ]
      }
    });
  } catch (err) {
    console.error("💥 [routeToRoleMenu] 오류 발생:", err.message);
    return res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: { text: "⚠️ 메뉴 분기 처리 중 오류가 발생했습니다. 다시 시도해 주세요." }
        }]
      }
    });
  }
}
