<template>
  <div class="check-in-panel" v-loading="loading">
    <div class="panel-brand">
      <span class="panel-brand__title">每日签到</span>
      <span class="panel-brand__divider" aria-hidden="true">·</span>
      <span class="panel-brand__sub">记录你的坚持</span>
    </div>
    <div class="panel-head">
      <button type="button" class="nav" aria-label="上一月" @click="prevMonth">‹</button>
      <span class="title">{{ titleText }}</span>
      <button type="button" class="nav" aria-label="下一月" @click="nextMonth" :disabled="!canGoNext">›</button>
    </div>
    <div class="week-header">
      <span v-for="(w, i) in weekLabels" :key="i">{{ w }}</span>
    </div>
    <div class="cells" role="grid" :aria-label="`${titleText}签到日历`">
      <div
        v-for="(cell, idx) in cells"
        :key="idx"
        role="gridcell"
        class="cell"
        :class="cellClass(cell)"
        :title="cellTitle(cell)"
      />
    </div>
    <div class="legend" aria-hidden="true">
      <span class="legend__item"><i class="legend__sw legend__sw--on" />已签</span>
      <span class="legend__item"><i class="legend__sw legend__sw--off" />未签</span>
    </div>
    <el-button
      v-if="isCurrentMonth"
      type="primary"
      class="action"
      :loading="checkingIn"
      :disabled="alreadySignedToday"
      @click="doCheckIn"
    >
      {{ alreadySignedToday ? "今日已签" : "签到" }}
    </el-button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { fetchCheckInCalendar, postCheckIn } from "../api/checkIn";

const WEEK_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth() + 1);

const loading = ref(false);
const checkingIn = ref(false);
/** @type {import('vue').Ref<null | Record<string, unknown>>} */
const payload = ref(null);

function clientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

const titleText = computed(() => `${viewYear.value}年${viewMonth.value}月`);

const weekLabels = computed(() => {
  const start = Number(payload.value?.weekStartsOn ?? 0);
  const s = Number.isFinite(start) ? ((start % 7) + 7) % 7 : 0;
  return Array.from({ length: 7 }, (_, i) => WEEK_NAMES[(s + i) % 7]);
});

const canGoNext = computed(() => {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return viewYear.value < y || (viewYear.value === y && viewMonth.value < m);
});

const isCurrentMonth = computed(() => {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return viewYear.value === y && viewMonth.value === m;
});

const alreadySignedToday = computed(() => {
  if (!isCurrentMonth.value || !payload.value) return false;
  const d = now.getDate();
  const bitmap = String(payload.value.checkInBitmap ?? "");
  const ch = bitmap.charAt(d - 1);
  return ch === "1";
});

const cells = computed(() => {
  const p = payload.value;
  if (!p) return [];

  const daysInMonth = Number(p.daysInMonth);
  const firstWeekday = Number(p.firstWeekday);
  const weekStartsOn = Number(p.weekStartsOn ?? 0);
  if (!Number.isFinite(daysInMonth) || !Number.isFinite(firstWeekday)) return [];

  const ws = Number.isFinite(weekStartsOn) ? ((weekStartsOn % 7) + 7) % 7 : 0;
  const fw = ((firstWeekday % 7) + 7) % 7;
  const leading = (fw - ws + 7) % 7;

  let bitmap = String(p.checkInBitmap ?? "").replace(/\s/g, "");
  if (bitmap.length < daysInMonth) {
    bitmap = bitmap.padEnd(daysInMonth, "0");
  }

  const total = leading + daysInMonth;
  const padEnd = total % 7 === 0 ? 0 : 7 - (total % 7);
  const totalCells = total + padEnd;

  const y = viewYear.value;
  const m = viewMonth.value;
  const todayY = now.getFullYear();
  const todayM = now.getMonth() + 1;
  const todayD = now.getDate();

  /** @type {{ kind: string, day?: number, signed?: boolean, isToday?: boolean }[]} */
  const out = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < leading) {
      out.push({ kind: "pad" });
      continue;
    }
    const day = i - leading + 1;
    if (day > daysInMonth) {
      out.push({ kind: "pad" });
      continue;
    }
    const signed = bitmap.charAt(day - 1) === "1";
    const isToday = y === todayY && m === todayM && day === todayD;
    out.push({ kind: "day", day, signed, isToday });
  }
  return out;
});

