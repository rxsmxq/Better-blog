<script lang="ts">
import { onMount } from "svelte";
import type { GuestbookMessage } from "@/types/guestbook";
import {
	fetchGuestbookMessages,
	voteGuestbookMessage,
} from "@/utils/guestbook-api";

/**
 * 留言板卡片堆叠拖拽组件
 * 参考 neuro.lubeiluchen.cc 的卡片交互设计
 * 左右滑动 = 赞同/反对，上下滑动 = 中立
 */

interface Props {
	messages?: GuestbookMessage[];
}

let { messages: initialMessages = [] }: Props = $props();

// 初始时为空，由 onMount 逐张发牌入场
let allMessages = $state<GuestbookMessage[]>([]);
let isInitialDealing = $state(true);
// 分页偏移量
let listOffset = $state(0);
let totalMessages = $state(0);
let isLoading = $state(false);

// 当前显示的卡片索引
let currentIndex = $state(0);
// 拖拽状态
let isDragging = $state(false);
let startX = $state(0);
let startY = $state(0);
let currentX = $state(0);
let currentY = $state(0);
// 飞出动画 — 独立于拖拽，避免被重置回 0
let flyOutTransform = $state<string | null>(null);
// 投票统计
let votes = $state<Record<string, "agree" | "disagree" | "neutral">>({});
// 新卡片入场动画偏移
let enteringCardId = $state<string | null>(null);
let enterTransform = $state<string | null>(null);
// 卡片引用
let cardRef = $state<HTMLDivElement | null>(null);
// 动画帧ID
let rafId: number | null = null;
// 获取当前可见的卡片（最多5张）
let visibleCards = $derived(
	allMessages.slice(currentIndex, currentIndex + 5).map((msg, i) => ({
		...msg,
		stackIndex: i,
	})),
);

// 判断投票类型
let voteType = $derived<"agree" | "disagree" | "neutral" | null>(
	Math.abs(currentX) > Math.abs(currentY)
		? currentX > 80
			? "agree"
			: currentX < -80
				? "disagree"
				: null
		: currentY < -80
			? "neutral"
			: null,
);

// 获取卡片样式
function getCardStyle(
	stackIndex: number,
	isActive: boolean,
	cx: number,
	cy: number,
	cardId?: string,
) {
	if (stackIndex === 0 && flyOutTransform) {
		return `${flyOutTransform}; z-index: 100;`;
	}

	if (stackIndex === 0 && isActive) {
		const rotate = cx * 0.05;
		return `transform: translate3d(${cx}px, ${cy}px, 0) rotate(${rotate}deg) scale(1.02); z-index: 100; opacity: 1; filter: none;`;
	}

	if (stackIndex === 0) {
		return "transform: translate3d(0px, 0px, 0px) scale(1) rotate(0deg); z-index: 100; opacity: 1; filter: none;";
	}

	if (cardId && enteringCardId === cardId && enterTransform) {
		return `${enterTransform} z-index: ${100 - stackIndex}; pointer-events: none;`;
	}

	const offset = stackIndex * 3;
	const scale = 1 - stackIndex * 0.03;
	const rotate = stackIndex * -1.8;
	const opacity = Math.max(0.5, 1 - stackIndex * 0.12);
	const brightness = `${Math.max(70, 100 - stackIndex * 8)}%`;
	const grayscale = `${Math.min(40, stackIndex * 10)}%`;

	return `transform: translate3d(${offset}px, ${offset * 5}px, -${stackIndex * 25}px) scale(${scale}) rotate(${rotate}deg); z-index: ${100 - stackIndex}; opacity: ${opacity}; filter: brightness(${brightness}) grayscale(${grayscale}); pointer-events: none;`;
}

// 获取卡片边框颜色类名
function getCardBorderColor(stackIndex: number, activeVote: typeof voteType) {
	if (stackIndex !== 0 || !activeVote) {
		if (stackIndex === 0) return "card-border-default";
		return "card-border-dim";
	}

	switch (activeVote) {
		case "agree":
			return "vote-border-agree";
		case "disagree":
			return "vote-border-disagree";
		case "neutral":
			return "vote-border-neutral";
		default:
			return "card-border-default";
	}
}

