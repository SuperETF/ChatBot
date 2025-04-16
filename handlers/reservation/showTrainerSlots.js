import { supabase } from "../../services/supabase.js";
import { replyButton, replyText } from "../../utils/reply.js";

export default async function showTrainerSlots(kakaoId, res) {
  // 1. 회원 조회
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyButton("회원 정보를 찾을 수 없습니다. 등록하시겠어요?", ["회원 등록"]));
  }

  // 2. trainer_availability 전체 조회 (일단 첫 번째 트레이너 기준)
  const { data: trainers } = await supabase.from("trainers").select("id, name");
  const trainer = trainers?.[0];

  if (!trainer) {
    return res.json(replyText("등록된 트레이너가 없습니다."));
  }

  const { data: slots } = await supabase
    .from("trainer_availability")
    .select("weekday, start_time, end_time")
    .eq("trainer_id", trainer.id);

  if (!slots || slots.length === 0) {
    return res.json(replyText("예약 가능한 시간이 없습니다. 트레이너가 아직 일정을 등록하지 않았습니다."));
  }

  // 3. 버튼 형식으로 변환
  const slotButtons = slots.map(slot =>
    `${slot.weekday} ${slot.start_time.substring(0, 5)} ~ ${slot.end_time.substring(0, 5)}`
  );

  // 4. 세션에 저장 (선택한 시간 확인 시 쓸 수 있음)
  // 선택한 시간은 이후 confirmReservation.js에서 처리

  return res.json(replyButton("다음 중 가능한 레슨 시간을 선택해주세요:", slotButtons));
}
