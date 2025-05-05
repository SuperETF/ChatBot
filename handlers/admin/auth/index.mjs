// 📁 handlers/admin/auth/index.mjs
import { replyText } from "../../../utils/reply.mjs";
import registerTrainer from "./registerTrainer.mjs";
import registerMember from "./registerMemberByTrainer.mjs";
import registerMemberFlow from "./registerMemberFlow.mjs"; // ✅ 추가
import listMembers from "./listMembers.mjs";

export default async function auth(kakaoId, utterance, res, action) {
  console.log("⚙️ auth handler → action:", action, "/ utterance:", utterance);

  switch (action) {
    case "registerTrainerMember":
      return registerTrainer(kakaoId, utterance, res);

    case "registerMember":
      return registerMember(kakaoId, utterance, res);

    case "registerMemberFlow": // ✅ 멀티턴 회원 등록
      return registerMemberFlow(kakaoId, utterance, res);

    case "listMembers":
      return listMembers(kakaoId, utterance, res);

    default:
      return res.json({
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "❓ 관리자 기능 처리 중 알 수 없는 요청입니다.\n메인 메뉴로 돌아가주세요."
              }
            }
          ]
        }
      });
  }
}
