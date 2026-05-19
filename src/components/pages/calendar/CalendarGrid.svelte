<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { HolidayEntry } from "@/pages/api/holidays.json";
import type { BirthdayItem, ScheduleItem } from "@/types/config";
import {
	bucketize,
	buildBirthdayEvents,
	buildHolidayEvents,
	buildPostEvents,
	buildScheduleEvents,
	type CalendarEvent,
	type EventBucket,
	type EventType,
	formatYmd,
	type PostMeta,
} from "@/utils/calendar-events";
import { getLunarDayChinese } from "@/utils/lunar-utils";
import { eventTypeMeta } from "./eventTypes";

interface Props {
	holidays?: HolidayEntry[];
	posts?: PostMeta[];
	birthdays?: BirthdayItem[];
	schedules?: ScheduleItem[];
	years?: number[];
	showPosts?: boolean;
	showLunar?: boolean;
}

let {
	holidays = [],
	posts = [],
	birthdays = [],
	schedules = [],
	years = [],
	showPosts = true,
	showLunar = true,
}: Props = $props();

// ============ 月份名 / 星期名（i18n） ============
const monthNames = [
	i18n(I18nKey.calendarJanuary),
	i18n(I18nKey.calendarFebruary),
	i18n(I18nKey.calendarMarch),
	i18n(I18nKey.calendarApril),
	i18n(I18nKey.calendarMay),
	i18n(I18nKey.calendarJune),
	i18n(I18nKey.calendarJuly),
	i18n(I18nKey.calendarAugust),
	i18n(I18nKey.calendarSeptember),
	i18n(I18nKey.calendarOctober),
	i18n(I18nKey.calendarNovember),
	i18n(I18nKey.calendarDecember),
];

const weekDays = [
	i18n(I18nKey.calendarSunday),
	i18n(I18nKey.calendarMonday),
	i18n(I18nKey.calendarTuesday),
	i18n(I18nKey.calendarWednesday),
	i18n(I18nKey.calendarThursday),
	i18n(I18nKey.calendarFriday),
	i18n(I18nKey.calendarSaturday),
];

// ============ 状态 ============
const today = new Date();
const todayKey = formatYmd(today);

let displayYear = $state(today.getFullYear());
let displayMonth = $state(today.getMonth()); // 0-11
let selectedDateKey = $state(todayKey);

// ============ 派生：聚合事件 → 按日期分桶 ============
const bucket = $derived.by<EventBucket>(() => {
	const list: CalendarEvent[] = [];
	list.push(...buildHolidayEvents(holidays));
	list.push(...buildBirthdayEvents(birthdays, years));
	list.push(...buildScheduleEvents(schedules, years));
	if (showPosts) list.push(...buildPostEvents(posts));
	return bucketize(list);
});

// ============ 派生：当前月份的 6×7 网格 ============
type Cell = {
	key: string; // 唯一 key
	dateKey: string; // "YYYY-MM-DD"
	day: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	lunarStr: string;
	events: CalendarEvent[];
};

