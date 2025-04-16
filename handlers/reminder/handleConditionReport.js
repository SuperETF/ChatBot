import { supabase } from "../../services/supabase.js";
import { openai } from "../../services/openai.js";
import { replyText } from "../../utils/reply.js";

export default async function handleConditionReport(kakaoId, utterance, res) {
  // 1. 회원 찾기
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("회원 정보가 없습니다. 먼저 등록을 완료해주세요."));

  // 2. 오늘 예약된 트레이너 찾기
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, trainer_id, start_time, end_time")
    .eq("member_id", member.id)
    .eq("weekday", weekday)
    .maybeSingle();

  if (!schedule) return res.json(replyText("오늘 예약된 일정이 없습니다."));

  // 3. GPT로 특이사항 요약
  const gptRes = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "다음 문장을 간단한 운동 관련 특이사항 요약으로 정리해줘." },
      { role: "user", content: utterance }
    ],
    temperature: 0.2
  });

  const summary = gptRes.choices[0].message.content.trim();

  // 4. 트레이너 조회
  const { data: trainer } = await supabase
    .from("trainers")
    .select("kakao_id, name")
    .eq("id", schedule.trainer_id)
    .maybeSingle();

  if (!trainer?.kakao_id) return res.json(replyText("트레이너 알림을 보낼 수 없습니다."));

  // 5. 트레이너에게 요약 전달 (로그용 또는 알림 API 연동 가능)
  const notify = `📢 ${member.name}님의 특이사항 보고:\n\n${summary}`;
  console.log(`보냄 ▶️ ${trainer.kakao_id}: ${notify}`);

  return res.json(replyText("특이사항이 정상적으로 전달되었습니다. 감사합니다."));
}