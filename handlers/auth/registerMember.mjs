// handlers/auth/registerMember.js
import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function registerMember(kakaoId, utterance, res) {
  const clean = utterance.replace(/^회원\s*/, "").trim();
  const match = clean.match(/([가-힣]{2,10})\s+(01[016789][0-9]{7,8})/);

  if (!match) {
    return res.json(replyText("예: 회원 김복두 01012345678 형식으로 입력해주세요."));
  }

  const name = match[1];
  const phone = match[2];

  const { data: member } = await supabase
    .from("members")
    .select("id, kakao_id, trainer_id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();

  if (!member || !member.trainer_id) {
    return res.json(replyText(
      "이 정보는 아직 트레이너가 등록하지 않았습니다.\n담당 트레이너에게 회원 등록을 먼저 요청해주세요."
    ));
  }

  if (member.kakao_id) {
    return res.json(replyText("이미 등록된 회원입니다."));
  }

  const { error } = await supabase
    .from("members")
    .update({ kakao_id: kakaoId })
    .eq("id", member.id);

  if (error) {
    return res.json(replyText("회원 등록 처리 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`✅ ${name}님, 등록이 완료되었습니다!`));
}