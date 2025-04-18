import dayjs from "dayjs";
import { replyText } from "../../utils/reply.mjs";
import { sessionContext } from "./reservePersonal.mjs";
import { confirmReservation } from "./reservePersonal.mjs";

export default async function confirmPendingTime(kakaoId, utterance, res) {
  const ctx = sessionContext[kakaoId];

  if (!ctx || ctx.type !== "pending-am-or-pm") {
    return res.json(replyText("확정할 예약 시간이 없습니다. 다시 예약을 시도해주세요."));
  }

  // 오전 or 오후 판단
  const isAm = utterance.includes("오전");
  const isPm = utterance.includes("오후");

  if (!isAm && !isPm) {
    return res.json(replyText("❓ 오전인지 오후인지 정확히 알려주세요."));
  }

  let time = dayjs(ctx.base_time);
  if (isPm && time.hour() < 12) time = time.add(12, "hour");
  if (isAm && time.hour() >= 12) time = time.subtract(12, "hour");

  // 세션 초기화
  delete sessionContext[kakaoId];

  return await confirmReservation(ctx.member_id, time, res);
}
