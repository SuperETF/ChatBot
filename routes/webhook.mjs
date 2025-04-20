// ✅ routes/webhook.mjs

import express from "express";
import { replyText } from "../utils/reply.mjs";
import { supabase } from "../services/supabase.mjs";
import fallback from "../handlers/system/fallback.mjs";

import booking from "../handlers/booking/index.mjs";
// e.g.  import assignment from "../handlers/assignment/index.mjs";
// e.g.  import { auth } from "../handlers/auth/index.mjs";

import { reserveSession } from "../handlers/booking/reservePersonal.mjs"; 
import dayjs from "dayjs";

const router = express.Router();

// 간단 정규식
const REGEX = {
  AM_OR_PM: /^(오전|오후)$/,
  // ...
  RESERVE_INTENT: /예약|운동/
};

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;

  console.log("🟡 발화 입력:", utterance);

  try {
    // 1) 예약 세션 진행 중?
    if (reserveSession[kakaoId]?.type) {
      return booking(kakaoId, utterance, res, "handleReserveMulti");
    }

    // 2) 오전/오후 단일
    if (REGEX.AM_OR_PM.test(utterance)) {
      // 만약 confirmPendingTime 등 필요 시 booking(..., "confirmPendingTime")
    }

    // 3) 예약 Intent
    if (REGEX.RESERVE_INTENT.test(utterance)) {
      return booking(kakaoId, utterance, res, "reservePersonal");
    }

    // 4) etc. (취소 / 과제 / 등록 / ...)
    // if (...) { ... }

    // fallback
    return fallback(utterance, kakaoId, res, "none", "none");
  } catch (error) {
    console.error("💥 webhook error:", error);
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: error.message
    });

    return res.json(
      replyText("🚧 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    );
  }
});

export default router;