const cells = $derived.by<Cell[]>(() => {
	const firstOfMonth = new Date(displayYear, displayMonth, 1);
	const firstWeekday = firstOfMonth.getDay(); // 0=Sun
	const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

	// 上月末尾若干天 + 当月 + 下月开头若干天，凑齐 6×7=42
	const out: Cell[] = [];

	// 上月填充
	const prevMonthDays = new Date(displayYear, displayMonth, 0).getDate();
	for (let i = firstWeekday - 1; i >= 0; i--) {
		const d = prevMonthDays - i;
		const year = displayMonth === 0 ? displayYear - 1 : displayYear;
		const month = displayMonth === 0 ? 12 : displayMonth;
		const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		out.push({
			key: `prev-${dateKey}`,
			dateKey,
			day: d,
			isCurrentMonth: false,
			isToday: dateKey === todayKey,
			lunarStr: showLunar ? getLunarDayChinese(year, month, d) : "",
			events: bucket[dateKey] || [],
		});
	}

	// 当月
	for (let d = 1; d <= daysInMonth; d++) {
		const dateKey = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		out.push({
			key: `cur-${dateKey}`,
			dateKey,
			day: d,
			isCurrentMonth: true,
			isToday: dateKey === todayKey,
			lunarStr: showLunar
				? getLunarDayChinese(displayYear, displayMonth + 1, d)
				: "",
			events: bucket[dateKey] || [],
		});
	}

	// 下月填充至 42
	let nextDay = 1;
	while (out.length < 42) {
		const year = displayMonth === 11 ? displayYear + 1 : displayYear;
		const month = displayMonth === 11 ? 1 : displayMonth + 2;
		const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
		out.push({
			key: `next-${dateKey}`,
			dateKey,
			day: nextDay,
			isCurrentMonth: false,
			isToday: dateKey === todayKey,
			lunarStr: showLunar ? getLunarDayChinese(year, month, nextDay) : "",
			events: bucket[dateKey] || [],
		});
		nextDay++;
	}

	return out;
});

// 标题（年月）
const headerLabel = $derived(
	`${displayYear}${i18n(I18nKey.year)} ${monthNames[displayMonth]}`,
);

// 是否需要显示"回到今日"按钮
const showBackToToday = $derived(
	!(
		displayYear === today.getFullYear() &&
		displayMonth === today.getMonth() &&
		selectedDateKey === todayKey
	),
);

// ============ 交互 ============
function prevMonth() {
	if (displayMonth === 0) {
		displayMonth = 11;
		displayYear--;
	} else {
		displayMonth--;
	}
}

function nextMonth() {
	if (displayMonth === 11) {
		displayMonth = 0;
		displayYear++;
	} else {
		displayMonth++;
	}
}

function backToToday() {
	displayYear = today.getFullYear();
	displayMonth = today.getMonth();
	selectDate(todayKey);
}

function selectDate(dateKey: string) {
	selectedDateKey = dateKey;
	window.dispatchEvent(
		new CustomEvent("calendar:selected", { detail: dateKey }),
	);
}

function selectCell(cell: Cell) {
	// 点击非当月格子时跳转到对应月
	if (!cell.isCurrentMonth) {
		const [y, m] = cell.dateKey.split("-").map((s) => Number.parseInt(s, 10));
		displayYear = y;
		displayMonth = m - 1;
	}
	selectDate(cell.dateKey);
}

// ============ 接收 EventOverview 的"选择日期"事件 ============
function handleExternalSelect(e: Event) {
	const ce = e as CustomEvent<string>;
	const dateKey = ce.detail;
	if (!dateKey) return;
	const [y, m] = dateKey.split("-").map((s) => Number.parseInt(s, 10));
	if (Number.isNaN(y) || Number.isNaN(m)) return;
	displayYear = y;
	displayMonth = m - 1;
	selectedDateKey = dateKey;
	// 转发为"已选中"事件供详情面板监听
	window.dispatchEvent(
		new CustomEvent("calendar:selected", { detail: dateKey }),
	);
}

onMount(() => {
	window.addEventListener("calendar:select-date", handleExternalSelect);
	// 初始化时通知详情面板默认选中今日
	window.dispatchEvent(
		new CustomEvent("calendar:selected", { detail: selectedDateKey }),
	);
});

onDestroy(() => {
	if (typeof window === "undefined") return;
	window.removeEventListener("calendar:select-date", handleExternalSelect);
});

// 单元格内最多显示几个事件胶囊（剩余以 +N 显示）
const MAX_CHIPS_DESKTOP = 3;
function visibleEvents(events: CalendarEvent[]) {
	return events.slice(0, MAX_CHIPS_DESKTOP);
}
function overflowCount(events: CalendarEvent[]) {
	return Math.max(0, events.length - MAX_CHIPS_DESKTOP);
}

