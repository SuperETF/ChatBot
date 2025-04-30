import express from "express";
import { supabase } from "../services/supabase.mjs";
import auth from "../handlers/admin/auth/index.mjs";
import assignment from "../handlers/admin/assignment/index.mjs";
import { replyText, replyQuickReplies } from "../utils/reply.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const body = req.body || {};
  const utterance = (body.userRequest?.utterance || "").trim();
  const kakaoId = body.userRequest?.user?.id;

  if (!utterance || !kakaoId) {
    const errorResponse = {
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
    };
    console.log("📤 응답 JSON (잘못된 요청):", JSON.stringify(errorResponse, null, 2));
    return res.status(400).json(errorResponse);
  }

  console.log("📩 [관리자 발화]:", utterance);

  try {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    // 안내: 전문가 등록 안내만
    if (!trainer && utterance === "전문가 등록") {
      const response = replyQuickReplies("✅ 전문가 등록을 위해 아래 형식으로 입력해주세요:\n\n예: 전문가 홍길동 01012345678 0412", [
        { label: "메인 메뉴", messageText: "메인 메뉴" }
      ]);
      console.log("📤 응답 JSON (전문가 등록 안내):", JSON.stringify(response, null, 2));
      return res.json(response);
    }

    // 인증 처리
    if (!trainer && /^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(utterance)) {
      return auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // 인증된 전문가 메뉴 분기
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

    const fallbackResponse = replyQuickReplies("❓ 알 수 없는 요청입니다. 아래 버튼을 선택해주세요:", [
      { label: "나의 회원 등록", messageText: "나의 회원 등록" },
      { label: "나의 회원 목록", messageText: "나의 회원 목록" },
      { label: "과제 생성", messageText: "과제 생성" },
      { label: "과제 현황", messageText: "과제 현황" }
    ]);
    console.log("📤 응답 JSON (fallback):", JSON.stringify(fallbackResponse, null, 2));
    return res.json(fallbackResponse);
  } catch (err) {
    console.error("❌ adminWebhook error:", err.message);
    const errorResponse = replyText("⚠️ 관리자 기능 처리 중 오류가 발생했습니다.");
    console.log("📤 응답 JSON (catch):", JSON.stringify(errorResponse, null, 2));
    return res.json(errorResponse);
  }
});

export default router;
