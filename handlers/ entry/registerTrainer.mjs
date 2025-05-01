// registerTrainer.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function registerTrainer(kakaoId, utterance, res) {
  const match = utterance.match(/^전문가\s+([가-힣]{2,10})\s+(01[016789]\d{7,8})\s+(\d{4})$/);
  if (!match) {
    return res.json(replyText("형식 오류입니다."));
  }
  const [ , name, phone, code ] = match;

  const { error } = await supabase.from("trainers").update({ kakao_id: kakaoId }).eq("name", name).eq("phone", phone).eq("code", code);
  if (error) {
    return res.json(replyText("등록 중 오류가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name} 트레이너님 등록이 완료되었습니다.`));
}