// 获取卡片背景发光样式
function getCardGlow(stackIndex: number, activeVote: typeof voteType) {
	if (stackIndex !== 0 || !activeVote) return "";

	switch (activeVote) {
		case "agree":
			return "box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);";
		case "disagree":
			return "box-shadow: 0 0 40px rgba(244, 63, 94, 0.4);";
		case "neutral":
			return "box-shadow: 0 0 30px rgba(234, 179, 8, 0.3);";
		default:
			return "";
	}
}

// 获取投票标签
function getVoteLabel(activeVote: typeof voteType) {
	if (!activeVote) return null;
	const labels = {
		agree: {
			text: "赞同 // AGREE",
			color: "text-emerald-400 border-emerald-500",
			position: "vote-label-top",
		},
		disagree: {
			text: "反对 // DISAGREE",
			color: "text-rose-400 border-rose-500",
			position: "vote-label-top-right",
		},
		neutral: {
			text: "中立 // OBSERVE",
			color: "text-yellow-400 border-yellow-500",
			position: "vote-label-center",
		},
	};
	return labels[activeVote];
}

// 处理触摸/鼠标按下
function handlePointerDown(e: PointerEvent) {
	const target = e.target as HTMLElement;
	if (target.closest("a, button, [data-no-drag]")) return;

	isDragging = true;
	startX = e.clientX;
	startY = e.clientY;
	currentX = 0;
	currentY = 0;

	if (cardRef) {
		cardRef.setPointerCapture(e.pointerId);
	}
}

// 处理触摸/鼠标移动 - 使用 requestAnimationFrame 节流
function handlePointerMove(e: PointerEvent) {
	if (!isDragging) return;

	if (rafId) cancelAnimationFrame(rafId);
	rafId = requestAnimationFrame(() => {
		currentX = e.clientX - startX;
		currentY = e.clientY - startY;
		rafId = null;
	});
}

// 处理触摸/鼠标释放 — 任何拖拽释放都执行飞出动画
function handlePointerUp() {
	if (!isDragging) return;
	isDragging = false;

	if (rafId) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}

	if (!visibleCards[0] || !cardRef) return;

	// 记录投票
	const currentCard = visibleCards[0];
	if (voteType) {
		votes[currentCard.id] = voteType;
		// 异步更新投票到后端
		voteGuestbookMessage(currentCard.id, voteType)
			.then((updated) => {
				const idx = allMessages.findIndex((m) => m.id === updated.id);
				if (idx !== -1) allMessages[idx] = updated;
			})
			.catch(() => {});
	}

	// 判断飞走方向
	const isHorizontal = Math.abs(currentX) >= Math.abs(currentY);
	const flyX = isHorizontal ? (currentX > 0 ? 700 : -700) : currentX;
	const flyY = isHorizontal ? currentY * 0.3 : currentY < 0 ? -600 : 600;

	// 设置飞出变换
	const rotate = currentX * 0.06;
	flyOutTransform = `transform: translate3d(${flyX}px, ${flyY}px, 0) rotate(${rotate}deg) scale(0.85); transition: transform 0.45s cubic-bezier(0.22, 0.68, 0.25, 1), opacity 0.45s; opacity: 0;`;

	// 动画结束后移除卡片并重置
	setTimeout(() => {
		currentIndex++;
		currentX = 0;
		currentY = 0;
		flyOutTransform = null;

		// 5张卡片全部飞走后，逐张补充新卡片
		if (visibleCards.length === 0) {
			refillCards();
		}
	}, 450);
}

