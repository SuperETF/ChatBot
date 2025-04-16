// handlers
import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";

export default async function reservePersonal(kakaoId, utterance, res) {
  const hourMatch = utterance.match(/(\d{1,2})시/);
  if (!hourMatch) return res.json(replyText("예약할 시간을 인식하지 못했어요. 예: 18시 예약"));

  const hour = `${hourMatch[1]}시`;
  const date = new Date().toISOString().slice(0, 10);

  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 먼저 회원 등록을 해주세요."));

  const { count } = await supabase
    .from("personal_workout_reservations")
    .select("*", { count: "exact", head: true })
    .eq("date", date)
    .eq("hour", hour);

  if (count >= 5) return res.json(replyText(`${hour}에는 예약이 마감되었습니다.`));

  const { data: duplicate } = await supabase
    .from("personal_workout_reservations")
    .select("id")
    .eq("member_id", member.id)
    .eq("date", date)
    .eq("hour", hour)
    .maybeSingle();

  if (duplicate) return res.json(replyText(`이미 ${hour}에 개인 운동을 예약하셨어요.`));

  await supabase.from("personal_workout_reservations").insert({
    member_id: member.id,
    date,
    hour
  });

  return res.json(replyText(`✅ ${member.name}님, 오늘 ${hour} 개인 운동 예약이 완료되었습니다.`));
}