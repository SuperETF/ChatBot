// ✅ handlers/booking/reservePersonal.mjs

import dayjs from "dayjs";
import { supabase } from "../../services/supabase.mjs";
import { parseNaturalDateTime } from "../../utils/parseNaturalDateTime.mjs";
import { replySimpleText, replyQuickReplies, replyBasicCard } from "../../utils/reply.mjs";
import { checkAndExpireSession } from "../../utils/sessionManager.mjs";

// 예약 세션
export const reserveSession = {};

/**
 * 1) 예약 신청 진입
 */
export async function reservePersonal(kakaoId, utterance, res) {
  // 회원 여부
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("kakao_id", kakaoId)
    .maybeSingle();

  if (!member) {
    return res.json(replySimpleText("먼저 회원 등록이 필요합니다."));
  }

  // 날짜/시간 파싱
  const dateArray = parseNaturalDateTime(utterance);
  if (!dateArray || dateArray.length === 0) {
    // 세션 저장: 대기
    reserveSession[kakaoId] = {
      type: "pending-date",
      member_id: member.id
    };
    return res.json(replyQuickReplies("언제 운동을 예약하시겠어요?", ["오늘 3시", "내일 오전 10시"]));
  }

  const isoString = dateArray[0];
  const timeObj = dayjs(isoString);

  // 미래 시각 검사
  if (timeObj.isBefore(dayjs(), "minute")) {
    return res.json(replySimpleText("이미 지난 시간입니다. 다른 시간을 입력해주세요."));
  }

  // 세션 기록 (30분 만료)
  reserveSession[kakaoId] = {
    type: "pending-confirm",
    member_id: member.id,
    base_time: timeObj.toISOString(),
    expiresAt: dayjs().add(30, "minute").valueOf() // 세션 만료 시각
  };

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

/**
 * 2) 멀티턴 처리
 */
export async function handleMultiTurnReserve(kakaoId, utterance, res) {
  const session = reserveSession[kakaoId];
  if (!session) {
    return res.json(replySimpleText("새로운 예약을 원하시면 '예약'이라고 말씀해주세요."));
  }

  // 세션 만료 여부
  const expired = checkAndExpireSession(session);
  if (expired) {
    delete reserveSession[kakaoId];
    return res.json(replySimpleText("세션이 만료되었습니다. 다시 예약을 시도해주세요."));
  }

  switch (session.type) {
    case "pending-date": {
      // 날짜/시간 재파싱
      const dateArray = parseNaturalDateTime(utterance);
      if (!dateArray || dateArray.length === 0) {
        return res.json(replySimpleText("날짜/시간을 인식 못했어요. 예: '내일 오후 2시 30분'"));
      }
      const isoString = dateArray[0];
      const timeObj = dayjs(isoString);

      if (timeObj.isBefore(dayjs(), "minute")) {
        return res.json(replySimpleText("이미 지난 시간입니다. 다른 시간을 입력해주세요."));
      }

      session.type = "pending-confirm";
      session.base_time = timeObj.toISOString();

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

    case "pending-confirm": {
      const lower = utterance.toLowerCase();
      if (/(네|예|ㅇㅇ|응|맞아|확인)/.test(lower)) {
        // 예약 확정
        const finalTime = dayjs(session.base_time);
        const memberId = session.member_id;
        delete reserveSession[kakaoId];
        return confirmReservation(memberId, finalTime, res);
      } else if (/(아니오|노|취소|ㄴㄴ)/.test(lower)) {
        delete reserveSession[kakaoId];
        return res.json(replySimpleText("알겠습니다. 예약을 취소했습니다."));
      } else {
        return res.json(replyQuickReplies("예약을 확정할까요?", ["네", "아니오"]));
      }
    }

    default:
      delete reserveSession[kakaoId];
      return res.json(replySimpleText("예약 흐름이 종료되었습니다. 다시 시도해주세요."));
  }
}

/**
 * 3) 최종 DB insert
 */
export async function confirmReservation(memberId, timeObj, res) {
  const reservationTime = timeObj.toISOString();

  // 중복 예약
  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("member_id", memberId)
    .eq("reservation_time", reservationTime)
    .maybeSingle();

  if (existing) {
    return res.json(replySimpleText("이미 해당 시간에 운동 예약이 되어 있습니다."));
  }

  // 인원 제한
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("reservation_time", reservationTime)
    .eq("status", "reserved");
  
  const MAX_CAPACITY = 4;
  if (count >= MAX_CAPACITY) {
    // 다른 시간 제안 (예: 바로 인접한 2시간 후까지)
    const altTimes = [];
    for (let i = 1; i <= 2; i++) {
      const alt = timeObj.add(i, "hour");
      // 단, alt가 지금보다 이후여야
      if (alt.isAfter(dayjs())) {
        altTimes.push(alt.format("M월 D일 (ddd) HH시"));
      }
    }

    if (altTimes.length === 0) {
      return res.json(replySimpleText("해당 시간은 이미 마감되었습니다. 다른 시간을 입력해주세요."));
    }
    return res.json(
      replyQuickReplies(
        `해당 시간은 마감되었습니다.\n다른 시간은 어떠세요?`,
        altTimes
      )
    );
  }

  // insert
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