// 发牌动效：从 API 获取下一页卡片并逐张飞入
async function refillCards() {
	if (isLoading) return;
	isLoading = true;

	// 如果已经加载完所有数据，从头循环
	if (listOffset >= totalMessages && totalMessages > 0) {
		listOffset = 0;
	}

	try {
		const { messages, total } = await fetchGuestbookMessages(listOffset, 5);
		totalMessages = total;
		listOffset += messages.length;

		if (messages.length === 0) return;

		// 清空，准备发牌
		allMessages = [];
		currentIndex = 0;
		enteringCardId = null;
		enterTransform = null;

		const entryTrajectories = [
			{ x: -600, y: 50, rot: -25 },
			{ x: 600, y: -30, rot: 20 },
			{ x: 0, y: -500, rot: -10 },
			{ x: -450, y: -350, rot: 30 },
			{ x: 500, y: 300, rot: -18 },
		];

		// 逐张发牌
		for (let i = 0; i < messages.length; i++) {
			setTimeout(() => {
				const traj = entryTrajectories[i % entryTrajectories.length];

				enteringCardId = messages[i].id;
				enterTransform = `transform: translate3d(${traj.x}px, ${traj.y}px, 0) rotate(${traj.rot}deg) scale(0.6); opacity: 0;`;

				allMessages = [...allMessages, messages[i]];

				requestAnimationFrame(() => {
					enteringCardId = null;
					enterTransform = null;
				});
			}, i * 220);
		}
	} catch (err) {
		console.error("Failed to load guestbook messages:", err);
	} finally {
		isLoading = false;
	}
}

// 初始发牌动效：从 API 获取首批卡片并逐张飞入
onMount(async () => {
	try {
		const { messages, total } = await fetchGuestbookMessages(0, 5);
		totalMessages = total;
		listOffset = messages.length;

		if (messages.length === 0) {
			isInitialDealing = false;
			return;
		}

		const entryTrajectories = [
			{ x: -600, y: 50, rot: -25 },
			{ x: 600, y: -30, rot: 20 },
			{ x: 0, y: -500, rot: -10 },
			{ x: -450, y: -350, rot: 30 },
			{ x: 500, y: 300, rot: -18 },
		];

		for (let i = 0; i < messages.length; i++) {
			setTimeout(() => {
				const traj = entryTrajectories[i % entryTrajectories.length];

				enteringCardId = messages[i].id;
				enterTransform = `transform: translate3d(${traj.x}px, ${traj.y}px, 0) rotate(${traj.rot}deg) scale(0.6); opacity: 0;`;

				allMessages = [...allMessages, messages[i]];

				requestAnimationFrame(() => {
					enteringCardId = null;
					enterTransform = null;
				});
			}, i * 220);
		}

		// 发牌完成后标记结束
		setTimeout(
			() => {
				isInitialDealing = false;
			},
			messages.length * 220 + 500,
		);
	} catch (err) {
		console.error("Failed to load initial guestbook messages:", err);
		isInitialDealing = false;
	}
});

// 打开详情弹窗 — 通过事件通知页面级弹窗
function openDetail(card: GuestbookMessage, e: Event) {
	e.stopPropagation();
	window.dispatchEvent(
		new CustomEvent("guestbook:open-detail", { detail: card }),
	);
}

// 处理新留言事件（由发表留言弹窗触发）
function handleNewMessage(e: CustomEvent<GuestbookMessage>) {
	const msg = e.detail;
	if (!msg) return;
	allMessages = [msg, ...allMessages];
	totalMessages++;
}

// 键盘支持
function handleKeyDown(e: KeyboardEvent) {
	if (visibleCards.length === 0) return;

	const currentCard = visibleCards[0];
	switch (e.key) {
		case "ArrowRight":
			votes[currentCard.id] = "agree";
			voteGuestbookMessage(currentCard.id, "agree")
				.then((updated) => {
					const idx = allMessages.findIndex((m) => m.id === updated.id);
					if (idx !== -1) allMessages[idx] = updated;
				})
				.catch(() => {});
			swipeCard(300, 0);
			break;
		case "ArrowLeft":
			votes[currentCard.id] = "disagree";
			voteGuestbookMessage(currentCard.id, "disagree")
				.then((updated) => {
					const idx = allMessages.findIndex((m) => m.id === updated.id);
					if (idx !== -1) allMessages[idx] = updated;
				})
				.catch(() => {});
			swipeCard(-300, 0);
			break;
		case "ArrowUp":
			votes[currentCard.id] = "neutral";
			voteGuestbookMessage(currentCard.id, "neutral")
				.then((updated) => {
					const idx = allMessages.findIndex((m) => m.id === updated.id);
					if (idx !== -1) allMessages[idx] = updated;
				})
				.catch(() => {});
			swipeCard(0, -300);
			break;
	}
}

