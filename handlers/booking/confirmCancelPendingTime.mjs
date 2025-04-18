import dayjs from "dayjs";
import { replyText } from "../../utils/reply.mjs";
import { sessionContext, confirmCancelReservation } from "./cancelPersonal.mjs";

export default async function confirmCancelPendingTime(kakaoId, utterance, res) {
  const ctx = sessionContext[kakaoId];

  if (!ctx || ctx.type !== "pending-cancel-confirmation") {
    return res.json(replyText("확인할 예약 취소 요청이 없습니다."));
  }

  const isAm = utterance.includes("오전");
  const isPm = utterance.includes("오후");

  if (!isAm && !isPm) {
    return res.json(replyText("❓ 오전인지 오후인지 정확히 알려주세요."));
  }

  let time = dayjs(ctx.base_time);
  if (isPm && time.hour() < 12) time = time.add(12, "hour");
  if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");

  delete sessionContext[kakaoId];

  return await confirmCancelReservation(ctx.member_id, time, res);
}
