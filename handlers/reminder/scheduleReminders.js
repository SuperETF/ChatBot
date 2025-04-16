import { supabase } from "../../services/supabase.js";
import { openai } from "../../services/openai.js";
import { replyText } from "../../utils/reply.js";

export default async function scheduleReminders() {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 1);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][targetDate.getDay()];

  // 1. 내일 일정 전체 조회
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, member_id, trainer_id, weekday, start_time, end_time")
    .eq("weekday", weekday);

  if (!schedules || schedules.length === 0) return;

  for (const schedule of schedules) {
    const { member_id, trainer_id, start_time, end_time } = schedule;

    // 2. 회원 조회
    const { data: member } = await supabase
      .from("members")
      .select("name, kakao_id")
      .eq("id", member_id)
      .maybeSingle();

    if (!member?.kakao_id) continue;

    // 3. 특이사항 요청 메시지 전송
    const message = `✅ ${weekday} ${start_time}~${end_time} 운동이 예약되어 있어요!\n\n혹시 컨디션이나 통증 등 특이사항이 있다면 알려주세요.`;

    // ✅ 실제 서비스에서는 메시지를 챗봇/알림 API로 전송
    console.log(`보냄 ▶️ ${member.kakao_id}: ${message}`);

    // 여기선 replyText를 리턴용으로만 표시
    await replyText(message);
  }
}
