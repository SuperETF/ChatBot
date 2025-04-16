import { supabase } from "../../services/supabase.mjs";
import { replyText } from "../../utils/reply.mjs";
import {
  parseDateTimeFromText,
  parseDateRangeFromText
} from "../../utils/parseDateUtils.mjs";

export default async function assignWorkout(kakaoId, utterance, res) {
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

  // 🔍 자연어 날짜 추출
  const rangeDates = parseDateRangeFromText(utterance);
  const singleDates = parseDateTimeFromText(utterance);
  const scheduleDates = rangeDates.length > 0 ? rangeDates : singleDates;

  const { data: assignment, error } = await supabase
    .from("personal_assignments")
    .insert({
      member_id: member.id,
      trainer_id: trainer.id,
      title,
      status: "대기"
    })
    .select()
    .single();

  if (error || !assignment?.id) {
    console.error("❌ assignWorkout insert 실패", error);
    return res.json(replyText("과제 저장 중 문제가 발생했습니다."));
  }

  console.log("✅ 과제 등록 성공:", assignment);

  for (const { date, time } of scheduleDates) {
    const { error: scheduleError } = await supabase
      .from("assignment_schedules")
      .insert({
        assignment_id: assignment.id,
        target_date: date,
        target_time: time || null // ⚠️ Supabase에 컬럼 추가 필요
      });

    if (scheduleError) {
      console.error("❌ 일정 등록 실패:", scheduleError);
    }
  }

  return res.json(replyText(
    `✅ ${name}님에게 과제가 성공적으로 등록되었습니다.\n[${title}]\n📅 지정일: ${scheduleDates.map(d => d.date + (d.time ? ` ${d.time}` : '')).join(", ")}`
  ));
}
