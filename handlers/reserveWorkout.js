import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function reserveWorkout(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 먼저 등록해주세요."));

  const { data: trainers } = await supabase.from("trainers").select("*");
  const trainer = trainers?.[0];
  if (!trainer) return res.json(replyText("트레이너가 아직 등록되지 않았어요."));

  const reserved = new Date();
  reserved.setDate(reserved.getDate() + 1);
  reserved.setHours(10, 0, 0, 0); // 내일 오전 10시

  const { error } = await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    datetime: reserved,
    body_part: "전신"
  });

  if (error) {
    console.error("예약 실패", error);
    return res.json(replyText("예약 중 오류가 발생했어요."));
  }

  return res.json(replyText(`${member.name}님, ${trainer.name} 트레이너와 ${reserved.toLocaleString()}에 예약 완료되었습니다.`));
}
