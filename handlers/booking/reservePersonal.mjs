import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";

// ✅ 세션 임시 저장 (메모리 기반, 실제 환경에서는 Redis나 DB도 가능)
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

  const parsed = parseNaturalDateTime(utterance);

// 👉 parse 결과가 배열이라면
if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
  return res.json(replyText("예약할 날짜와 시간을 이해하지 못했어요. 예: '오늘 3시', '수요일 오전 8시'"));
}

const date = parsed[0]; // ✅ 예약은 하나의 날짜만 있으면 됨

  // ✅ 오전/오후가 불명확하면 다시 질문
  if (amOrPmRequired) {
    sessionContext[kakaoId] = {
      type: "pending-am-or-pm",
      member_id: member.id,
      base_time: time.format(), // ISO 문자열
    };
    return res.json(replyText(`${time.format("H시")}는 오전인가요, 오후인가요?`));
  }

  return await confirmReservation(member.id, time, res);
}

// ✅ 확정 예약 로직
export async function confirmReservation(memberId, time, res) {
  const reservationTime = time.toISOString();

  // 같은 시간에 본인 예약 여부 확인
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

  // 예약 등록
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
