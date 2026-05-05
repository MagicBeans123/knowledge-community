/**
 * 后端 user_info.level 表示「累计签到天数」，此处换算为展示用等级 1～6。
 * 阈值：达到该天数则至少为对应等级（左闭区间阶梯）。
 */
export const CHECK_IN_TIER_THRESHOLDS = [7, 21, 46, 91, 180];

/** 与等级 1～6 对应的中文梯度名 */
export const CHECK_IN_TIER_NAMES = ["入门", "勤勉", "笃行", "恒心", "资深", "传奇"];

/**
 * @param {unknown} totalDays 累计签到天数
 * @returns {number} 1～6
 */
export function checkInDaysToTier(totalDays) {
  const d = Math.max(0, Math.floor(Number(totalDays) || 0));
  let tier = 1;
  for (let i = 0; i < CHECK_IN_TIER_THRESHOLDS.length; i++) {
    if (d >= CHECK_IN_TIER_THRESHOLDS[i]) tier = i + 2;
  }
  return Math.min(6, tier);
}

/**
 * @param {number} tier 1～6
 */
export function checkInTierDisplayName(tier) {
  const t = Math.min(6, Math.max(1, Math.floor(Number(tier) || 1)));
  return CHECK_IN_TIER_NAMES[t - 1] ?? CHECK_IN_TIER_NAMES[0];
}

/**
 * @param {unknown} totalDays 累计签到天数（与后端 level 同语义）
 * @returns {{ days: number, tier: number, tierName: string, nextAt: number | null, daysToNext: number }}
 */
export function getCheckInTierInfo(totalDays) {
  const days = Math.max(0, Math.floor(Number(totalDays) || 0));
  const tier = checkInDaysToTier(days);
  const nextAt = tier >= 6 ? null : CHECK_IN_TIER_THRESHOLDS[tier - 1];
  const daysToNext = nextAt == null ? 0 : Math.max(0, nextAt - days);
  return {
    days,
    tier,
    tierName: checkInTierDisplayName(tier),
    nextAt,
    daysToNext
  };
}
