import registerMember from "./registerTrainer.mjs";
import { replyText } from "../../../utils/reply.mjs";

export const auth = async (kakaoId, utterance, res, action) => {
  switch (action) {
    case "registerMember":
      return registerMember(kakaoId, utterance, res);
    case "listMembers":
      return listMembers(kakaoId, utterance, res);
    default:
      return res.json(replyText("❓ 관리자용 회원 기능에서 처리할 수 없습니다."));
  }
};

export default auth;
