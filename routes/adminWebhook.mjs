import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

export default async function adminWebhook(req, res) {
  const body = req.body || {};
  const utterance = (body.userRequest?.utterance || "").trim();
  const kakaoId = body.userRequest?.user?.id;

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

  console.log("📩 [관리자 발화]:", utterance);

  try {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    // ✅ 안내: 전문가 등록 발화 → 안내 응답
    if (!trainer && utterance === "전문가 등록") {
      return res.json(replyQuickReplies("✅ 전문가 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 전문가 홍길동 01012345678 0412", [
        { label: "메인 메뉴", messageText: "메인 메뉴" }
      ]));
    }

    // ✅ 전문가 인증 포맷 입력 → 인증 처리
    if (!trainer && /^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 이후: 인증된 전문가용 메뉴 분기
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

    return res.json(replyQuickReplies("🧭 전문가 기능입니다. 버튼을 눌러 선택해주세요:", [
      { label: "나의 회원 등록", messageText: "나의 회원 등록" },
      { label: "나의 회원 목록", messageText: "나의 회원 목록" },
      { label: "과제 생성", messageText: "과제 생성" },
      { label: "과제 현황", messageText: "과제 현황" }
    ]));

  } catch (err) {
    console.error("❌ adminWebhook error:", err.message);
    return res.json(replyText("⚠️ 관리자 챗봇 처리 중 오류가 발생했습니다."));
  }
}