function cellClass(cell) {
  if (cell.kind === "pad") return "is-pad";
  return {
    "is-day": true,
    "is-signed": cell.signed,
    "is-miss": !cell.signed,
    "is-today": cell.isToday
  };
}

function cellTitle(cell) {
  if (cell.kind === "pad") return "";
  const base = `${viewYear.value}-${String(viewMonth.value).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
  if (cell.signed) return `${base} 已签到`;
  return `${base} 未签到`;
}

async function load() {
  loading.value = true;
  try {
    const tz = clientTimezone();
    const data = await fetchCheckInCalendar(viewYear.value, viewMonth.value, tz);
    payload.value = data && typeof data === "object" ? data : null;
  } catch (e) {
    payload.value = null;
    ElMessage.error(e?.message || "加载签到日历失败");
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (viewMonth.value <= 1) {
    viewMonth.value = 12;
    viewYear.value -= 1;
  } else {
    viewMonth.value -= 1;
  }
}

function nextMonth() {
  if (!canGoNext.value) return;
  if (viewMonth.value >= 12) {
    viewMonth.value = 1;
    viewYear.value += 1;
  } else {
    viewMonth.value += 1;
  }
}

async function doCheckIn() {
  checkingIn.value = true;
  try {
    const tz = clientTimezone();
    await postCheckIn(tz ? { timezone: tz } : {});
    ElMessage.success("签到成功");
    await load();
  } catch (e) {
    ElMessage.error(e?.message || "签到失败");
  } finally {
    checkingIn.value = false;
  }
}

watch([viewYear, viewMonth], () => {
  load();
});

onMounted(() => {
  load();
});
</script>

<style scoped>
.check-in-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px 10px;
  border-radius: 16px;
  background: linear-gradient(165deg, #fffef9 0%, #f7f4eb 48%, #f0f2ea 100%);
  border: 1px solid rgba(var(--kc-primary-rgb), 0.14);
  box-shadow:
    var(--kc-shadow-soft),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  position: relative;
}

.check-in-panel::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  width: 72px;
  height: 72px;
  background: radial-gradient(circle at top right, rgba(var(--kc-primary-rgb), 0.08), transparent 70%);
  pointer-events: none;
  border-radius: 0 16px 0 0;
}

.panel-brand {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 4px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--kc-border-soft);
}

.panel-brand__divider {
  color: var(--kc-border-soft);
  font-weight: 400;
  user-select: none;
}

.panel-brand__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--kc-text);
  letter-spacing: 0.06em;
}

.panel-brand__sub {
  font-size: 11px;
  color: var(--kc-subtle);
}

.panel-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

.title {
  font-size: 13px;
  font-weight: 700;
  color: var(--kc-text);
  white-space: nowrap;
}

.nav {
  border: none;
  background: var(--kc-primary-soft);
  color: var(--kc-text);
  font-size: 17px;
  line-height: 1;
  width: 30px;
  height: 30px;
  padding: 0;
  cursor: pointer;
  border-radius: 10px;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}

.nav:hover:not(:disabled) {
  background: var(--kc-primary-soft-2);
  transform: scale(1.05);
}

.nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  transform: none;
}

.week-header {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--kc-subtle);
  text-align: center;
}

.cells {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  box-sizing: border-box;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.cell.is-day:not(.is-pad):hover {
  transform: scale(1.08);
  z-index: 1;
}

.cell.is-pad {
  visibility: hidden;
}

.cell.is-day.is-signed {
  background: linear-gradient(145deg, #556b47, #3d4a35);
  border: 1px solid #2f3828;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.cell.is-day.is-miss {
  background: rgba(255, 253, 247, 0.85);
  border: 1px solid var(--kc-border-soft);
}

.cell.is-today {
  box-shadow:
    0 0 0 2px var(--el-color-primary),
    0 2px 8px rgba(var(--kc-primary-rgb), 0.25);
}

.legend {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 6px;
  margin-top: -2px;
  font-size: 11px;
  color: var(--kc-muted);
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend__sw {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend__sw--on {
  background: linear-gradient(145deg, #556b47, #3d4a35);
  border: 1px solid #2f3828;
}

.legend__sw--off {
  background: rgba(255, 253, 247, 0.9);
  border: 1px solid var(--kc-border-soft);
}

.action {
  width: 100%;
  flex-shrink: 0;
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.action :deep(.el-button--primary) {
  box-shadow: 0 4px 14px rgba(var(--kc-primary-rgb), 0.3);
}
</style>
