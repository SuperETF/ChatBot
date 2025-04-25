// handlers/booking/reservePersonal.mjs
import dayjs from "dayjs";
import { supabase } from "../../../services/supabase.mjs";
import { parseNaturalDateTime } from "../../../utils/parseNaturalDateTime.mjs";
import {
  replyText,
  replyQuickReplies,
  replyBasicCard
} from "../../../utils/reply.mjs";

export const sessionContext = {};

export async function reservePersonal(kakaoId, utterance, res) {
  // — 멀티턴 흐름 중이면 해당 핸들러로 분기
  if (sessionContext[kakaoId]?.type) {
    return handleMultiTurnReserve(kakaoId, utterance, res);
  }

  // — 회원 검증
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();
  if (!member) {
    return res.json(replyText("먼저 회원 등록이 필요합니다."));
  }

  // — 날짜/시간 파싱
  const dateArray = parseNaturalDateTime(utterance);
  console.log("🧪 [reservePersonal] utterance:", utterance);
  console.log("🧪 [reservePersonal] parsed dateArray:", dateArray);

  // — 1) 날짜 인식 실패 시 멀티턴 시작
  if (!dateArray || dateArray.length === 0) {
    sessionContext[kakaoId] = { type: "pending-date", member_id: member.id };
    return res.json(
      replyQuickReplies(
        "운동 시간을 입력해주세요. 예: 오늘 3시 운동",
        ["오늘 3시", "내일 오전 10시"]
      )
    );
  }

  const finalTime = dayjs(dateArray[0]);
  // — 2) 유효하지 않은 시간
  if (!finalTime.isValid() || isNaN(finalTime.hour())) {
    sessionContext[kakaoId] = { type: "pending-date", member_id: member.id };
    return res.json(
      replyQuickReplies(
        "시간을 정확히 입력해주세요. 예: 내일 오후 2시",
        ["오늘 3시", "내일 오전 10시"]
      )
    );
  }

  const hour = finalTime.hour();
  // — 3) AM/PM 구분이 필요한 시간일 때
  if (hour >= 1 && hour <= 11) {
    sessionContext[kakaoId] = {
      type: "pending-am-or-pm",
      base_time: finalTime.toISOString(),
      member_id: member.id
    };
    return res.json(
      replyQuickReplies(
        `${finalTime.format("M월 D일 (ddd)")} ${hour}시 예약하신 건가요?\n오전인가요, 오후인가요?`,
        ["오전", "오후"]
      )
    );
  }

  // — 4) 바로 확인 단계
  sessionContext[kakaoId] = {
    type: "pending-confirm",
    member_id: member.id,
    base_time: finalTime.toISOString()
  };
  return res.json(
    replyBasicCard({
      title: "운동 예약 확인",
      description: `${finalTime.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
      buttons: [{ label: "네" }, { label: "아니오" }]
    })
  );
}

export async function handleMultiTurnReserve(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) {
    return res.json(replyText("새로운 예약을 원하시면 '예약'이라고 말씀해주세요."));
  }

  switch (session.type) {
    case "pending-date": {
      const dateArray = parseNaturalDateTime(utterance);
      console.log("🧪 [pending-date] utterance:", utterance);
      console.log("🧪 [pending-date] parsed:", dateArray);

      if (!dateArray || dateArray.length === 0) {
        return res.json(
          replyText("날짜/시간을 인식 못했어요. 예: '내일 오후 2시 30분'")
        );
      }

      const timeObj = dayjs(dateArray[0]);
      if (!timeObj.isValid() || isNaN(timeObj.hour())) {
        return res.json(
          replyText("시간 인식이 올바르지 않아요. 예: '5월 1일 오후 3시'")
        );
      }

      const h = timeObj.hour();
      if (h >= 1 && h <= 11) {
        session.type = "pending-am-or-pm";
        session.base_time = timeObj.toISOString();
        return res.json(
          replyQuickReplies(
            `${timeObj.format("M월 D일 (ddd)")} ${h}시, 오전인가요 오후인가요?`,
            ["오전", "오후"]
          )
        );
      }

      session.type = "pending-confirm";
      session.base_time = timeObj.toISOString();
      return res.json(
        replyBasicCard({
          title: "운동 예약 확인",
          description: `${timeObj.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
          buttons: [{ label: "네" }, { label: "아니오" }]
        })
      );
    }

    case "pending-am-or-pm": {
      const baseTime = dayjs(session.base_time);
      console.log("🧪 [pending-am-or-pm] baseTime before adjust:", baseTime);

      let adjusted = baseTime;
      if (/오전/.test(utterance)) {
        if (baseTime.hour() >= 12) adjusted = baseTime.subtract(12, "hour");
      } else if (/오후/.test(utterance)) {
        if (baseTime.hour() < 12) adjusted = baseTime.add(12, "hour");
      } else {
        return res.json(replyQuickReplies("오전인가요, 오후인가요?", ["오전", "오후"]));
      }

      console.log("🧪 [pending-am-or-pm] adjustedTime:", adjusted);
      session.type = "pending-confirm";
      session.base_time = adjusted.toISOString();
      return res.json(
        replyBasicCard({
          title: "운동 예약 확인",
          description: `${adjusted.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
          buttons: [{ label: "네" }, { label: "아니오" }]
        })
      );
    }

    case "pending-confirm": {
      const lower = utterance.toLowerCase();
      if (/(네|예|ㅇㅇ|응|맞아|확인)/.test(lower)) {
        const finalTime = dayjs(session.base_time);
        const memberId = session.member_id;
        delete sessionContext[kakaoId];
        return confirmReservation(memberId, finalTime, res);
      } else if (/(아니오|노|취소|ㄴㄴ)/.test(lower)) {
        sessionContext[kakaoId] = { type: "pending-date", member_id: session.member_id };
        return res.json(
          replyQuickReplies("알겠습니다. 다시 예약하실 시간을 알려주세요.", ["오늘 3시", "내일 오전 10시"])
        );
      }
      return res.json(replyQuickReplies("예약을 확정할까요?", ["네", "아니오"]));
    }

    default:
      delete sessionContext[kakaoId];
      return res.json(replyText("예약 흐름이 종료되었습니다. 다시 시도해주세요."));
  }
}

export async function confirmReservation(memberId, timeObj, res) {
  const reservationTime = timeObj.toISOString();
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", memberId)
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replyText("이미 해당 시간에 운동 예약이 되어 있습니다."));
  }

  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");

  if (count >= 4) {
    return res.json(replyText("해당 시간은 이미 마감되었습니다. 다른 시간을 선택해주세요."));
  }

  const { error } = await supabase
    .from("reservations")
    .insert({
      member_id: memberId,
      reservation_time: reservationTime,
      status: "reserved",
      type: "personal"
    });

  if (error) {
    return res.json(replyText("예약 과정에서 문제가 발생했습니다. 다시 시도해주세요."));
  }

  return res.json(
    replyText(
      `✅ ${timeObj.format("M월 D일 (ddd) HH시")} 예약이 완료되었습니다!\n운동복, 물 잘 챙겨오세요.`
    )
  );
}
