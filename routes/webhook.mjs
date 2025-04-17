// webhook.mjs
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

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 사용자 발화:", utterance);
  console.log("👤 사용자 ID:", kakaoId);

  try {
    const ctx = sessionContext[kakaoId];
    if (ctx && Date.now() - ctx.timestamp > SESSION_TTL_MS) {
      sessionContext[kakaoId] = null;
    }

    if (["안 할래", "취소", "그만", "등록 안 해"].includes(utterance)) {
      sessionContext[kakaoId] = null;
      return res.json(replyText("진행을 취소했어요. 언제든지 다시 시작하실 수 있어요."));
    }

    // 🆕 회원 등록 멀티턴 진입 처리
    if (utterance === "회원 등록") {
      sessionContext[kakaoId] = {
        intent: "회원 등록",
        step: "askName",
        data: {},
        timestamp: Date.now()
      };
      return res.json(replyText("회원님의 성함을 입력해주세요."));
    }

    if (["등록", "등록할게"].includes(utterance)) {
      const ctx = sessionContext[kakaoId];
      if (ctx?.intent === "회원 등록" && ctx?.data?.name && ctx?.data?.phone) {
        sessionContext[kakaoId] = null;
        return handlers.auth(kakaoId, `회원 등록 ${ctx.data.name} ${ctx.data.phone}`, res, "registerTrainerMember");
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
        return res.json(replyButton(
          `${ctx.data.name}님(${ctx.data.phone})을 등록하시겠습니까?`,
          ["등록"]
        ));
      }
    }

    const { intent, handler, action } = await classifyIntent(utterance, kakaoId);
    console.log("🎯 INTENT 결과:", { intent, handler, action });

    if (handlers[handler]) {
      return await handlers[handler](kakaoId, utterance, res, action);
    }

    return fallback(utterance, kakaoId, res);
  } catch (error) {
    console.error("💥 webhook 처리 중 오류 발생:", error);

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