// handlers/auth/index.mjs 
import registerTrainer from "./registerTrainer.mjs";
import registerMember from "./registerMember.mjs";
import registerTrainerMember from "./registerTrainerMember.mjs";
import listMembers from "./listMembers.mjs";
import { replyText } from "../../../utils/reply.mjs";

export const auth = async (kakaoId, utterance, res, action) => {
  switch (action) {
    case "registerTrainer":
      return registerTrainer(kakaoId, utterance, res);

    case "registerTrainerMember":
      return registerTrainerMember(kakaoId, utterance, res);

    case "registerMember":
      return registerMember(kakaoId, utterance, res);

    case "listMembers":
      return listMembers(kakaoId, utterance, res);

    default:
      return res.json(replyText("❓ 해당 등록 요청을 처리할 수 없습니다."));
  }
};