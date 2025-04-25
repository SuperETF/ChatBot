// handlers/booking/index.mjs
import { reservePersonal, handleMultiTurnReserve, sessionContext } from "./reservePersonal.mjs";
import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "reservePersonal":
      return reservePersonal(kakaoId, utterance, res);

    case "handleReserveMulti":
      return handleMultiTurnReserve(kakaoId, utterance, res);

    default:
      return res.json(
        replyText(`예약 관련 기능(${action})을 찾지 못했습니다.`)
      );
  }
}

// 예약 흐름 상태 저장 객체 재내보내기
export { sessionContext };
