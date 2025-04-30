import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

export default async function adminWebhook(req, res) {
  const utterance = (req.body.userRequest?.utterance || "").trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 [관리자 발화]:", utterance);

  try {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    // ✅ 전문가 인증이 안 된 경우
    if (!trainer) {
      if (utterance === "전문가 등록") {
        return auth(kakaoId, utterance, res, "registerTrainerMember");
      }

      return res.json(replyQuickReplies("❗ 전문가 인증이 필요합니다.", [
        { label: "전문가 등록", messageText: "전문가 등록" }
      ]));
    }

    // ✅ 전문가 인증된 경우 기능 분기
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

    if (utterance === "개인 운동 현황") {
      return res.json(replyQuickReplies("✅ [개인 운동 현황] 기능은 준비 중입니다.", [
        { label: "메인 메뉴", messageText: "메인 메뉴" }
      ]));
    }

    // ✅ fallback (기본 응답)
    return res.json(replyQuickReplies("🧭 전문가 기능입니다. 버튼을 눌러 선택해주세요:", [
      { label: "나의 회원 등록", messageText: "나의 회원 등록" },
      { label: "나의 회원 목록", messageText: "나의 회원 목록" },
      { label: "과제 생성", messageText: "과제 생성" },
      { label: "과제 현황", messageText: "과제 현황" }
    ]));

  } catch (err) {
    console.error("❌ adminWebhook error:", err.message);

    // ✅ catch 응답도 카카오 JSON 형식으로
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "⚠️ 관리자 챗봇 처리 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요."
            }
          }
        ],
        quickReplies: [
          { label: "메인 메뉴", messageText: "메인 메뉴" }
        ]
      }
    });
  }
}
