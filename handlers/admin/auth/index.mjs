import { replyText } from "../../../utils/reply.mjs";
import registerTrainer from "./registerTrainer.mjs";
import registerMember from "./registerMember.mjs";
import listMembers from "./listMembers.mjs";

export default async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerTrainerMember":
      return registerTrainer(kakaoId, utterance, res);
    case "registerMember":
      return registerMember(kakaoId, utterance, res);
    case "listMembers":
      return listMembers(kakaoId, utterance, res);
    default:
      return res.json(replyText("❓ 관리자 인증 처리 중 알 수 없는 요청입니다."));
  }
}
