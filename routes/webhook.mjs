import express from "express";
import { replyText } from "../utils/reply.mjs";
import fallback from "../handlers/system/fallback.mjs";
import { supabase } from "../services/supabase.mjs";
import * as auth from "../handlers/auth/index.mjs";
import reservePersonal from "../handlers/booking/reservePersonal.mjs";
import cancelPersonal from "../handlers/booking/cancelPersonal.mjs";
import showSlotStatus from "../handlers/booking/showSlotStatus.mjs";
import showMyReservations from "../handlers/booking/showMyReservations.mjs";

const router = express.Router();

router.post("/", async (req, res) => {
  const utterance = req.body.userRequest?.utterance?.trim();
  const kakaoId = req.body.userRequest?.user?.id;

  const firstLine = utterance?.split("\n")[0]?.trim();

  try {
    // ✅ 전문가 등록
    if (/^전문가\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainer");
    }

    // ✅ 트레이너가 회원 등록
    if (/^회원\s+[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerTrainerMember");
    }

    // ✅ 회원 본인 등록
    if (/^[가-힣]{2,10}\s+01[016789][0-9]{7,8}\s+\d{4}$/.test(firstLine)) {
      return auth.auth(kakaoId, utterance, res, "registerMember");
    }

    // ✅ 회원 목록
    if (firstLine === "회원 목록") {
      return auth.auth(kakaoId, utterance, res, "listMembers");
    }

    // ✅ 내 예약 내역 보기
    if (/예약\s*내역|내\s*예약|운동\s*몇\s*시|레슨\s*몇\s*시/.test(utterance)) {
      return showMyReservations(kakaoId, utterance, res);
    }

    // ✅ 개인 운동 예약 취소
    if (/취소/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return cancelPersonal(kakaoId, utterance, res);
    }

    // ✅ 예약 현황 확인
    if (/몇\s*명|현황|자리\s*있어/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return showSlotStatus(kakaoId, utterance, res);
    }

    // ✅ 개인 운동 예약
    if (/운동|예약/.test(utterance) && /\d{1,2}시/.test(utterance)) {
      return reservePersonal(kakaoId, utterance, res);
    }

    // ❌ fallback 처리
    return fallback(utterance, kakaoId, res, "none", "none");

  } catch (error) {
    console.error("💥 webhook error:", error);
    await supabase.from("fallback_logs").insert({
      kakao_id: kakaoId,
      utterance,
      timestamp: new Date(),
      error_message: error.message,
      note: "webhook catch"
    });
    return res.json(replyText("🚧 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
  }
});

export default router;
