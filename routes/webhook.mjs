// webhook.mjs
import express from "express";
import { handlers } from "../handlers/index.mjs";
import classifyIntent from "../handlers/system/classifyIntent.mjs";
import fallback from "../handlers/system/fallback.mjs";
import { replyText, replyButton } from "../utils/reply.mjs";
import { logMultiTurnStep } from "../utils/log.mjs";

const router = express.Router();
const sessionContext = {};
const SESSION_TTL_MS = 2 * 60 * 1000;

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance.trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("📩 사용자 발화:", utterance);
  console.log("👤 사용자 ID:", kakaoId);

  // 세션 만료 처리
  const ctx = sessionContext[kakaoId];
  if (ctx && Date.now() - ctx.timestamp > SESSION_TTL_MS) {
    sessionContext[kakaoId] = null;
  }

  // 사용자 진행 중단 발화
  if (["안 할래", "취소", "그만", "등록 안 해"].includes(utterance)) {
    sessionContext[kakaoId] = null;
    return res.json(replyText("진행을 취소했어요. 언제든지 다시 시작하실 수 있어요."));
  }

  // 멀티턴 등록 확인
  if (["등록", "등록할게"].includes(utterance)) {
    const ctx = sessionContext[kakaoId];
    if (ctx?.intent === "회원 등록" && ctx?.data?.name && ctx?.data?.phone) {
      sessionContext[kakaoId] = null;
      return handlers.auth(kakaoId, `회원 등록 ${ctx.data.name} ${ctx.data.phone}`, res, "registerTrainerMember");
    }
  }

  // 멀티턴 흐름 처리
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

  // 의도 분류
  const { intent, handler, action } = await classifyIntent(utterance, kakaoId);
  console.log("🎯 INTENT 결과:", { intent, handler, action });

  // 핸들러 실행
  if (handlers[handler]) {
    return handlers[handler](kakaoId, utterance, res, action);
  }

  return fallback(utterance, kakaoId, res);
});

export default router;
