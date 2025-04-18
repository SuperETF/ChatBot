import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseNaturalDateTime } from "../../utils/parseTime.mjs";

// ✅ 예약 취소 세션 임시 저장소
const sessionContext = {};

export default async function cancelPersonal(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  const parsed = parseNaturalDateTime(utterance);
  if (!parsed || !parsed.time) {
    return res.json(replyText("취소할 시간 정보를 이해하지 못했어요. 예: '오늘 3시 예약 취소'"));
  }

  const { time, amOrPmRequired } = parsed;

  if (amOrPmRequired) {
    sessionContext[kakaoId] = {
      type: "pending-cancel-confirmation",
      member_id: member.id,
      base_time: time.format()
    };
    return res.json(replyText(`${time.format("H시")} 예약은 오전인가요, 오후인가요?`));
  }

  return await confirmCancelReservation(member.id, time, res);
}

export async function confirmCancelReservation(memberId, time, res) {
  const reservationTime = time.toISOString();

  const { data: existing } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("member_id", memberId)
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved")
    .maybeSingle();

  if (!existing) {
    return res.json(replyText("해당 시간에 예약된 개인 운동이 없습니다."));
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("id", existing.id);

  if (error) {
    return res.json(replyText("예약 취소 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`❌ ${time.format("M월 D일 HH시")} 예약이 취소되었습니다.`));
}

export { sessionContext };
