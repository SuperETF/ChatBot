// ✅ handlers/booking/reservePersonal.mjs (최종 리팩토링)
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
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) return res.json(replyText("먼저 회원 등록이 필요합니다."));

  const dateArray = parseNaturalDateTime(utterance);
  console.log("🧪 [reservePersonal] utterance:", utterance);
  console.log("🧪 [reservePersonal] parsed dateArray:", dateArray);

  if (!dateArray || dateArray.length === 0) {
    sessionContext[kakaoId] = { type: "pending-date", member_id: member.id };
    return res.json(
      replyQuickReplies("운동 시간을 입력해주세요. 예: 오늘 3시 운동", ["오늘 3시", "내일 오전 10시"])
    );
  }

  // ✅ 상대 날짜 또는 오늘 키워드 우선 선택
  const todayKeywords = ["오늘", "내일", "모레"];
  const containsRelative = todayKeywords.some(keyword => utterance.includes(keyword));
  const baseDate = dayjs();
  const isoString = containsRelative
    ? dateArray.find(d => {
        const parsed = dayjs(d);
        return parsed.isSame(baseDate, "day") ||
               parsed.isSame(baseDate.add(1, "day"), "day") ||
               parsed.isSame(baseDate.add(2, "day"), "day");
      }) || dateArray[0]
    : dateArray[0];

  const finalTime = dayjs(isoString);
  if (!finalTime.isValid() || isNaN(finalTime.hour())) {
    sessionContext[kakaoId] = { type: "pending-date", member_id: member.id };
    return res.json(
      replyQuickReplies("시간을 정확히 입력해주세요. 예: 내일 오후 2시", ["오늘 3시", "내일 오전 10시"])
    );
  }

  const hour = finalTime.hour();
  if (hour >= 1 && hour <= 11) {
    sessionContext[kakaoId] = {
      type: "pending-am-or-pm",
      base_time: isoString,
      member_id: member.id
    };
    return res.json(
      replyQuickReplies(`${finalTime.format("M월 D일 (ddd)")} ${hour}시 예약하신 건가요?\n오전인가요, 오후인가요?`, ["오전", "오후"])
    );
  }

  sessionContext[kakaoId] = {
    type: "pending-confirm",
    member_id: member.id,
    base_time: finalTime.toISOString()
  };

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

export async function handleMultiTurnReserve(kakaoId, utterance, res) {
  const session = sessionContext[kakaoId];
  if (!session) return res.json(replyText("새로운 예약을 원하시면 '예약'이라고 말씀해주세요."));

  switch (session.type) {
    case "pending-date": {
      const dateArray = parseNaturalDateTime(utterance);
      console.log("🧪 [pending-date] utterance:", utterance);
      console.log("🧪 [pending-date] parsed:", dateArray);

      if (!dateArray || dateArray.length === 0) {
        return res.json(replyText("날짜/시간을 인식 못했어요. 예: '내일 오후 2시 30분'"));
      }

      const isoString = dateArray[0];
      const timeObj = dayjs(isoString);
      if (!timeObj.isValid() || isNaN(timeObj.hour())) {
        return res.json(replyText("시간 인식이 올바르지 않아요. 예: '5월 1일 오후 3시'"));
      }

      const hour = timeObj.hour();
      if (hour >= 1 && hour <= 11) {
        session.type = "pending-am-or-pm";
        session.base_time = isoString;
        return res.json(
          replyQuickReplies(`${timeObj.format("M월 D일 (ddd)")} ${hour}시, 오전인가요 오후인가요?`, ["오전", "오후"])
        );
      }

      session.type = "pending-confirm";
      session.base_time = isoString;

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

    case "pending-am-or-pm": {
      const baseTime = dayjs(session.base_time);
      console.log("🧪 [pending-am-or-pm] baseTime before adjust:", baseTime.toISOString());

      let adjustedTime = baseTime;
      if (/오전/.test(utterance)) {
        if (baseTime.hour() >= 12) adjustedTime = baseTime.subtract(12, "hour");
      } else if (/오후/.test(utterance)) {
        if (baseTime.hour() < 12) adjustedTime = baseTime.add(12, "hour");
      } else {
        return res.json(replyQuickReplies("오전인가요, 오후인가요?", ["오전", "오후"]));
      }

      console.log("🧪 [pending-am-or-pm] adjustedTime:", adjustedTime.toISOString());

      session.type = "pending-confirm";
      session.base_time = adjustedTime.toISOString();

      return res.json(
        replyBasicCard({
          title: "운동 예약 확인",
          description: `${adjustedTime.format("M월 D일 (ddd) HH시")}에 예약하시겠습니까?`,
          buttons: [
            { label: "네" },
            { label: "아니오" }
          ]
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
        delete sessionContext[kakaoId];
        return res.json(
          replyQuickReplies("알겠습니다. 예약을 취소했습니다. 다시 예약하시겠어요?", ["오늘 3시", "내일 오전 10시"])
        );
      } else {
        return res.json(replyQuickReplies("예약을 확정할까요?", ["네", "아니오"]));
      }
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
