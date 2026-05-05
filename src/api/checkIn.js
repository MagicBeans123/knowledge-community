import http from "./http";

/**
 * @param {number} year
 * @param {number} month 1-12
 * @param {string} [timezone] e.g. Asia/Shanghai
 */
export function fetchCheckInCalendar(year, month, timezone) {
  const params = { year, month };
  if (timezone) params.timezone = timezone;
  return http.get("/check-in/calendar", { params });
}

/**
 * @param {{ timezone?: string }} [body]
 */
export function postCheckIn(body) {
  return http.post("/check-in", body ?? {});
}
