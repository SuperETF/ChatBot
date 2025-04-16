// handlers/booking/confirmReservation.mjs
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function confirmReservation(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 인증 정보가 없습니다."));
  }

  const { data: trainers } = await supabase.from("trainers").select("id, name");
  const trainer = trainers?.[0];

  if (!trainer) {
    return res.json(replyText("트레이너 정보를 불러올 수 없습니다."));
  }

  const match = utterance.match(/([월화수목금토일])\s(\d{2}:\d{2})\s~\s(\d{2}:\d{2})/);
  if (!match) {
    return res.json(replyText("선택하신 시간 형식을 이해하지 못했어요. 다시 선택해주세요."));
  }

  const [_, weekday, start_time, end_time] = match;

  const { data: existing } = await supabase
    .from("schedules")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("weekday", weekday)
    .eq("start_time", start_time)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("죄송합니다. 해당 시간은 이미 예약되었습니다."));
  }

  const { error } = await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    weekday,
    start_time,
    end_time,
    status: "확정"
  });

  if (error) {
    console.error("레슨 예약 중 오류:", error);
    return res.json(replyText("레슨 예약 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  // ✅ 사용자에게 안내
  await res.json(replyText(`✅ ${member.name}님, ${weekday} ${start_time} ~ ${end_time} 레슨이 예약되었습니다.`));

  // ✅ 콘솔 기반 트레이너 알림 로그 (추후 전송 연동 가능)
  console.log(`📢 트레이너 알림: ${member.name}님이 ${weekday} ${start_time}~${end_time} 레슨 예약함`);
}