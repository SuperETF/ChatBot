// handlers/booking/cancelPersonal.js
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function cancelPersonal(kakaoId, utterance, res) {
  const hourMatch = utterance.match(/(\d{1,2})시/);
  if (!hourMatch) return res.json(replyText("취소할 시간을 인식하지 못했어요. 예: 18시 취소"));

  const hour = `${hourMatch[1]}시`;
  const date = new Date().toISOString().slice(0, 10);

  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 먼저 회원 등록을 해주세요."));

  const { error } = await supabase
    .from("personal_workout_reservations")
    .delete()
    .eq("member_id", member.id)
    .eq("date", date)
    .eq("hour", hour);

  if (error) return res.json(replyText("예약 취소 중 문제가 발생했습니다."));
  return res.json(replyText(`${member.name}님, ${hour} 예약이 취소되었습니다.`));
}