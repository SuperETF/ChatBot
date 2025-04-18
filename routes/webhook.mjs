// webhook.mjs 개선: 등록 흐름에서 name/phone 누락 시 등록 방지
import express from "express";
import { handlers } from "../handlers/index.mjs";
import classifyIntent from "../handlers/system/classifyIntent.mjs";
import fallback from "../handlers/system/fallback.mjs";
import { replyText, replyButton } from "../utils/reply.mjs";
import { logMultiTurnStep } from "../utils/log.mjs";
import { supabase } from "../services/supabase.mjs";

const router = express.Router();
const sessionContext = {};
const SESSION_TTL_MS = 2 * 60 * 1000;

const CANCEL_KEYWORDS = ["안 할래", "취소", "그만", "등록 안 해"];
const REWIND_KEYWORDS = ["이전", "뒤로", "다시"];
const RESTART_KEYWORDS = ["그래", "다시 시작", "다시 할래", "OK", "ㅇㅋ"];

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;
  const ctx = sessionContext[kakaoId];

  try {
    if (ctx && Date.now() - ctx.timestamp > SESSION_TTL_MS) {
      delete sessionContext[kakaoId];
    }

    if (CANCEL_KEYWORDS.includes(utterance)) {
      delete sessionContext[kakaoId];
      return res.json(replyButton("✅ 진행을 취소했어요. 다시 시작하시겠어요?", ["회원 등록", "트레이너 등록", "홈으로"]));
    }

    if (RESTART_KEYWORDS.includes(utterance)) {
      return res.json(replyButton("다시 어떤 항목을 등록하시겠어요?", ["회원 등록", "트레이너 등록", "운동 예약"]));
    }

    if (REWIND_KEYWORDS.includes(utterance)) {
      if (ctx?.intent === "회원 등록") {
        if (ctx.step === "askPhone") {
          ctx.step = "askName";
          delete ctx.data.phone;
          return res.json(replyText("이름을 다시 입력해주세요."));
        }
        if (ctx.step === "confirmRegister") {
          ctx.step = "askPhone";
          return res.json(replyText("전화번호를 다시 입력해주세요."));
        }
      }
    }

    if (utterance === "회원 등록") {
      sessionContext[kakaoId] = {
        intent: "회원 등록",
        step: "askName",
        data: {},
        timestamp: Date.now()
      };
      return res.json(replyText("회원님의 성함을 입력해주세요."));
    }

    if (["등록", "등록할게", "확인", "진행해"].includes(utterance)) {
      if (ctx?.intent === "회원 등록") {
        if (!ctx.data?.name || !ctx.data?.phone) {
          return res.json(replyText("등록할 정보가 부족합니다. 이름과 전화번호를 다시 입력해주세요."));
        }

        const composedInput = `회원 등록 ${ctx.data.name} ${ctx.data.phone}`;
        delete sessionContext[kakaoId];

        return handlers.auth(kakaoId, composedInput, res, "registerTrainerMember", sessionContext);
      }
    }

    if (ctx?.intent === "회원 등록") {
      if (ctx.step === "askName") {
        ctx.data.name = utterance;
        ctx.step = "askPhone";
        ctx.timestamp = Date.now();
        await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askName", utterance });
        return res.json(replyText("전화번호도 입력해주세요."));
      }
      if (ctx.step === "askPhone") {
        ctx.data.phone = utterance;
        ctx.step = "confirmRegister";
        ctx.timestamp = Date.now();
        await logMultiTurnStep({ kakaoId, intent: ctx.intent, step: "askPhone", utterance });
        return res.json(replyButton(`${ctx.data.name}님(${ctx.data.phone})을 등록하시겠습니까?`, ["등록", "취소"]));
      }
    }

    const { intent, handler, action } = await classifyIntent(utterance, kakaoId);
    if (handlers[handler]) {
      return await handlers[handler](kakaoId, utterance, res, action, sessionContext);
    }

    return fallback(utterance, kakaoId, res, handler, action);
  } catch (error) {
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: error.message || "Unhandled webhook error",
      note: "webhook try/catch"
    });
    return res.json(replyText("🚧 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요."));
  }
});

export default router;