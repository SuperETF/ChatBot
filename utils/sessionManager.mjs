// ✅ utils/sessionManager.mjs

import dayjs from "dayjs";

/**
 * 만료 시간이 지난 세션이면 제거
 * @param {object} sessionObj 세션 객체 (예: reserveSession[kakaoId])
 * @param {number} defaultMins 기본 세션 유지 시간 (분)
 * @returns {boolean} 만료 여부
 */
export function checkAndExpireSession(sessionObj, defaultMins = 30) {
  if (!sessionObj) return true; // 세션 없음
  const now = dayjs();
  // 세션 만료 시간이 기록되어 있다면 확인
  if (sessionObj.expiresAt) {
    if (now.isAfter(dayjs(sessionObj.expiresAt))) {
      // 만료
      return true;
    }
  } else {
    // 만료 시간이 없으면, 지금부터 defaultMins 후를 만료로 잡음
    sessionObj.expiresAt = now.add(defaultMins, "minute").valueOf();
  }
  return false;
}
