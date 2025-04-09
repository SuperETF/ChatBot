import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

export default async function reserveWorkout(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 등록이 필요해요."));

  const { data: trainers } = await supabase.from("trainers").select("*");
  const trainer = trainers?.[0];
  if (!trainer) return res.json(replyText("등록된 트레이너가 없습니다."));

  const reserved = new Date();
  reserved.setDate(reserved.getDate() + 1);
  reserved.setHours(10, 0, 0, 0);

  const { error } = await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    datetime: reserved,
    body_part: "전신"
  });

  if (error) return res.json(replyText("예약 중 문제가 발생했습니다."));
  return res.json(replyText(`${member.name}님, ${trainer.name} 트레이너와\n${reserved.toLocaleString()}에 예약 완료!`));
}
