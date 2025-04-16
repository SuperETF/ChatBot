// ✅ handlers/reservePersonalWorkout.js

import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function reservePersonalWorkout(kakaoId, utterance, res) {
  const hourMatch = utterance.match(/(\d{1,2})시/);
  if (!hourMatch) {
    return res.json(replyText("예약할 시간을 인식하지 못했어요. 예: 18시 예약"));
  }

  const hour = `${hourMatch[1]}시`;
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  // 회원 식별
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", ["회원 등록"]));
  }

  // 예약 인원 확인 (ex: 최대 5명)
  const { count } = await supabase
    .from("personal_workout_reservations")
    .select("*", { count: "exact", head: true })
    .eq("date", date)
    .eq("hour", hour);

  if (count >= 5) {
    return res.json(replyText(`❌ ${hour}에는 이미 예약이 마감되었습니다. 다른 시간을 선택해주세요.`));
  }

  // 중복 예약 방지
  const { data: duplicate } = await supabase
    .from("personal_workout_reservations")
    .select("id")
    .eq("member_id", member.id)
    .eq("date", date)
    .eq("hour", hour)
    .maybeSingle();

  if (duplicate) {
    return res.json(replyText(`이미 ${hour}에 개인 운동을 예약하셨어요.`));
  }

  // 예약 저장
  const { error } = await supabase
    .from("personal_workout_reservations")
    .insert({
      member_id: member.id,
      date,
      hour
    });

  if (error) {
    console.error("❌ 예약 저장 실패:", error);
    return res.json(replyText("예약 중 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(replyText(
    `✅ ${member.name}님, 오늘 ${hour}에 개인 운동 예약이 완료되었습니다.\n현재까지 예약 인원: ${count + 1}명`
  ));
}

