import { replyText } from "../../../utils/reply.mjs";
import registerTrainer from "./registerTrainer.mjs";
import registerMember from "./registerMember.mjs";
import listMembers from "./listMembers.mjs";

export const auth = async (kakaoId, utterance, res, action) => {
  switch (action) {
    case "registerTrainerMember":
      return registerTrainer(kakaoId, utterance, res);
    case "registerMember":
      return registerMember(kakaoId, utterance, res);
    case "listMembers":
      return listMembers(kakaoId, utterance, res);
    default:
      return res.json(replyText("❓ 관리자용 회원 기능에서 처리할 수 없습니다."));
  }
};

export default auth;
