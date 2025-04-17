import * as chrono from "chrono-node";

const customChrono = chrono?.ko ?? chrono.casual;

// ✅ 일반 날짜 & 시간 파싱 (예: "4월 20일 오후 3시")
export function parseDateTimeFromText(text) {
  const parsed = customChrono.parse(text);
  const results = [];

  for (const result of parsed) {
    if (!result?.start?.date) continue;
    const date = result.start.date();
    results.push({
      date: date.toISOString().slice(0, 10),
      time: result.start.isCertain("hour") ? date.toTimeString().slice(0, 5) : null,
    });
  }

  return results;
}

// ✅ "3일 뒤부터 5일간" → 날짜 범위 생성
export function parseDateRangeFromText(text) {
  const rangeMatch = text.match(/(\d+)일\s?뒤부터\s?(\d+)일간/);
  const dates = [];

  if (rangeMatch) {
    const startOffset = parseInt(rangeMatch[1], 10);
    const days = parseInt(rangeMatch[2], 10);

    const today = new Date();
    today.setDate(today.getDate() + startOffset);

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: d.toISOString().slice(0, 10),
        time: null,
      });
    }
  }

  return dates;
}

// ✅ 수동 날짜 포맷 "4월 21일"
export function parseManualDateFromText(text) {
  const manualMatch = text.match(/(\d{1,2})월\s?(\d{1,2})일/);
  if (!manualMatch) return [];

  const [_, month, day] = manualMatch.map(Number);
  const now = new Date();
  const parsedDate = new Date(now.getFullYear(), month - 1, day);

  return [{
    date: parsedDate.toISOString().slice(0, 10),
    time: null,
  }];
}

// ✅ "오늘", "내일", "격일", "매일" 같은 반복 표현
export function parseRelativeDay(text) {
  const today = new Date();
  const result = [];

  if (text.includes("오늘")) {
    result.push({ date: today.toISOString().slice(0, 10), time: null });
  }

  if (text.includes("내일")) {
    const t = new Date(today);
    t.setDate(today.getDate() + 1);
    result.push({ date: t.toISOString().slice(0, 10), time: null });
  }

  if (text.includes("격일")) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i * 2);
      result.push({ date: d.toISOString().slice(0, 10), time: null });
    }
  }

  if (text.includes("매일")) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push({ date: d.toISOString().slice(0, 10), time: null });
    }
  }

  return result;
}

// ✅ "매주 월수금" → 요일 반복 인식
export function parseWeeklyRepeatDays(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const matched = text.match(/매주\s*([월화수목금토일]+)/);
  if (!matched) return [];

  return [...matched[1]].map(c => dayMap[c]).filter(d => d !== undefined);
}

// ✅ "다음주 수요일", "다다음주 월요일" → 날짜 계산
export function parseRelativeWeekday(text) {
  const result = [];
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };

  const match = text.match(/(다다음주|다음주)\s*([월화수목금토일])/);
  if (!match) return [];

  const baseOffset = match[1] === "다음주" ? 7 : 14;
  const dayChar = match[2];
  const targetDay = dayMap[dayChar];

  const today = new Date();
  const todayDay = today.getDay();
  const offset = baseOffset + ((targetDay + 7 - todayDay) % 7);

  const d = new Date();
  d.setDate(today.getDate() + offset);

  result.push({
    date: d.toISOString().slice(0, 10),
    time: null
  });

  return result;
}

// ✅ "수요일", "금요일" → 가장 가까운 해당 요일 날짜 계산
export function parseClosestWeekdayFromText(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const match = text.match(/([월화수목금토일])요일/);
  if (!match) return [];

  const targetDay = dayMap[match[1]];
  const today = new Date();
  const todayDay = today.getDay();

  let offset = (targetDay - todayDay + 7) % 7;
  if (offset === 0) offset = 7;

  const resultDate = new Date();
  resultDate.setDate(today.getDate() + offset);

  return [{
    date: resultDate.toISOString().slice(0, 10),
    time: null
  }];
}
