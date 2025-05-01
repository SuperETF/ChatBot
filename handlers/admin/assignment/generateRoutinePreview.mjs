import { sessionContext } from "../../../services/sessionContext.js";
import { replyText } from "../../../utils/reply.mjs";

export default async function generateRoutinePreview(kakaoId, utterance, res) {
  sessionContext[kakaoId] = {
    flow: "assignment",
    step: "awaiting_member",
    assignment: {}
  };

  return res.json(replyText("👤 누구에게 과제를 배정할까요? 이름을 입력해주세요."));
}
