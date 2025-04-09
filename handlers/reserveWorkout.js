import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function reserveWorkout(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("*")
    .eq("kakao_id", kakaoId)
    .single();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", [
      "회원 등록", "상담 연결"
    ]));
  }

  const { data: trainers } = await supabase.from("trainers").select("*");
  const trainer = trainers?.[0];

  const reserved = new Date();
  reserved.setDate(reserved.getDate() + 1);
  reserved.setHours(10, 0, 0, 0);

  await supabase.from("schedules").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    datetime: reserved,
    body_part: "전신"
  });

  return res.json(replyText(`${member.name}님, ${trainer.name} 트레이너와\n${reserved.toLocaleString()}에 예약 완료되었습니다.`));
}
