// ✅ handlers/assignment.js 업데이트 (날짜 포함 과제 등록)
import { supabase } from "../services/supabase.js";
import { replyText } from "../utils/reply.js";

function extractDatesFromText(text) {
  const today = new Date();
  const dates = [];

  if (/내일/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    dates.push(d);
  }
  if (/격일/.test(text)) {
    for (let i = 0; i < 7; i += 2) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
  }

  const manualDates = [...text.matchAll(/(\d{1,2})월\s?(\d{1,2})일/g)];
  for (const match of manualDates) {
    const d = new Date();
    d.setMonth(parseInt(match[1]) - 1);
    d.setDate(parseInt(match[2]));
    dates.push(d);
  }

  return dates;
}

export async function assignWorkout(kakaoId, utterance, res) {
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!trainer) {
    return res.json(replyText("트레이너 인증 정보가 없습니다."));
  }

  const nameMatch = utterance.match(/[가-힣]{2,4}/);
  const title = utterance.replace(nameMatch?.[0], "").trim();

  if (!nameMatch || title.length < 3) {
    return res.json(replyText("과제를 줄 회원의 이름과 과제 내용을 함께 입력해주세요. 예: 김복두, 하루 팔굽혀펴기 50개"));
  }

  const name = nameMatch[0];

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .eq("trainer_id", trainer.id)
    .maybeSingle();

  if (!member) {
    return res.json(replyText(`${name}님은 당신의 회원이 아니거나 존재하지 않습니다.`));
  }

  const dates = extractDatesFromText(utterance);

  const { data: assignment, error } = await supabase.from("personal_assignments").insert({
    member_id: member.id,
    trainer_id: trainer.id,
    title,
    status: "대기"
  }).select().single();

  if (error) {
    console.error("과제 저장 실패:", error);
    return res.json(replyText("과제 저장 중 문제가 발생했습니다."));
  }

  // 날짜 테이블 저장
  for (const date of dates) {
    await supabase.from("assignment_schedules").insert({
      assignment_id: assignment.id,
      target_date: date.toISOString().slice(0, 10)
    });
  }

  return res.json(replyText(`✅ ${name}님에게 과제가 성공적으로 등록되었습니다.\n[${title}]\n📅 지정일: ${dates.map(d => d.toLocaleDateString()).join(", ") || "오늘"}`));
}
