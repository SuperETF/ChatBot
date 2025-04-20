// ✅ handlers/booking/reservePersonal.mjs

import dayjs from "dayjs";
import { supabase } from "../../services/supabase.mjs";
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";

// ■ Kakao 응답 포맷 빌더 예시들
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
              action: btn.action, // 'message', 'webLink', etc.
              messageText: btn.messageText || btn.label,
              webLinkUrl: btn.webLinkUrl || undefined
            }))
          }
        }
      ]
    }
  };
}

// 예약 세션 상태 저장
// 세션 구조 예시:
//  sessionContext[kakaoId] = {
//    type: "pending-am-or-pm" | "pending-confirm" | ...,
//    member_id: number,
//    base_time: string (ISO),
//    tempDate: ...,
//    tempTime: ...
//  };
export const sessionContext = {};

// ■ 예약을 처리하는 메인 함수
export async function reservePersonal(kakaoId, utterance, res) {
  // 1) 우선 회원인지 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replySimpleText("먼저 회원 등록이 필요합니다."));
  }

  // 2) parseNaturalDateTime 사용해 날짜/시간 파싱
  const parsedDates = parseNaturalDateTime(utterance);
  if (!parsedDates || parsedDates.length === 0) {
    // 멀티턴 분기: 날짜를 다시 물어봄
    sessionContext[kakaoId] = { type: "pending-date", member_id: member.id };
    return res.json(replyQuickReplies("언제 운동을 예약하시겠어요?", ["오늘 3시", "내일 오후 2시"]));
  }

  /**
   * parseNaturalDateTime.mjs는 예시로 여러 날짜(배열)를 반환하도록 설계했는데,
   * 여기서는 단일 날짜만 쓴다고 가정하고 첫 번째만 사용
   */
  const isoDate = parsedDates[0]; // "YYYY-MM-DD" 형태
  // 시간만 추출했다면 base_time을 세팅하거나, 필요 시 추가 로직
  // 여기서는 간단히 dayjs로 변환
  const finalTime = dayjs(isoDate);

  // 최종 예약 확정 전 BasicCard로 확인
  sessionContext[kakaoId] = {
    type: "pending-confirm",
    member_id: member.id,
    base_time: finalTime.toISOString()
  };

  // BasicCard 예시
  return res.json(
    replyBasicCard({
      title: "운동 예약 확인",
      description: `${finalTime.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
      thumbnailUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Dumbbell_Icon.svg/640px-Dumbbell_Icon.svg.png",
      buttons: [
        { label: "네", action: "message", messageText: "네" },
        { label: "다른 시간", action: "message", messageText: "아니오" }
      ]
    })
  );
}

// ■ 멀티턴 후속 처리: 오전/오후 확인, 최종 확인 등
export async function handleMultiTurnReserve(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) {
    return res.json(replySimpleText("새로운 예약을 원하시면 '예약'이라고 입력해주세요."));
  }

  switch (session.type) {
    // 날짜 물어본 상태
    case "pending-date": {
      const parsedDates = parseNaturalDateTime(utterance);
      if (!parsedDates || parsedDates.length === 0) {
        return res.json(replySimpleText("날짜/시간을 제대로 인식하지 못했어요. 예: '내일 오후 3시'"));
      }
      const isoDate = parsedDates[0];
      session.type = "pending-confirm";
      session.base_time = dayjs(isoDate).toISOString();

      return res.json(
        replyBasicCard({
          title: "운동 예약 확인",
          description: `${dayjs(isoDate).format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
          buttons: [
            { label: "네", action: "message", messageText: "네" },
            { label: "아니오", action: "message", messageText: "아니오" }
          ]
        })
      );
    }

    // 최종 확인
    case "pending-confirm": {
      const lowerUtt = utterance.toLowerCase();
      if (/(네|확인|응|ㅇㅇ|예)/.test(lowerUtt)) {
        // 예약 확정
        const finalTime = dayjs(session.base_time);
        const memberId = session.member_id;
        delete sessionContext[kakaoId];

        return confirmReservation(memberId, finalTime, res);
      } else if (/(아니오|아냐|노|취소|ㄴㄴ)/.test(lowerUtt)) {
        delete sessionContext[kakaoId];
        return res.json(replySimpleText("예약을 취소했습니다. 다른 시간이 필요하면 말씀해주세요."));
      } else {
        // 의도가 명확치 않으면 퀵 리플라이
        return res.json(
          replyQuickReplies("예약을 확정할까요?", ["네", "아니오"])
        );
      }
    }

    default:
      // 그 외 상태 초기화
      delete sessionContext[kakaoId];
      return res.json(replySimpleText("예약 흐름이 초기화되었습니다. 다시 시도해주세요."));
  }
}

// ■ 실제 예약 insert 처리
export async function confirmReservation(memberId, time, res) {
  const reservationTime = time.toISOString();

  // 중복 예약 확인
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", memberId)
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replySimpleText("이미 해당 시간에 운동 예약이 되어 있습니다."));
  }

  // 예약 인원 제한 (예: 4명)
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  if (count >= 4) {
    return res.json(replySimpleText("해당 시간은 이미 예약이 마감되었습니다. 다른 시간을 선택해주세요."));
  }

  // 실제 DB insert
  const { error } = await supabase
    .from("reservations")
    .insert({
      member_id: memberId,
      reservation_time: reservationTime,
      status: "reserved",
      type: "personal"
    });

  if (error) {
    return res.json(replySimpleText("예약 과정에서 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(
    replySimpleText(
      `✅ ${time.format("M월 D일 (ddd) HH시")} 예약이 완료되었습니다.\n운동복과 물, 준비물 챙겨오세요!`
    )
  );
}
