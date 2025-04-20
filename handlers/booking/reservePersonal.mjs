import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";
import dayjs from "dayjs";

// ✅ 세션 임시 저장
const sessionContext = {};

export default async function reservePersonal(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  // ✅ 파서 결과 → ISO date list
  const parsed = parseNaturalDateTime(utterance);

  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    return res.json(replyText("예약할 날짜와 시간을 이해하지 못했어요. 예: '오늘 3시', '수요일 오전 8시'"));
  }

  const rawDate = parsed[0];
  const time = dayjs(rawDate);

  // ✅ 오전/오후 명확하지 않으면 멀티턴 전환
  if (time.hour() === 0 || time.hour() === 3 || time.hour() === 5 || time.hour() === 7 || time.hour() === 9) {
    sessionContext[kakaoId] = {
      type: "pending-am-or-pm",
      member_id: member.id,
      base_time: time.format(), // ISO 문자열
    };
    return res.json(replyText(`${time.format("H시")}는 오전인가요, 오후인가요?`));
  }

  return await confirmReservation(member.id, time, res);
}

// ✅ 확정 예약 처리
export async function confirmReservation(memberId, time, res) {
  const reservationTime = time.toISOString();

  // 중복 예약 확인
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", memberId)
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("이미 해당 시간에 개인 운동을 예약하셨습니다."));
  }

  // 예약 인원 수 확인
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  if (count >= 4) {
    return res.json(replyText("해당 시간은 예약이 마감되었습니다. 다른 시간을 선택해주세요."));
  }

  // 예약 저장
  const { error } = await supabase
    .from("reservations")
    .insert({
      member_id: memberId,
      type: "personal",
      reservation_time: reservationTime,
      status: "reserved"
    });

  if (error) {
    return res.json(replyText("예약 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(`✅ ${time.format("M월 D일 HH시")} 개인 운동 예약이 완료되었습니다.`));
}

// ✅ 외부에서 sessionContext 접근 가능하도록 export
export { sessionContext };
