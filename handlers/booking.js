// ✅ handlers/booking.js
import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function booking(kakaoId, utterance, res, action) {
  // 1. 회원 식별
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", ["회원 등록"]));
  }

  // 2. 액션별 처리 분기
  switch (action) {
    case "showPersonalSlots": {
      const today = new Date();
      const date = today.toISOString().slice(0, 10);
      const hours = ["18시", "19시", "20시", "21시"];

      const buttons = [];
      for (const hour of hours) {
        const { count } = await supabase
          .from("personal_workout_reservations")
          .select("*", { count: "exact", head: true })
          .eq("date", date)
          .eq("hour", hour);
        buttons.push(`${hour} (예약: ${count}명)`);
      }

      return res.json(replyButton("오늘 예약 가능한 시간대입니다:", buttons));
    }

    case "reservePersonal": {
      const hourMatch = utterance.match(/(\d{1,2})시/);
      if (!hourMatch) {
        return res.json(replyText("예약할 시간을 인식하지 못했어요. 예: 18시 예약"));
      }
      const hour = `${hourMatch[1]}시`;
      const today = new Date();
      const date = today.toISOString().slice(0, 10);

      const { count } = await supabase
        .from("personal_workout_reservations")
        .select("*", { count: "exact", head: true })
        .eq("date", date)
        .eq("hour", hour);

      if (count >= 5) {
        return res.json(replyText(`❌ ${hour}에는 이미 예약이 마감되었습니다.`));
      }

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

      await supabase.from("personal_workout_reservations").insert({
        member_id: member.id,
        date,
        hour
      });

      return res.json(replyText(`✅ ${member.name}님, 오늘 ${hour}에 개인 운동 예약이 완료되었습니다.\n현재까지 예약 인원: ${count + 1}명`));
    }

    case "cancelPersonal": {
      const hourMatch = utterance.match(/(\d{1,2})시/);
      if (!hourMatch) {
        return res.json(replyText("취소할 시간을 인식하지 못했어요. 예: 18시 취소"));
      }
      const hour = `${hourMatch[1]}시`;
      const today = new Date();
      const date = today.toISOString().slice(0, 10);

      await supabase
        .from("personal_workout_reservations")
        .delete()
        .eq("member_id", member.id)
        .eq("date", date)
        .eq("hour", hour);

      return res.json(replyText(`${member.name}님, 오늘 ${hour} 예약이 취소되었습니다.`));
    }

    default:
      return res.json(replyText("아직 준비되지 않은 예약 기능입니다."));
  }
}