// 单元格事件圆点颜色（移动端用）
function uniqueDots(events: CalendarEvent[]): EventType[] {
	const seen = new Set<EventType>();
	const out: EventType[] = [];
	for (const e of events) {
		if (!seen.has(e.type)) {
			seen.add(e.type);
			out.push(e.type);
		}
	}
	return out;
}
</script>

<section class="calendar-grid-wrap">
	<!-- 月份导航 -->
	<div class="flex items-center justify-between mb-4">
		<button
			type="button"
			class="nav-btn"
			onclick={prevMonth}
			aria-label="Previous month"
		>
			<Icon icon="material-symbols:chevron-left" />
		</button>

		<div class="text-lg font-bold text-neutral-900 dark:text-neutral-100 select-none">
			{headerLabel}
		</div>

		<div class="flex items-center gap-2">
			{#if showBackToToday}
				<button
					type="button"
					class="back-today-btn"
					onclick={backToToday}
					aria-label={i18n(I18nKey.calendarBackToToday)}
				>
					<Icon icon="material-symbols:today" />
					<span class="hidden sm:inline">{i18n(I18nKey.calendarBackToToday)}</span>
				</button>
			{/if}
			<button
				type="button"
				class="nav-btn"
				onclick={nextMonth}
				aria-label="Next month"
			>
				<Icon icon="material-symbols:chevron-right" />
			</button>
		</div>
	</div>

	<!-- 星期标题 -->
	<div class="weekday-row">
		{#each weekDays as wd, i (wd + i)}
			<div
				class="text-center text-xs font-medium uppercase tracking-wide py-2 {i === 0 || i === 6 ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'}"
			>
				{wd}
			</div>
		{/each}
	</div>

	<!-- 6×7 网格 -->
	<div class="cells-grid">
		{#each cells as cell (cell.key)}
			{@const isSelected = cell.dateKey === selectedDateKey}
			<button
				type="button"
				class="day-cell"
				class:is-current={cell.isCurrentMonth}
				class:is-other={!cell.isCurrentMonth}
				class:is-today={cell.isToday}
				class:is-selected={isSelected}
				onclick={() => selectCell(cell)}
			>
				<!-- 日期 + 农历 -->
				<div class="cell-header">
					<span class="day-num">{cell.day}</span>
					{#if cell.lunarStr}
						<span class="lunar-num">{cell.lunarStr}</span>
					{/if}
				</div>

				<!-- 事件胶囊（桌面/平板） -->
				<div class="cell-events">
					{#each visibleEvents(cell.events) as ev (ev.title + ev.type)}
						{@const meta = eventTypeMeta[ev.type]}
						<div class="event-chip {meta.chipClass}">
							<span class="chip-bar {meta.barClass}"></span>
							<span class="chip-title truncate">{ev.title}</span>
						</div>
					{/each}
					{#if overflowCount(cell.events) > 0}
						<div class="more-chip">
							+{overflowCount(cell.events)} {i18n(I18nKey.calendarMore)}
						</div>
					{/if}
				</div>

				<!-- 事件圆点（仅移动端） -->
				{#if cell.events.length > 0}
					<div class="cell-dots">
						{#each uniqueDots(cell.events) as t (t)}
							{@const meta = eventTypeMeta[t]}
							<span class="dot {meta.dotClass}"></span>
						{/each}
					</div>
				{/if}
			</button>
		{/each}
	</div>
</section>

<style>
	.calendar-grid-wrap {
		width: 100%;
	}

	.nav-btn,
	.back-today-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		height: 2rem;
		padding: 0 0.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgb(229 229 229);
		background: white;
		color: rgb(64 64 64);
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.nav-btn {
		width: 2rem;
		padding: 0;
	}

	:global(.dark) .nav-btn,
	:global(.dark) .back-today-btn {
		border-color: rgb(38 38 38);
		background: rgb(23 23 23);
		color: rgb(212 212 212);
	}

	.nav-btn:hover,
	.back-today-btn:hover {
		border-color: rgb(23 23 23);
		color: rgb(23 23 23);
	}

	:global(.dark) .nav-btn:hover,
	:global(.dark) .back-today-btn:hover {
		border-color: rgb(245 245 245);
		color: rgb(245 245 245);
	}

	.weekday-row {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		border-bottom: 1px solid rgb(229 229 229);
	}
	:global(.dark) .weekday-row {
		border-color: rgb(38 38 38);
	}

	.cells-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}

	.day-cell {
		min-height: 100px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 0.375rem;
		gap: 0.25rem;
		text-align: left;
		background: white;
		border-right: 1px solid rgb(229 229 229);
		border-bottom: 1px solid rgb(229 229 229);
		transition: background-color 0.15s ease;
		cursor: pointer;
		position: relative;
	}
	:global(.dark) .day-cell {
		background: rgb(23 23 23);
		border-color: rgb(38 38 38);
	}

	/* 行末单元格无右边框 */
	.day-cell:nth-child(7n) {
		border-right: none;
	}
	/* 最后一行无下边框 */
	.day-cell:nth-last-child(-n + 7) {
		border-bottom: none;
	}

	.day-cell:hover {
		background: rgb(250 250 250);
	}
	:global(.dark) .day-cell:hover {
		background: rgb(38 38 38);
	}

	.day-cell.is-other .day-num,
	.day-cell.is-other .lunar-num {
		color: rgb(212 212 212);
	}
	:global(.dark) .day-cell.is-other .day-num,
	:global(.dark) .day-cell.is-other .lunar-num {
		color: rgb(82 82 82);
	}

	.day-cell.is-today {
		background: rgb(245 245 245);
	}
	:global(.dark) .day-cell.is-today {
		background: rgb(38 38 38);
	}

	.day-cell.is-selected {
		outline: 2px solid rgb(23 23 23);
		outline-offset: -2px;
		z-index: 1;
	}
	:global(.dark) .day-cell.is-selected {
		outline-color: rgb(245 245 245);
	}

	.cell-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem;
	}

	.day-num {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgb(38 38 38);
		line-height: 1;
	}
	:global(.dark) .day-num {
		color: rgb(229 229 229);
	}

	.day-cell.is-today .day-num {
		color: rgb(23 23 23);
		font-weight: 800;
	}
	:global(.dark) .day-cell.is-today .day-num {
		color: rgb(250 250 250);
	}

	.lunar-num {
		font-size: 0.625rem;
		color: rgb(163 163 163);
		line-height: 1;
	}
	:global(.dark) .lunar-num {
		color: rgb(115 115 115);
	}

	.cell-events {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		overflow: hidden;
	}

	.event-chip {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.0625rem 0.25rem;
		border-radius: 0.1875rem;
		font-size: 0.625rem;
		line-height: 1;
		min-height: 14px;
		overflow: hidden;
	}

	.chip-bar {
		display: inline-block;
		width: 2px;
		height: 10px;
		border-radius: 1px;
		flex-shrink: 0;
	}

	.chip-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.more-chip {
		font-size: 0.5625rem;
		color: rgb(115 115 115);
		padding: 0 0.25rem;
		line-height: 1;
	}
	:global(.dark) .more-chip {
		color: rgb(163 163 163);
	}

	.cell-dots {
		display: none;
		gap: 2px;
		justify-content: center;
		margin-top: auto;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* ============ 响应式 ============ */
	@media (max-width: 1023px) {
		.day-cell {
			min-height: 80px;
			padding: 0.25rem;
		}
		.event-chip .chip-title {
			max-width: 100%;
		}
	}

	@media (max-width: 767px) {
		.day-cell {
			min-height: 52px;
			padding: 0.25rem 0.125rem;
			gap: 0.125rem;
			align-items: center;
		}
		.cell-header {
			justify-content: center;
			flex-direction: column;
			gap: 0;
		}
		.day-num {
			font-size: 0.8125rem;
		}
		.lunar-num {
			font-size: 0.5rem;
		}
		.cell-events {
			display: none;
		}
		.cell-dots {
			display: flex;
		}
	}
</style>
