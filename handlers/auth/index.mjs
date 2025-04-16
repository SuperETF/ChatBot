import registerTrainer from "./registerTrainer.js";
import registerMember from "./registerMember.js";
import registerTrainerMember from "./registerTrainerMember.js";
import listMembers from "./listMembers.js";
import { replyText } from "../../utils/reply.js";

export default async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerTrainer":
      return registerTrainer(kakaoId, utterance, res);
    case "registerMember":
      return registerMember(kakaoId, utterance, res);
    case "registerTrainerMember":
      return registerTrainerMember(kakaoId, utterance, res);
    case "listMembers":
      return listMembers(kakaoId, utterance, res);
    default:
      return res.json(replyText("등록할 항목을 찾지 못했습니다."));
  }
}
