import { parseNaturalDateTime } from "../../../utils/parseNaturalDateTime.mjs";
import { replyText, replyQuickReplies, replyBasicCard } from "../../../utils/reply.mjs";
import { supabase } from "../../../services/supabase.mjs";
import dayjs from "dayjs";

export const sessionContext = {};

export async function reservePersonal(kakaoId, utterance, res) {
  const parsed = parseNaturalDateTime(utterance);
  const date = parsed[0];

  if (!date) {
    sessionContext[kakaoId] = { flow: "personal-reservation", state: "pending-date" };
    return res.json(
      replyQuickReplies("일정을 입력해 주세요! 예: '오늘 오후 3시', '4월 30일 5시'", [
        "오늘 오후 3시", "4월 30일 2시"
      ])
    );
  }

  const hour = dayjs(date).hour();
  if (hour >= 1 && hour <= 11) {
    sessionContext[kakaoId] = {
      flow: "personal-reservation",
      state: "pending-am-or-pm",
      date,
    };
    return res.json(replyQuickReplies("오전인가요, 오후인가요?", ["오전", "오후"]));
  }

  sessionContext[kakaoId] = {
    flow: "personal-reservation",
    state: "pending-confirm",
    date,
  };

  return res.json(replyBasicCard({
    title: "운동 예약 확인",
    description: `${dayjs(date).format("M월 D일 (ddd) HH시")}에 예약할까요?`,
    buttons: [{ label: "네" }, { label: "아니오" }],
  }));
}

export async function handleMultiTurnFlow(kakaoId, utterance, res) {
  const context = sessionContext[kakaoId];

  if (/취소|아니오/i.test(utterance)) {
    delete sessionContext[kakaoId];
    return res.json(replyText("예약을 취소했어요. 메인 메뉴로 돌아갑니다."));
  }

  if (context.state === "pending-date") {
    return reservePersonal(kakaoId, utterance, res);
  }

  if (context.state === "pending-am-or-pm") {
    const base = dayjs(context.date);
    let adjusted = base;

    if (/오후/.test(utterance) && base.hour() < 12) {
      adjusted = base.add(12, "hour");
    } else if (/오전/.test(utterance) && base.hour() >= 12) {
      adjusted = base.subtract(12, "hour");
    } else {
      return res.json(replyQuickReplies("오전인가요, 오후인가요?", ["오전", "오후"]));
    }

    sessionContext[kakaoId] = {
      flow: "personal-reservation",
      state: "pending-confirm",
      date: adjusted.toISOString(),
    };

    return res.json(replyBasicCard({
      title: "운동 예약 확인",
      description: `${adjusted.format("M월 D일 (ddd) HH시")}에 예약할까요?`,
      buttons: [{ label: "네" }, { label: "아니오" }],
    }));
  }

  if (context.state === "pending-confirm") {
    if (/네|응|ㅇㅇ|확인/.test(utterance)) {
      const confirmedTime = dayjs(context.date);

      // ✅ Supabase에 예약 저장
      const { error } = await supabase.from("reservations").insert({
        kakao_id: kakaoId,
        reservation_time: confirmedTime.toISOString(),
        status: "reserved",
        type: "personal"
      });

      delete sessionContext[kakaoId];

      if (error) {
        console.error("❌ 예약 저장 실패:", error.message);
        return res.json(replyText("❌ 예약 저장 중 문제가 발생했습니다."));
      }

      return res.json(replyText(`✅ ${confirmedTime.format("M월 D일 (ddd) HH시")} 예약 완료됐어요.`));
    } else {
      return res.json(replyQuickReplies("예약을 확정할까요?", ["네", "아니오"]));
    }
  }

  return res.json(replyText("❓ 예약 흐름이 꼬였어요. '개인 운동'부터 다시 시작해주세요."));
}
