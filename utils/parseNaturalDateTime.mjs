// ✅ utils/parseNaturalDateTime.mjs
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import weekday from "dayjs/plugin/weekday.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import ko from "dayjs/locale/ko.js";

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale(ko);

/**
 * 간단 버전 예시:
 * - "오늘 3시", "내일 오후 2시 30분", "모레 3:30" 등을 인식
 * - 결과: ['2025-04-20T15:00:00.000Z', ...] 형태
 */
export function parseNaturalDateTime(utterance) {
  const now = dayjs().second(0);

  // 정규식: (오늘|내일|모레)? (오전|오후)? (3시 30분 or 3:30 or 3시)
  // 그룹화해서 시/분을 추출
  const timeRegex = new RegExp(
    `(오늘|내일|모레)?\\s*` +        // 1) dayKeyword
    `(오전|오후)?\\s*` +            // 2) ampm
    `(?:(\\d{1,2})시\\s*(\\d{1,2})?\\s*분?|` + // 3,4 => "3시 30분"
      `(\\d{1,2}):(\\d{1,2})|` +             // 5,6 => "3:30"
      `(\\d{1,2})시)` +                     // 7 => "3시"
    `(\\s*쯤)?`,                             // 8 => "쯤" (옵션)
    "gi"
  );

  const matches = [...utterance.matchAll(timeRegex)];
  if (matches.length === 0) {
    // 다른 예: “3시”만 있는데 앞뒤가 전혀 없을 수도 있으므로 추가 로직 or null
    return null;
  }

  const results = [];

  for (const match of matches) {
    const dayKeyword = match[1];  // 오늘|내일|모레
    const ampm = match[2];       // 오전|오후

    let hour, minute = 0;
    if (match[3]) {
      // "3시 30분" → match[3] = 3, match[4] = 30
      hour = parseInt(match[3], 10) || 0;
      if (match[4]) {
        minute = parseInt(match[4], 10) || 0;
      }
    } else if (match[5]) {
      // "3:30" → match[5] = 3, match[6] = 30
      hour = parseInt(match[5], 10) || 0;
      minute = parseInt(match[6], 10) || 0;
    } else if (match[7]) {
      // "3시" → match[7] = 3
      hour = parseInt(match[7], 10) || 0;
    } else {
      hour = 0;
    }

    // 오전/오후 보정
    if (ampm === "오후" && hour < 12) {
      hour += 12;
    }
    if (ampm === "오전" && hour === 12) {
      hour = 0;
    }

    // 오늘/내일/모레 보정
    let base = now.clone();
    if (dayKeyword === "내일") {
      base = base.add(1, "day");
    } else if (dayKeyword === "모레") {
      base = base.add(2, "day");
    }
    // (오늘은 추가 연산 X)

    // 최종 시간 세팅
    base = base.hour(hour).minute(minute).second(0);

    results.push(base.toISOString());
  }

  return results.length > 0 ? results.sort() : null;
}
