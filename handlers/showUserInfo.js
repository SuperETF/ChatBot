import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function showUserInfo(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 등록을 먼저 해주세요."));

  const msg = `${member.name}님 반갑습니다 👋\n남은 PT는 ${member.remaining_sessions}회입니다.\n등록일: ${new Date(member.joined_at).toLocaleDateString()}`;
  return res.json(replyText(msg));
}
