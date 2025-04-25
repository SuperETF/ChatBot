// ✅ handlers/booking/index.mjs
import { reservePersonal, handleMultiTurnReserve, confirmReservation } from "./reservePersonal.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "reservePersonal":
      return reservePersonal(kakaoId, utterance, res);

    case "handleReserveMulti":
      return handleMultiTurnReserve(kakaoId, utterance, res);

    default:
      return res.json(replyText(`예약 관련 기능(${action})을 찾지 못했습니다.`));
  }
}
