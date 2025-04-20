// ✅ handlers/booking/showMyReservations.mjs
import dayjs from "dayjs";
import { supabase } from "../../services/supabase.mjs";
import { replyBasicCard, replyText, replyQuickReplies } from "../../utils/reply.mjs";

export default async function showMyReservations(kakaoId, utterance, res) {
  // 1) 회원 여부 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  // 2) 예약 목록 조회
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("type, reservation_time")
    .eq("member_id", member.id)
    .eq("status", "reserved")
    .order("reservation_time", { ascending: true });

  if (error) {
    return res.json(replyText("예약 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."));
  }

  // 예약 없으면
  if (!reservations || reservations.length === 0) {
    // 원하는 경우 QuickReplies로 "새 예약" 버튼 제공
    return res.json(
      replyQuickReplies("현재 예약된 일정이 없습니다.", ["새 예약"])
    );
  }

  // 3) 개인 운동, 1:1 레슨 분류
  const personalList = reservations
    .filter(r => r.type === "personal")
    .map(r => `• ${dayjs(r.reservation_time).format("M월 D일 HH시")}`)
    .join("\n");

  const lessonList = reservations
    .filter(r => r.type === "lesson")
    .map(r => `• ${dayjs(r.reservation_time).format("M월 D일 HH시")}`)
    .join("\n");

  // 4) 메인 안내 문구 구성
  let description = "📋 예약 내역입니다.\n";

  if (personalList) {
    description += `\n🏋️‍♂️ 개인 운동:\n${personalList}`;
  }
  if (lessonList) {
    description += `\n\n👥 1:1 레슨:\n${lessonList}`;
  }

  // 5) BasicCard + QuickReplies 조합
  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title: "내 예약 일정",
            description,
            buttons: [
              {
                label: "새 예약",
                action: "message",
                messageText: "운동 예약"
              },
              {
                label: "예약 취소",
                action: "message",
                messageText: "예약 취소"
              }
            ]
          }
        }
      ],
      quickReplies: [
        {
          label: "메인 메뉴",
          action: "message",
          messageText: "메인"
        }
      ]
    }
  });
}
