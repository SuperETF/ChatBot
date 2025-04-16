// handlers/booking/confirmReservation.mjs (요일+날짜 기반 대응 개선)
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

  const match = utterance.match(/([월화수목금토일])\s*\((\d{4}-\d{2}-\d{2})\)\s(\d{2}:\d{2})\s~\s(\d{2}:\d{2})/);
  if (!match) {
    return res.json(replyText("선택하신 시간 형식을 이해하지 못했어요. 다시 선택해주세요."));
  }

  const [_, weekday, date, start_time, end_time] = match;

  const { data: existing } = await supabase
    .from("schedules")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("date", date)
    .eq("start_time", start_time)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("죄송합니다. 해당 시간은 이미 예약되었습니다."));
  }

  const { error } = await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    date,
    start_time,
    end_time,
    status: "확정"
  });

  if (error) {
    console.error("레슨 예약 중 오류:", error);
    return res.json(replyText("레슨 예약 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  console.log(`📢 트레이너 알림: ${member.name}님이 ${date} ${start_time}~${end_time} 레슨 예약함`);
  return res.json(replyText(`✅ ${member.name}님, ${date} ${start_time} ~ ${end_time} 레슨이 예약되었습니다.`));
}