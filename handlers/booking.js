import { openai } from "../services/openai.js";
import { supabase } from "../services/supabase.js";
import { replyText, replyButton } from "../utils/reply.js";

export default async function booking(kakaoId, utterance, res, action) {
  // 1. 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", ["회원 등록"]));
  }

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
      if (!hourMatch) return res.json(replyText("예약할 시간을 인식하지 못했어요. 예: 18시 예약"));

      const hour = `${hourMatch[1]}시`;
      const date = new Date().toISOString().slice(0, 10);

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

    case "cancelPersonal": {
      const hourMatch = utterance.match(/(\d{1,2})시/);
      if (!hourMatch) return res.json(replyText("취소할 시간을 인식하지 못했어요. 예: 18시 취소"));

      const hour = `${hourMatch[1]}시`;
      const date = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from("personal_workout_reservations")
        .delete()
        .eq("member_id", member.id)
        .eq("date", date)
        .eq("hour", hour);

      if (error) return res.json(replyText("예약 취소 중 문제가 발생했습니다."));

      return res.json(replyText(`${member.name}님, ${hour} 예약이 취소되었습니다.`));
    }

    case "showTrainerSlots": {
      const { data: trainers } = await supabase.from("trainers").select("id, name");
      const trainer = trainers?.[0];

      if (!trainer) return res.json(replyText("등록된 트레이너가 없습니다."));

      const { data: slots } = await supabase
        .from("trainer_availability")
        .select("weekday, start_time, end_time")
        .eq("trainer_id", trainer.id);

      if (!slots || slots.length === 0) {
        return res.json(replyText("예약 가능한 레슨 시간이 없습니다."));
      }

      const slotButtons = slots.map(slot =>
        `${slot.weekday} ${slot.start_time.slice(0, 5)} ~ ${slot.end_time.slice(0, 5)}`
      );

      return res.json(replyButton("다음 중 가능한 레슨 시간을 선택해주세요:", slotButtons));
    }

    case "confirmReservation": {
      const { data: trainers } = await supabase.from("trainers").select("id, name");
      const trainer = trainers?.[0];
      if (!trainer) return res.json(replyText("트레이너 정보를 불러올 수 없습니다."));

      const match = utterance.match(/([월화수목금토일])\s(\d{2}:\d{2})\s~\s(\d{2}:\d{2})/);
      if (!match) return res.json(replyText("선택하신 시간 형식을 이해하지 못했어요. 다시 선택해주세요."));

      const [_, weekday, start_time, end_time] = match;

      const { data: existing } = await supabase
        .from("schedules")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("weekday", weekday)
        .eq("start_time", start_time)
        .maybeSingle();

      if (existing) return res.json(replyText("죄송합니다. 해당 시간은 이미 예약되었습니다."));

      const { error } = await supabase.from("schedules").insert({
        member_id: member.id,
        trainer_id: trainer.id,
        weekday,
        start_time,
        end_time,
        status: "확정"
      });

      if (error) return res.json(replyText("레슨 예약 중 문제가 발생했습니다. 다시 시도해주세요."));

      return res.json(replyText(`${member.name}님, ${weekday} ${start_time} ~ ${end_time} 레슨이 예약되었습니다.`));
    }

    case "registerAvailability": {
      const { data: trainer } = await supabase
        .from("trainers")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (!trainer) {
        return res.json(replyText("트레이너 인증 정보가 없습니다."));
      }

      const prompt = `
다음 문장에서 요일과 시간 범위를 JSON 형식으로 추출해줘.
형식 예시:
[
  { "weekday": "월", "start_time": "18:00", "end_time": "19:00" },
  { "weekday": "화", "start_time": "15:00", "end_time": "20:00" }
]

문장: "${utterance}"
`;

      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      });

      let slots;
      try {
        slots = JSON.parse(result.choices[0].message.content.trim());
      } catch (e) {
        return res.json(replyText("입력 형식을 이해하지 못했어요. 다시 입력해주세요."));
      }

      const inserts = slots.map(slot => ({
        trainer_id: trainer.id,
        weekday: slot.weekday,
        start_time: slot.start_time,
        end_time: slot.end_time
      }));

      const { error } = await supabase.from("trainer_availability").insert(inserts);

      if (error) return res.json(replyText("가용 시간 저장 중 문제가 발생했습니다."));

      return res.json(replyText(`✅ 다음 시간들이 저장되었습니다:\n${slots.map(s => `${s.weekday} ${s.start_time}~${s.end_time}`).join("\n")}`));
    }

    default:
      return res.json(replyText("아직 준비되지 않은 예약 기능입니다."));
  }
}
