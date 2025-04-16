// handlers/booking/showMyReservations.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function showMyReservations(kakaoId, utterance, res) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 인증 정보가 없습니다."));
  }

  const { data: reservations } = await supabase
    .from("personal_workout_reservations")
    .select("hour")
    .eq("member_id", member.id)
    .eq("date", today);

  if (!reservations || reservations.length === 0) {
    return res.json(replyText(`${member.name}님은 오늘 예약된 시간이 없습니다.`));
  }

  const hours = reservations.map(r => `• ${r.hour}`).join("\n");
  return res.json(replyText(`✅ ${member.name}님의 오늘 예약된 시간:\n${hours}`));
}