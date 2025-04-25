import { replyText } from "../../../utils/reply.mjs";

export default async function booking(kakaoId, utterance, res, action) {
  switch (action) {
    case "showMyReservations":
      return showMyReservations(kakaoId, utterance, res);
    case "cancelPersonal":
      return cancelPersonal(kakaoId, utterance, res);
    default:
      return res.json(replyText(`📦 관리자 예약 기능(${action})을 찾지 못했습니다.`));
  }
}
