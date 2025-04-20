// ✅ handlers/booking/cancelPersonal.mjs

import { supabase } from "../../services/supabase.mjs";
import { parseNaturalDateTime } from "../../utils/parseTime.mjs"; // 실제 이름에 맞춰 수정
import dayjs from "dayjs";

// 간단한 카카오 응답 포맷 빌더들
function replySimpleText(text) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text }
        }
      ]
    }
  };
}

function replyQuickReplies(text, quickReplies = []) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: { text }
        }
      ],
      quickReplies: quickReplies.map((label) => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}

function replyBasicCard({ title, description, thumbnailUrl, buttons = [] }) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title,
            description,
            thumbnail: {
              imageUrl: thumbnailUrl || ""
            },
            buttons: buttons.map((btn) => ({
              label: btn.label,
              action: btn.action,
              messageText: btn.messageText || btn.label,
              webLinkUrl: btn.webLinkUrl || undefined
            }))
          }
        }
      ]
    }
  };
}

// ✅ 예약 취소 세션 임시 저장소
// sessionContext[kakaoId] = {
//   type: "pending-am-or-pm" | "pending-cancel-confirmation",
//   member_id: number,
//   base_time: string (ISO)
// };
export const sessionContext = {};

/**
 * (1) "오늘 3시 예약 취소" 같은 발화가 들어왔을 때 진입
 */
export default async function cancelPersonal(kakaoId, utterance, res) {
  // 1) 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replySimpleText("먼저 회원 등록이 필요합니다."));
  }

  // 2) 시간 파싱
  const parsed = parseNaturalDateTime(utterance);
  if (!parsed || !parsed.time) {
    // 예: “취소 3시에 해줘” 등 정규식 매칭으로 들어왔는데 실제 time을 못 찾음
    return res.json(
      replyQuickReplies("취소할 시간 정보를 이해하지 못했어요. 예: '오늘 3시 예약 취소'", [
        "오늘 3시 취소",
        "내일 오후 2시 취소"
      ])
    );
  }

  const { time, amOrPmRequired } = parsed;

  // 3) 오전/오후가 필요한 경우 → 멀티턴
  if (amOrPmRequired) {
    sessionContext[kakaoId] = {
      type: "pending-am-or-pm",
      member_id: member.id,
      base_time: time.format() // 임시로 ISO 대신 time.format()
    };
    return res.json(replySimpleText(`${time.format("H시")} 예약은 오전인가요, 오후인가요?`));
  }

  // 4) 오전/오후 필요 없이 확실 → 다음 단계(정말 취소?)로
  return askCancelConfirmation(member.id, time, res);
}

/**
 * (2) "pending-am-or-pm" 상태에서 "오전"/"오후"를 입력했을 때
 */
export async function confirmCancelPendingTime(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) {
    // 세션이 없으면 그냥 종료
    return res.json(replySimpleText("취소할 예약이 없습니다. 다시 입력해주세요."));
  }

  const isAm = utterance.includes("오전");
  const isPm = utterance.includes("오후");

  let base = dayjs(session.base_time);
  if (isPm && base.hour() < 12) base = base.add(12, "hour");
  if (isAm && base.hour() >= 12) base = base.subtract(12, "hour");

  delete sessionContext[kakaoId]; // 다 썼으니 제거

  return askCancelConfirmation(session.member_id, base, res);
}

/**
 * (3) “정말 취소하시겠습니까?” 단계
 *     BasicCard로 “네 / 아니오” 버튼 제공
 */
async function askCancelConfirmation(memberId, timeObj, res) {
  // 먼저 해당 예약이 있는지 확인
  const reservationTime = timeObj.toISOString();
  const { data: existing } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("member_id", memberId)
    .eq("type", "personal")
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (!existing || existing.status !== "reserved") {
    return res.json(replySimpleText("해당 시간에 예약된 개인 운동이 없습니다."));
  }

  // 세션 저장: 최종 확인 상태
  sessionContext[memberId] = {
    type: "pending-cancel-confirmation",
    member_id: memberId,
    base_time: timeObj.toISOString(), // 최종 ISO
    reservation_id: existing.id
  };

  // BasicCard “네/아니오” 응답
  return res.json(
    replyBasicCard({
      title: "예약 취소 확인",
      description: `${timeObj.format("M월 D일 HH시")} 예약을 정말 취소하시겠습니까?`,
      buttons: [
        { label: "네", action: "message", messageText: "네" },
        { label: "아니오", action: "message", messageText: "아니오" }
      ]
    })
  );
}

/**
 * (4) "pending-cancel-confirmation" 상태에서 “네” / “아니오” 발화 처리
 */
export async function confirmCancelReservation(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) {
    // 세션이 없다면
    return res.json(replySimpleText("취소 요청이 없습니다. 다시 시도해주세요."));
  }

  const lower = utterance.toLowerCase();
  if (/(네|예|응|ㅇㅇ|맞아|확인)/.test(lower)) {
    // 실제 취소 처리
    const { reservation_id, base_time } = session;
    delete sessionContext[kakaoId];
    return doCancelReservation(reservation_id, dayjs(base_time), res);
  }

  if (/(아니오|ㄴㄴ|아냐|취소|노)/.test(lower)) {
    // 취소하지 않음
    delete sessionContext[kakaoId];
    return res.json(replySimpleText("알겠습니다. 예약 취소를 취소했습니다."));
  }

  // 의도가 불분명하면 QuickReplies
  return res.json(
    replyQuickReplies("정말 이 예약을 취소하시겠습니까?", ["네", "아니오"])
  );
}

/**
 * (5) 실제 DB 업데이트 (status='canceled') 후 응답
 */
async function doCancelReservation(reservationId, timeObj, res) {
  const reservationTime = timeObj.format("M월 D일 HH시");

  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("id", reservationId)
    .eq("status", "reserved")
    .select()
    .maybeSingle();

  if (error) {
    return res.json(replySimpleText("예약 취소 중 문제가 발생했습니다. 다시 시도해주세요."));
  }
  if (!data) {
    // 이미 취소됐거나 없는 예약
    return res.json(replySimpleText("이미 취소된 예약이거나 찾을 수 없습니다."));
  }

  return res.json(replySimpleText(`❌ ${reservationTime} 예약이 취소되었습니다.`));
}
