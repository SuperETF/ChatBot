import * as chrono from "chrono-node";

// ✅ ko locale fallback-safe parser
const customChrono = chrono?.ko ?? chrono.casual;

// ✅ 단일 날짜 및 시간 파싱 (GPT + rule 하이브리드 구조용)
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

  return results; // fallback은 호출부에서 처리 (assignWorkout 등)
}

// ✅ "3일 뒤부터 5일간" 범위 파싱
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

// ✅ 수동 날짜 파싱 백업 로직 (예: "4월 21일")
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

// ✅ 반복 요일 파싱
export function parseWeeklyRepeatDays(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const matched = text.match(/매주\s*([월화수목금토일]+)/);
  if (!matched) return [];
  return [...matched[1]].map(c => dayMap[c]).filter(d => d !== undefined);
}
