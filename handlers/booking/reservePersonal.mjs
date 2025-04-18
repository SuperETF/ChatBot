import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseNaturalDateTime } from "../../utils/parseTime.mjs";

export default async function reservePersonal(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  const time = parseNaturalDateTime(utterance);
  if (!time) {
    return res.json(replyText("날짜와 시간을 이해하지 못했어요. 예: '오늘 3시'"));
  }

  const reservationTime = time.toISOString();

  // 중복 체크 (자기 예약 중복 방지)
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", member.id)
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("이미 해당 시간에 개인 운동이 예약되어 있습니다."));
  }

  // 인원 체크
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  if (count >= 4) {
    return res.json(replyText("해당 시간은 예약이 마감되었습니다. 다른 시간을 선택해주세요."));
  }

  // 예약 생성
  const { error } = await supabase
    .from("reservations")
    .insert({
      member_id: member.id,
      type: "personal",
      reservation_time: reservationTime,
      status: "reserved"
    });

  if (error) {
    return res.json(replyText("예약 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${time.format("M월 D일 HH시")} 개인 운동 예약이 완료되었습니다.`));
}
