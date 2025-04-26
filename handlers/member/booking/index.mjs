import { reservePersonal, handleMultiTurnFlow, sessionContext } from "./reservePersonal.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "startPersonalReservation":
      return reservePersonal(kakaoId, utterance, res);
    case "handleReservationFlow":
      return handleMultiTurnFlow(kakaoId, utterance, res);
    default:
      return res.json(replyText("❓ 알 수 없는 예약 요청입니다."));
  }
}

export { sessionContext };
