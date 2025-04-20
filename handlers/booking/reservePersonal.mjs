// ✅ handlers/booking/reservePersonal.mjs

import dayjs from "dayjs";
import { supabase } from "../../services/supabase.mjs";
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";

// -- 응답 포맷 빌더들 (예시)
function replySimpleText(text) {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }]
    }
  };
}

function replyBasicCard({ title, description, buttons = [] }) {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          basicCard: {
            title,
            description,
            buttons: buttons.map(btn => ({
              label: btn.label,
              action: "message",
              messageText: btn.messageText || btn.label
            }))
          }
        }
      ]
    }
  };
}

function replyQuickReplies(text, quickReplies = []) {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: quickReplies.map(label => ({
        label,
        action: "message",
        messageText: label
      }))
    }
  };
}

// 예약 세션
export const sessionContext = {};

export async function reservePersonal(kakaoId, utterance, res) {
  // (1) 회원 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replySimpleText("먼저 회원 등록이 필요합니다."));
  }

  // (2) 날짜/시간 파싱
  const dateArray = parseNaturalDateTime(utterance); 
  if (!dateArray || dateArray.length === 0) {
    // 파싱 실패 → 날짜를 다시 물어본다
    sessionContext[kakaoId] = {
      type: "pending-date",
      member_id: member.id
    };
    return res.json(
      replyQuickReplies("언제 운동을 예약하시겠어요?", ["오늘 3시", "내일 오전 10시"])
    );
  }

  // 여기선 첫 번째 값만 사용 (복수개가 나올 수도 있으므로)
  const isoString = dateArray[0];
  const finalTime = dayjs(isoString);

  // (3) 최종 확인 멀티턴
  sessionContext[kakaoId] = {
    type: "pending-confirm",
    member_id: member.id,
    base_time: finalTime.toISOString()
  };

  // BasicCard로 “네” / “다른 시간” 버튼
  return res.json(
    replyBasicCard({
      title: "운동 예약 확인",
      description: `${finalTime.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
      buttons: [
        { label: "네" },
        { label: "아니오" }
      ]
    })
  );
}

// 멀티턴 후속 처리
export async function handleMultiTurnReserve(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) {
    return res.json(replySimpleText("새로운 예약을 원하시면 '예약'이라고 말씀해주세요."));
  }

  switch (session.type) {
    // 날짜를 못잡았을 때 물어본 상태
    case "pending-date": {
      const dateArray = parseNaturalDateTime(utterance);
      if (!dateArray || dateArray.length === 0) {
        return res.json(replySimpleText("날짜/시간을 인식 못했어요. 예: '내일 오후 2시 30분'"));
      }
      const isoString = dateArray[0];
      session.type = "pending-confirm";
      session.base_time = isoString;

      const timeObj = dayjs(isoString);
      return res.json(
        replyBasicCard({
          title: "운동 예약 확인",
          description: `${timeObj.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
          buttons: [
            { label: "네" },
            { label: "아니오" }
          ]
        })
      );
    }

    // 최종 예약 확인
    case "pending-confirm": {
      const lower = utterance.toLowerCase();
      if (/(네|예|ㅇㅇ|응|맞아|확인)/.test(lower)) {
        // “네” → DB insert
        const finalTime = dayjs(session.base_time);
        const memberId = session.member_id;
        delete sessionContext[kakaoId]; // 세션 해제
        return confirmReservation(memberId, finalTime, res);
      } else if (/(아니오|노|취소|ㄴㄴ)/.test(lower)) {
        delete sessionContext[kakaoId];
        return res.json(replySimpleText("알겠습니다. 예약을 취소했습니다."));
      } else {
        // 의도 불명확 → QuickReplies
        return res.json(
          replyQuickReplies("예약을 확정할까요?", ["네", "아니오"])
        );
      }
    }

    default:
      // 세션 초기화
      delete sessionContext[kakaoId];
      return res.json(replySimpleText("예약 흐름이 종료되었습니다. 다시 시도해주세요."));
  }
}

// 실제 DB insert
async function confirmReservation(memberId, timeObj, res) {
  const reservationTime = timeObj.toISOString();

  // (1) 중복 예약 체크
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", memberId)
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replySimpleText("이미 해당 시간에 운동 예약이 되어 있습니다."));
  }

  // (2) 인원 제한(예: 4명)
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  if (count >= 4) {
    return res.json(replySimpleText("해당 시간은 이미 마감되었습니다. 다른 시간을 선택해주세요."));
  }

  // (3) DB insert
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
      `✅ ${timeObj.format("M월 D일 (ddd) HH시")} 예약이 완료되었습니다!\n운동복, 물 잘 챙겨오세요.`
    )
  );
}
