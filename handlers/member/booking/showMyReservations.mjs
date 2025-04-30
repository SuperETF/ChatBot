// ✅ handlers/member/booking/showMyReservations.mjs

import { supabase } from "../../../services/supabase.mjs";
import { replyText } from "../../../utils/reply.mjs";
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

  const formatted = reservations.map(r =>
    `• ${dayjs(r.reservation_time).format("M월 D일 (ddd) HH시")} (${r.type === "personal" ? "운동" : "기타"})`
  ).join("\n");

  return res.json(replyText(`📅 내 예약 목록:\n\n${formatted}`));
}
