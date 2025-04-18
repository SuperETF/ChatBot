import registerTrainer from "./registerTrainer.mjs";
import registerMember from "./registerMember.mjs";
import registerTrainerMember from "./registerTrainerMember.mjs";
import listMembers from "./listMembers.mjs";
import { replyText } from "../../utils/reply.mjs";
import { supabase } from "../../services/supabase.mjs";

export default async function auth(kakaoId, utterance, res, action, sessionContext) {
  switch (action) {
    case "registerTrainer":
      return registerTrainer(kakaoId, utterance, res, sessionContext);

    case "registerTrainerMember":
    case "registerMember": {
      // ✅ intent: "회원 등록" 공통 → 역할 분기
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (trainer) {
        return registerTrainerMember(kakaoId, utterance, res, sessionContext);
      } else {
        return registerMember(kakaoId, utterance, res, sessionContext);
      }
    }

    case "listMembers":
      return listMembers(kakaoId, utterance, res);

    default:
      return res.json(replyText("등록할 항목을 찾지 못했습니다."));
  }
}
