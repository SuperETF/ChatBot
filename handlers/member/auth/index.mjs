import registerMember from "./registerMember.mjs";
import listMembers from "./listMembers.mjs";
import { replyText } from "../../../utils/reply.mjs";

async function auth(kakaoId, utterance, res, action) {
  switch (action) {
    case "registerMember":
      return registerMember(kakaoId, utterance, res);

    case "listMembers":
      return listMembers(kakaoId, utterance, res);

    default:
      return res.json(replyText("❓ 해당 등록 요청을 처리할 수 없습니다."));
  }
}

export default auth;
