import { parseNaturalDateTime } from "../../../utils/parseNaturalDateTime.mjs";
import { replyText, replyQuickReplies, replyBasicCard } from "../../../utils/reply.mjs";
import dayjs from "dayjs";

// ✅ 예약 멀티턴 흐름 상태 저장
const sessionContext = {};

/**
 * ✅ 최초 "개인 운동" 발화 → 예약 시작
 */
async function reservePersonal(kakaoId, utterance, res) {
  const parsed = parseNaturalDateTime(utterance);
  const date = parsed[0];

  if (!date) {
    sessionContext[kakaoId] = { flow: "personal-reservation", state: "pending-date" };
    return res.json(
      replyQuickReplies("일정을 입력해 주세요! 오늘 혹은 특정 날짜를 입력해 주시면 됩니다. 예: '오늘 오후 oo시' '4월 30일 5시'", [
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
    return res.json(
      replyQuickReplies("오전인가요, 오후인가요?", ["오전", "오후"])
    );
  }

  sessionContext[kakaoId] = {
    flow: "personal-reservation",
    state: "pending-confirm",
    date,
  };

  return res.json(
    replyBasicCard({
      title: "운동 예약 확인",
      description: `${dayjs(date).format("M월 D일 (ddd) HH시")}에 예약할까요?`,
      buttons: [{ label: "네" }, { label: "아니오" }],
    })
  );
}

/**
 * ✅ 멀티턴 흐름 처리
 */
async function handleMultiTurnFlow(kakaoId, utterance, res) {
  const context = sessionContext[kakaoId];

  if (/취소|아니오/i.test(utterance)) {
    delete sessionContext[kakaoId];
    return res.json(replyText("예약을 취소했어요. 메인 메뉴로 돌아갑니다."));
  }

  if (context.state === "pending-date") {
    return reservePersonal(kakaoId, utterance, res); // 날짜 재입력 → 처음으로 돌림
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

    return res.json(
      replyBasicCard({
        title: "운동 예약 확인",
        description: `${adjusted.format("M월 D일 (ddd) HH시")}에 예약할까요?`,
        buttons: [{ label: "네" }, { label: "아니오" }],
      })
    );
  }

  if (context.state === "pending-confirm") {
    if (/네|응|ㅇㅇ|확인/.test(utterance)) {
      const confirmedTime = dayjs(context.date);
      delete sessionContext[kakaoId];
      return res.json(replyText(`✅ ${confirmedTime.format("M월 D일 (ddd) HH시")} 예약 완료됐어요.`));
    } else {
      return res.json(replyQuickReplies("예약을 확정할까요?", ["네", "아니오"]));
    }
  }

  return res.json(replyText("❓ 예약 흐름이 꼬였어요. '개인 운동'부터 다시 시작해주세요."));
}

export {
  reservePersonal,
  handleMultiTurnFlow,
  sessionContext
};
