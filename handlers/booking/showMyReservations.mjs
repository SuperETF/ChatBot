import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import dayjs from "dayjs";

export default async function showMyReservations(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("type, reservation_time")
    .eq("member_id", member.id)
    .eq("status", "reserved")
    .order("reservation_time", { ascending: true });

  if (!reservations || reservations.length === 0) {
    return res.json(replyText("현재 예약된 일정이 없습니다."));
  }

  const personal = reservations
    .filter(r => r.type === "personal")
    .map(r => `• ${dayjs(r.reservation_time).format("M월 D일 HH시")}`)
    .join("\n");

  const lessons = reservations
    .filter(r => r.type === "lesson")
    .map(r => `• ${dayjs(r.reservation_time).format("M월 D일 HH시")}`)
    .join("\n");

  let reply = "📋 예약 내역입니다.\n";

  if (personal) reply += `\n🏋️‍♂️ 개인 운동:\n${personal}`;
  if (lessons) reply += `\n\n👥 1:1 레슨:\n${lessons}`;

  return res.json(replyText(reply));
}
