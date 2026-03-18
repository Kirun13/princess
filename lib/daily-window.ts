export type UtcDayWindow = {
  now: Date;
  todayStartUtc: Date;
  todayEndUtc: Date;
  tomorrowStartUtc: Date;
};

export function getUtcDayWindow(now = new Date()): UtcDayWindow {
  const current = new Date(now);
  const todayStartUtc = new Date(current);
  todayStartUtc.setUTCHours(0, 0, 0, 0);

  const tomorrowStartUtc = new Date(todayStartUtc);
  tomorrowStartUtc.setUTCDate(tomorrowStartUtc.getUTCDate() + 1);

  const todayEndUtc = new Date(tomorrowStartUtc.getTime() - 1);

  return {
    now: current,
    todayStartUtc,
    todayEndUtc,
    tomorrowStartUtc,
  };
}

export function getNextUtcMidnight(now = new Date()) {
  return getUtcDayWindow(now).tomorrowStartUtc;
}

export function getMsUntilNextUtcMidnight(now = new Date()) {
  return Math.max(0, getNextUtcMidnight(now).getTime() - now.getTime());
}
