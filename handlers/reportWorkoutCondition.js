// ✅ handlers/reportWorkoutCondition.js (4단계: 특이사항 수집 및 전달)
import { supabase } from "../services/supabase.js";
import { openai } from "../services/openai.js";
import { replyText } from "../utils/reply.js";

export async function reportWorkoutCondition(kakaoId, utterance, res) {
  // 1. 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id, name")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("회원 정보를 찾을 수 없습니다."));
  }

  // 2. 최근 완료된 과제 가져오기
  const { data: assignment } = await supabase
    .from("personal_assignments")
    .select("id, trainer_id, title")
    .eq("member_id", member.id)
    .eq("status", "완료")
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) {
    return res.json(replyText("완료된 과제를 찾을 수 없습니다."));
  }

  // 3. GPT로 특이사항 요약
  const gptRes = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "운동 중 특이사항을 짧고 명확하게 요약해줘." },
      { role: "user", content: utterance }
    ],
    temperature: 0.3
  });

  const summary = gptRes.choices[0].message.content.trim();

  // 4. notes 저장
  await supabase
    .from("personal_assignments")
    .update({ notes: summary })
    .eq("id", assignment.id);

  // 5. 트레이너에게 전달
  const { data: trainer } = await supabase
    .from("trainers")
    .select("kakao_id")
    .eq("id", assignment.trainer_id)
    .maybeSingle();

  if (trainer?.kakao_id) {
    console.log(`📩 ${trainer.kakao_id}에게 전달됨 → ${member.name} 특이사항 요약: ${summary}`);
  }

  return res.json(replyText("📮 특이사항이 트레이너에게 전달되었습니다. 수고하셨어요!"));
}