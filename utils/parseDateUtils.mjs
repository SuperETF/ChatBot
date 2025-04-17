// parseDateUtils.mjs

import * as chrono from "chrono-node";

const customChrono = chrono?.ko ?? chrono.casual;

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

export function parseWeeklyRepeatDays(text) {
  const dayMap = { "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6 };
  const matched = text.match(/매주\s*([월화수목금토일]+)/);
  if (!matched) return [];
  return [...matched[1]].map(c => dayMap[c]).filter(d => d !== undefined);
}
