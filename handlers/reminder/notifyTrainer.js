import { supabase } from "../../services/supabase.js";
import { replyText } from "../../utils/reply.js";

export default async function notifyTrainer(trainerId, reservationInfo) {
  const { weekday, start_time, end_time, member_id } = reservationInfo;

  // 1. 트레이너 정보 조회
  const { data: trainer } = await supabase
    .from("trainers")
    .select("name, kakao_id")
    .eq("id", trainerId)
    .maybeSingle();

  if (!trainer || !trainer.kakao_id) {
    console.warn("트레이너 알림 불가: kakao_id 없음");
    return;
  }

  // 2. 회원 정보 조회
  const { data: member } = await supabase
    .from("members")
    .select("name")
    .eq("id", member_id)
    .maybeSingle();

  // 3. 메시지 생성
  const message = `📢 새로운 예약이 등록되었습니다!\n\n회원: ${member?.name}\n일정: ${weekday} ${start_time} ~ ${end_time}`;

  // 4. 전송 로직 (예: replyText로 임시 사용)
  // 실제 서비스에선 카카오톡 푸시, 슬랙, 이메일 등 확장 가능
  console.log("[알림] 트레이너:", trainer.kakao_id, message);

  // 예시: replyText 또는 external send 함수로 대체 가능
  return replyText(message); // 또는: sendToKakao(trainer.kakao_id, message);
}