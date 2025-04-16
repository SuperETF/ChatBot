import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function cancelPersonalWorkout(kakaoId, utterance, res) {
  const hourMatch = utterance.match(/(\d{1,2})시/);
  if (!hourMatch) {
    return res.json(replyText("취소할 시간을 인식하지 못했어요. 예: 18시 취소"));
  }

  const hour = `${hourMatch[1]}시`;
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  // 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다."));
  }

  // 예약 삭제
  const { error } = await supabase
    .from("personal_workout_reservations")
    .delete()
    .eq("member_id", member.id)
    .eq("date", date)
    .eq("hour", hour);

  if (error) {
    console.error("❌ 예약 취소 실패:", error);
    return res.json(replyText("예약 취소 중 문제가 발생했습니다."));
  }

  return res.json(replyText(`${member.name}님, 오늘 ${hour}에 예약된 개인 운동이 취소되었습니다.`));
}
