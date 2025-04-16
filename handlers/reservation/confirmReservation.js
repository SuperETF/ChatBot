import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function confirmReservation(kakaoId, utterance, res) {
  // 1. 회원 조회
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보가 없습니다. 먼저 등록을 완료해주세요."));
  }

  // 2. 트레이너 조회 (임시: 첫 번째 트레이너)
  const { data: trainers } = await supabase.from("trainers").select("id, name");
  const trainer = trainers?.[0];
  if (!trainer) return res.json(replyText("트레이너 정보를 불러올 수 없습니다."));

  // 3. utterance 예시: "화 18:00 ~ 19:00"
  const match = utterance.match(/([월화수목금토일])\s(\d{2}:\d{2})\s~\s(\d{2}:\d{2})/);
  if (!match) return res.json(replyText("선택하신 시간 형식을 이해하지 못했어요. 다시 선택해주세요."));

  const weekday = match[1];
  const start_time = match[2];
  const end_time = match[3];

  // 4. 중복 예약 확인
  const { data: existing } = await supabase
    .from("schedules")
    .select("id")
    .eq("trainer_id", trainer.id)
    .eq("weekday", weekday)
    .eq("start_time", start_time)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("죄송합니다. 해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요."));
  }

  // 5. 예약 저장
  const { error } = await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    weekday,
    start_time,
    end_time,
    status: "확정"
  });

  if (error) {
    console.error("❌ 예약 실패:", error);
    return res.json(replyText("예약 중 오류가 발생했어요. 다시 시도해주세요."));
  }

  return res.json(replyText(`${member.name}님, ${weekday} ${start_time} ~ ${end_time} 레슨이 예약되었습니다.`));
}