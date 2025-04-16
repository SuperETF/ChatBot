import * as chrono from "chrono-node";

// ✅ 한국어 locale parser 직접 사용 (v2.8.0 이상 기준 안정적)
const customChrono = chrono.ko;  // ⬅️ 핵심 수정 포인트

// ✅ 단일 날짜 및 시간 파싱
export function parseDateTimeFromText(text) {
  const parsed = customChrono.parse(text);
  const results = [];

  for (const result of parsed) {
    const date = result.start.date();
    results.push({
      date: date.toISOString().slice(0, 10),       // yyyy-mm-dd
      time: date.toTimeString().slice(0, 5),       // hh:mm
    });
  }

  // fallback: 날짜 인식 안 되거나 "오늘" 명시 시
  if (results.length === 0 || /오늘/.test(text)) {
    const now = new Date();
    results.push({
      date: now.toISOString().slice(0, 10),
      time: null,
    });
  }

  return results;
}

// ✅ "3일 뒤부터 5일간" 범위 파싱
export function parseDateRangeFromText(text) {
  const rangeMatch = text.match(/(\d+)일\s?뒤부터\s?(\d+)일간/);
  const dates = [];

  if (rangeMatch) {
    const startOffset = parseInt(rangeMatch[1]);
    const days = parseInt(rangeMatch[2]);

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

// ✅ "매주 월수금" 반복 요일 파싱
export function parseWeeklyRepeatDays(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const days = [];

  const matched = text.match(/매주\s*([월화수목금토일]+)/);
  if (matched) {
    for (const char of matched[1]) {
      if (dayMap[char] !== undefined) {
        days.push(dayMap[char]);
      }
    }
  }

  return days; // 예: [1, 3, 5] → 월수금
}