// 程序化滑动卡片
function swipeCard(x: number, y: number) {
	if (!cardRef) return;

	const flyX = x > 0 ? 700 : -700;
	const flyY = y < 0 ? -600 : 600;
	const rotate = x * 0.06;
	flyOutTransform = `transform: translate3d(${flyX}px, ${flyY}px, 0) rotate(${rotate}deg) scale(0.85); transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s; opacity: 0;`;

	setTimeout(() => {
		currentIndex++;
		flyOutTransform = null;
		if (visibleCards.length === 0) {
			refillCards();
		}
	}, 500);
}
</script>

<svelte:window onkeydown={handleKeyDown} onguestbooknew={handleNewMessage} />

<div class="guestbook-card-stack">
	<!-- 背景装饰 -->
	<div class="stack-bg-decoration"></div>

	<!-- 卡片容器 -->
	<div class="cards-container">
		{#each visibleCards as card (card.id)}
			{#if card.stackIndex === 0}
				<div
					class="message-card top-card"
					class:is-dragging={isDragging}
					class:no-transition={isDragging}
					style="{getCardStyle(card.stackIndex, isDragging, currentX, currentY, card.id)} {getCardGlow(card.stackIndex, voteType)}"
					bind:this={cardRef}
					onpointerdown={handlePointerDown}
					onpointermove={handlePointerMove}
					onpointerup={handlePointerUp}
					onpointercancel={handlePointerUp}
					role="button"
					tabindex="0"
					aria-label="留言卡片，拖拽投票"
				>
					<!-- 卡片内容 -->
					<div class="card-inner {getCardBorderColor(card.stackIndex, voteType)}">
						<!-- 角标装饰 -->
						<div class="corner-mark top-left"></div>
						<div class="corner-mark top-right"></div>
						<div class="corner-mark bottom-left"></div>
						<div class="corner-mark bottom-right"></div>

						<!-- 头部 -->
						<div class="card-header">
							<div class="header-bg"></div>
							<div class="header-content">
								<div class="author-info">
									<div class="author-avatar"></div>
									<span class="author-name">{card.author}</span>
								</div>
								<span class="message-time">{card.time}</span>
							</div>
						</div>

						<!-- 主体内容 -->
						<div class="card-body">
							<div class="body-line"></div>
							<div class="body-content">
								<div class="source-tag">
									<span>SOURCE :: Guestbook</span>
								</div>
								<h3 class="message-title">留言 #{card.id.split("_")[1]}</h3>
								<div class="title-underline"></div>
								<p class="message-text">{card.content}</p>
							</div>
						</div>

						<!-- 投票统计 -->
						<div class="card-votes">
							<span class="card-vote agree">&#9650; {card.votes.agree}</span>
							<span class="card-vote neutral">&#9644; {card.votes.neutral}</span>
							<span class="card-vote disagree">&#9660; {card.votes.disagree}</span>
						</div>

						<!-- 底部 -->
						<div class="card-footer" data-no-drag onclick={(e) => openDetail(card, e)} onkeydown={(e) => e.key === "Enter" && openDetail(card, e)} role="button" tabindex="0">
							<div class="footer-bars">
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
							</div>
							<span class="footer-text">读取档案 >></span>
						</div>

						<!-- 投票标签 -->
						{#if isDragging && voteType}
							{@const label = getVoteLabel(voteType)}
							{#if label}
								<div class="vote-label {label.color} {label.position}">
									{label.text}
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{:else}
				<div
					class="message-card"
					style="{getCardStyle(card.stackIndex, false, 0, 0, card.id)}"
					role="button"
					tabindex="-1"
					aria-label="留言卡片（不可交互）"
				>
					<!-- 卡片内容 -->
					<div class="card-inner {getCardBorderColor(card.stackIndex, null)}">
						<!-- 角标装饰 -->
						<div class="corner-mark top-left"></div>
						<div class="corner-mark top-right"></div>
						<div class="corner-mark bottom-left"></div>
						<div class="corner-mark bottom-right"></div>

						<!-- 头部 -->
						<div class="card-header">
							<div class="header-bg"></div>
							<div class="header-content">
								<div class="author-info">
									<div class="author-avatar"></div>
									<span class="author-name">{card.author}</span>
								</div>
								<span class="message-time">{card.time}</span>
							</div>
						</div>

						<!-- 主体内容 -->
						<div class="card-body">
							<div class="body-line"></div>
							<div class="body-content">
								<div class="source-tag">
									<span>SOURCE :: Guestbook</span>
								</div>
								<h3 class="message-title">留言 #{card.id.split("_")[1]}</h3>
								<div class="title-underline"></div>
								<p class="message-text">{card.content}</p>
							</div>
						</div>

						<!-- 投票统计 -->
						<div class="card-votes">
							<span class="card-vote agree">&#9650; {card.votes.agree}</span>
							<span class="card-vote neutral">&#9644; {card.votes.neutral}</span>
							<span class="card-vote disagree">&#9660; {card.votes.disagree}</span>
						</div>

						<!-- 底部 -->
						<div class="card-footer" data-no-drag onclick={(e) => openDetail(card, e)} onkeydown={(e) => e.key === "Enter" && openDetail(card, e)} role="button" tabindex="0">
							<div class="footer-bars">
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
								<div class="bar"></div>
							</div>
							<span class="footer-text">读取档案 >></span>
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>


	<!-- 投票提示 -->
	<div class="swipe-hint">
		<div class="hint-item">
			<span class="hint-key">←</span>
			<span class="hint-text">反对</span>
		</div>
		<div class="hint-item">
			<span class="hint-key">↑</span>
			<span class="hint-text">中立</span>
		</div>
		<div class="hint-item">
			<span class="hint-key">→</span>
			<span class="hint-text">赞同</span>
		</div>
	</div>

	<!-- 空状态 -->
	{#if visibleCards.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📭</div>
			<div class="empty-text">暂无更多留言</div>
			<div class="empty-subtext">成为第一个留言的人吧</div>
		</div>
	{/if}

</div>

<style>
	.guestbook-card-stack {
		--card-bg: #ffffff;
		--card-border: #18181b;
		--card-text: #18181b;
		--card-text-secondary: #52525b;
		--card-accent: #18181b;
		--card-line: #d4d4d8;
		--card-corner-bg: #f4f4f5;
		--card-footer-bg: #18181b;
		--card-footer-text: #ffffff;
		--card-overlay-bg: rgba(0, 0, 0, 0.6);
		--card-modal-overlay: rgba(0, 0, 0, 0.5);
	}

	:root.dark .guestbook-card-stack {
		--card-bg: #18181b;
		--card-border: #52525b;
		--card-text: #fafafa;
		--card-text-secondary: #a1a1aa;
		--card-accent: #fafafa;
		--card-line: #27272a;
		--card-corner-bg: #27272a;
		--card-footer-bg: #fafafa;
		--card-footer-text: #000000;
		--card-overlay-bg: rgba(0, 0, 0, 0.75);
		--card-modal-overlay: rgba(0, 0, 0, 0.75);
	}

	.guestbook-card-stack {
		position: relative;
		width: 100%;
		min-height: 620px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 2px solid var(--card-border);
		border-radius: 16px;
		padding: 20px;
	}

	.stack-bg-decoration {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(ellipse at 50% 50%, rgba(128, 128, 128, 0.05) 0%, transparent 70%);
	}

	.vote-arrow {
		font-size: 1rem;
		font-weight: 700;
	}

	/* 卡片容器 */
	.cards-container {
		position: relative;
		width: 80%;
		max-width: 320px;
		height: 400px;
		display: flex;
		justify-content: center;
		align-items: center;
		perspective: 1200px;
	}

	/* 卡片 */
	.message-card {
		position: absolute;
		width: 100%;
		height: 100%;
		touch-action: none;
		user-select: none;
		will-change: transform, opacity;
		transition: transform 0.5s cubic-bezier(0.22, 0.68, 0.25, 1),
					opacity 0.5s cubic-bezier(0.22, 0.68, 0.25, 1),
					filter 0.5s cubic-bezier(0.22, 0.68, 0.25, 1),
					box-shadow 0.3s;
	}

	.message-card.no-transition {
		transition: none !important;
	}

	.message-card.top-card {
		cursor: grab;
	}

	.message-card.top-card:active {
		cursor: grabbing;
	}

	.card-inner {
		position: relative;
		width: 100%;
		height: 100%;
		background: var(--card-bg);
		border: 4px solid var(--card-border);
		border-radius: 0.5rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: border-color 0.3s, box-shadow 0.3s;
	}

	.card-inner.card-border-default {
		border-color: var(--card-border);
	}

	.card-inner.card-border-dim {
		border-color: var(--card-line);
	}

	.card-inner.vote-border-agree {
		border-color: #10b981;
	}

	.card-inner.vote-border-disagree {
		border-color: #f43f5e;
	}

	.card-inner.vote-border-neutral {
		border-color: #eab308;
	}

	.card-inner.vote-border-agree .card-footer {
		background: #10b981;
	}

	.card-inner.vote-border-disagree .card-footer {
		background: #f43f5e;
	}

	.card-inner.vote-border-neutral .card-footer {
		background: #eab308;
	}

	.card-inner.vote-border-agree .card-footer .bar,
	.card-inner.vote-border-disagree .card-footer .bar,
	.card-inner.vote-border-neutral .card-footer .bar {
		background: #000;
	}

	.card-inner.vote-border-agree .card-footer .footer-text,
	.card-inner.vote-border-disagree .card-footer .footer-text,
	.card-inner.vote-border-neutral .card-footer .footer-text {
		color: #000;
	}

	/* 角标 */
	.corner-mark {
		position: absolute;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		border: 1px solid var(--card-border);
		background: var(--card-corner-bg);
		z-index: 20;
	}

	.corner-mark::after {
		content: "";
		position: absolute;
		inset: 0;
		margin: auto;
		width: 60%;
		height: 1px;
		background: var(--card-border);
		transform: rotate(45deg);
	}

	.corner-mark.top-left { top: 0.5rem; left: 0.5rem; }
	.corner-mark.top-right { top: 0.5rem; right: 0.5rem; }
	.corner-mark.bottom-left { bottom: 0.5rem; left: 0.5rem; }
	.corner-mark.bottom-right { bottom: 0.5rem; right: 0.5rem; }

	/* 头部 */
	.card-header {
		position: relative;
		height: 3.5rem;
		border-bottom: 2px solid;
		border-color: inherit;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		overflow: hidden;
	}

	.header-bg {
		position: absolute;
		inset: 0;
		opacity: 0.06;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 5px,
			var(--card-text) 5px,
			var(--card-text) 10px
		);
	}

	.header-content {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.author-avatar {
		width: 0.75rem;
		height: 0.75rem;
		background: var(--card-accent);
		border-radius: 0.125rem;
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.author-name {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: var(--card-accent);
	}

	.message-time {
		font-size: 0.65rem;
		font-family: ui-monospace, monospace;
		opacity: 0.6;
		color: var(--card-text-secondary);
	}

	/* 主体 */
	.card-body {
		position: relative;
		flex: 1;
		padding: 1.5rem;
		display: flex;
		overflow: hidden;
	}

	.body-line {
		position: absolute;
		left: 1rem;
		top: 1.5rem;
		bottom: 1.5rem;
		width: 1px;
		background: var(--card-line);
	}

	.body-content {
		padding-left: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.source-tag {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		border: 1px solid #06b6d4;
		color: #06b6d4;
		width: fit-content;
		margin-bottom: 0.75rem;
	}

	.message-title {
		font-size: 1.125rem;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 0.75rem;
		color: var(--card-text);
		text-transform: uppercase;
		letter-spacing: -0.02em;
	}

	.title-underline {
		width: 3rem;
		height: 1px;
		background: var(--card-accent);
		margin-bottom: 1rem;
	}

	.message-text {
		font-size: 0.85rem;
		line-height: 1.7;
		font-family: ui-monospace, monospace;
		color: var(--card-text-secondary);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 5;
		-webkit-box-orient: vertical;
	}

	/* 卡片内投票统计 */
	.card-votes {
		padding: 0 1.5rem 0.75rem;
		display: flex;
		gap: 1rem;
	}

	.card-vote {
		font-size: 0.6rem;
		font-family: ui-monospace, monospace;
		letter-spacing: 0.05em;
	}

	.card-vote.agree { color: #34d399; }
	.card-vote.neutral { color: #eab308; }
	.card-vote.disagree { color: #fb7185; }

	/* 底部 */
	.card-footer {
		height: 2.5rem;
		border-top: 2px solid;
		border-color: inherit;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		background: var(--card-footer-bg);
		cursor: pointer;
		transition: filter 0.2s;
	}

	.card-footer:hover {
		filter: brightness(1.1);
	}

	.footer-bars {
		display: flex;
		gap: 0.25rem;
	}

	.bar {
		width: 0.25rem;
		height: 1rem;
		background: var(--card-footer-text);
		opacity: 0.4;
	}

	.footer-text {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--card-footer-text);
	}

	/* 投票标签 */
	.vote-label {
		position: absolute;
		z-index: 30;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: var(--card-overlay-bg);
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease;
	}

	.vote-label-top {
		top: 0.5rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.5rem 1.5rem;
		border: 2px solid;
		border-radius: 0.25rem;
		font-size: 0.9rem;
	}

	.vote-label-top-right {
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.5rem 1rem;
		border: 2px solid;
		border-radius: 0.25rem;
		font-size: 0.9rem;
	}

	.vote-label-center {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: 0.75rem 2rem;
		border: 2px solid;
		border-radius: 0.25rem;
		font-size: 1.1rem;
	}

	.vote-label.text-emerald-400 { color: #34d399; border-color: #10b981; }
	.vote-label.text-rose-400 { color: #fb7185; border-color: #f43f5e; }
	.vote-label.text-yellow-400 { color: #facc15; border-color: #eab308; }

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* 空状态 */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: #71717a;
		padding: 4rem 0;
	}

	.empty-icon {
		font-size: 3rem;
		opacity: 0.5;
	}

	.empty-text {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.empty-subtext {
		font-size: 0.875rem;
		opacity: 0.7;
	}

	/* 操作提示 */
	.swipe-hint {
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 1.5rem;
		z-index: 10;
		opacity: 0.4;
		transition: opacity 0.3s;
	}

	.guestbook-card-stack:hover .swipe-hint {
		opacity: 0.8;
	}

	.hint-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #71717a;
	}

	.hint-key {
		padding: 0.125rem 0.375rem;
		border: 1px solid #3f3f46;
		border-radius: 0.25rem;
		font-family: ui-monospace, monospace;
		font-size: 0.65rem;
	}

	/* 响应式 */
	@media (max-width: 640px) {
		.guestbook-card-stack {
			min-height: 440px;
		}

		.cards-container {
			height: 380px;
		}

		.card-body {
			padding: 1rem;
		}

		.message-title {
			font-size: 1rem;
		}

		.message-text {
			font-size: 0.8rem;
			-webkit-line-clamp: 4;
		}

		.detail-modal {
			max-width: 100%;
			width: 95%;
		}

		.detail-body {
			padding: 1.25rem;
		}

		.detail-text {
			font-size: 0.9rem;
		}

		.detail-header {
			padding: 0 1.25rem;
		}

		.swipe-hint {
			gap: 1rem;
		}
	}
</style>
