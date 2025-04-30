// ✅ handlers/member/booking/showCancelableReservations.mjs
import { supabase } from "../../../services/supabase.mjs";
import { replyQuickReplies, replyText } from "../../../utils/reply.mjs";
import dayjs from "dayjs";

export const cancelContext = {};

export default async function showCancelableReservations(kakaoId, utterance, res) {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, reservation_time")
    .eq("member_id", member.id)
    .eq("status", "reserved")
    .order("reservation_time", { ascending: true });

  if (!reservations || reservations.length === 0) {
    return res.json(replyText("현재 예약된 일정이 없습니다."));
  }

  cancelContext[kakaoId] = {
    flow: "cancel-waiting",
    options: reservations.reduce((acc, r) => {
      const label = dayjs(r.reservation_time).format("YYYY-MM-DD HH:mm");
      acc[r.id] = label;
      return acc;
    }, {})
  };

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text: "❌ 취소할 시간을 선택하세요:" }
        }
      ],
      quickReplies: reservations.map(r => {
        const label = dayjs(r.reservation_time).format("YYYY-MM-DD HH:mm");
        return {
          label,
          action: "message",
          messageText: r.id.toString()
        };
      })
    }
  });
}