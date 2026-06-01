<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { GuestbookMessage } from "@/types/guestbook";
import { voteGuestbookMessage } from "@/utils/guestbook-api";

/**
 * 留言板卡片堆叠拖拽组件
 * 参考 neuro.lubeiluchen.cc 的卡片交互设计
 * 左右滑动 = 赞同/反对，上下滑动 = 中立
 * 数据通过 guestbook:data-update 事件从 GuestbookDataProvider 获取
 */

// 初始时为空，由 onMount 监听数据提供者逐张发牌入场
let allMessages = $state<GuestbookMessage[]>([]);
let isInitialDealing = $state(true);
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

// 动画与定时器管理，防止组件卸载时内存泄漏
let rafId: number | null = null;
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];
let handleNew: ((e: Event) => void) | null = null;
let handleDataUpdate: ((e: Event) => void) | null = null;

function safeSetTimeout(fn: () => void, ms: number) {
	const id = setTimeout(() => {
		fn();
		activeTimeouts = activeTimeouts.filter((t) => t !== id);
	}, ms);
	activeTimeouts.push(id);
	return id;
}

onDestroy(() => {
	if (rafId) cancelAnimationFrame(rafId);
	activeTimeouts.forEach((id) => {
		clearTimeout(id);
	});
	if (handleNew) {
		window.removeEventListener("guestbooknew", handleNew);
	}
	if (handleDataUpdate) {
		window.removeEventListener("guestbook:data-update", handleDataUpdate);
	}
});

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

	// 移除了 filter: brightness grayscale 提高渲染性能，由卡片内叠加 .card-overlay 替代
	return `transform: translate3d(${offset}px, ${offset * 5}px, -${stackIndex * 25}px) scale(${scale}) rotate(${rotate}deg); z-index: ${100 - stackIndex}; opacity: ${opacity}; pointer-events: none;`;
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

	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

// 提取公共的投票处理逻辑
async function submitVote(
	cardId: string,
	type: "agree" | "disagree" | "neutral",
) {
	votes[cardId] = type;
	try {
		const updated = await voteGuestbookMessage(cardId, type);
		const idx = allMessages.findIndex((m) => m.id === updated.id);
		if (idx !== -1) allMessages[idx] = updated;
	} catch (err) {
		console.error("Failed to submit vote:", err);
	}
}

// 处理触摸/鼠标释放 — 任何拖拽释放都执行飞出动画
function handlePointerUp() {
	if (!isDragging) return;
	isDragging = false;

	if (rafId) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}

	if (!visibleCards[0]) return;

	// 记录投票
	const currentCard = visibleCards[0];
	if (voteType) {
		submitVote(currentCard.id, voteType);
	}

	// 判断飞走方向
	const isHorizontal = Math.abs(currentX) >= Math.abs(currentY);
	const flyX = isHorizontal ? (currentX > 0 ? 700 : -700) : currentX;
	const flyY = isHorizontal ? currentY * 0.3 : currentY < 0 ? -600 : 600;

	// 设置飞出变换
	const rotate = currentX * 0.06;
	flyOutTransform = `transform: translate3d(${flyX}px, ${flyY}px, 0) rotate(${rotate}deg) scale(0.85); transition: transform 0.45s cubic-bezier(0.22, 0.68, 0.25, 1), opacity 0.45s; opacity: 0;`;

	// 动画结束后移除卡片并重置
	safeSetTimeout(() => {
		currentIndex++;
		currentX = 0;
		currentY = 0;
		flyOutTransform = null;

		if (visibleCards.length === 0) {
			const availableMessages = allMessages.slice(
				currentIndex,
				currentIndex + 5,
			);
			if (availableMessages.length > 0) {
				dealCards(availableMessages);
			}
		}
	}, 450);
}

// 发牌动效：从共享数据中获取下一批卡片并逐张飞入
function dealCards(messages: GuestbookMessage[]) {
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
		safeSetTimeout(() => {
			const traj = entryTrajectories[i % entryTrajectories.length];

			enteringCardId = messages[i].id;
			enterTransform = `transform: translate3d(${traj.x}px, ${traj.y}px, 0) rotate(${traj.rot}deg) scale(0.6); opacity: 0;`;

			allMessages.push(messages[i]);

			requestAnimationFrame(() => {
				enteringCardId = null;
				enterTransform = null;
			});
		}, i * 220);
	}
}

// 初始发牌动效：监听数据提供者的事件
onMount(() => {
	handleNew = (e: Event) => {
		handleNewMessage(e as CustomEvent<GuestbookMessage>);
	};
	window.addEventListener("guestbooknew", handleNew);

	handleDataUpdate = (e: Event) => {
		const detail = (e as CustomEvent).detail;
		if (!detail?.messages) return;

		totalMessages = detail.total || 0;

		// 首次加载或需要补充卡片时发牌
		if (allMessages.length === 0 && detail.messages.length > 0) {
			const messages = detail.messages.slice(0, 5);
			dealCards(messages);

			// 发牌完成后标记结束
			safeSetTimeout(
				() => {
					isInitialDealing = false;
				},
				messages.length * 220 + 500,
			);
		}
	};
	window.addEventListener("guestbook:data-update", handleDataUpdate);

	// 延迟触发数据请求，确保 GuestbookDataProvider 已挂载
	safeSetTimeout(() => {
		window.dispatchEvent(new CustomEvent("guestbook:request-data"));
	}, 50);
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
	// 将新留言插入到当前可见卡片的下一张位置，避免直接unshift导致currentIndex错位引发跳变
	if (visibleCards.length > 0) {
		allMessages.splice(currentIndex + 1, 0, msg);
	} else {
		allMessages.push(msg);
	}
	totalMessages++;
}

// 键盘支持
function handleKeyDown(e: KeyboardEvent) {
	const target = e.target as HTMLElement;
	if (
		!target ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable
	) {
		return;
	}

	if (visibleCards.length === 0) return;

	const currentCard = visibleCards[0];
	switch (e.key) {
		case "ArrowRight":
			submitVote(currentCard.id, "agree");
			swipeCard(300, 0);
			break;
		case "ArrowLeft":
			submitVote(currentCard.id, "disagree");
			swipeCard(-300, 0);
			break;
		case "ArrowUp":
			submitVote(currentCard.id, "neutral");
			swipeCard(0, -300);
			break;
	}
}

// 程序化滑动卡片
function swipeCard(x: number, y: number) {
	if (visibleCards.length === 0) return;

	const flyX = x > 0 ? 700 : -700;
	const flyY = y < 0 ? -600 : 600;
	const rotate = x * 0.06;
	flyOutTransform = `transform: translate3d(${flyX}px, ${flyY}px, 0) rotate(${rotate}deg) scale(0.85); transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s; opacity: 0;`;

	safeSetTimeout(() => {
		currentIndex++;
		flyOutTransform = null;
		if (visibleCards.length === 0) {
			// 卡片用完时，从当前数据重新发牌
			const availableMessages = allMessages.slice(
				currentIndex,
				currentIndex + 5,
			);
			if (availableMessages.length > 0) {
				dealCards(availableMessages);
			}
		}
	}, 500);
}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="guestbook-card-stack">
	<!-- 背景装饰 -->
	<div class="stack-bg-decoration"></div>

	<!-- 卡片容器 -->
	<div class="cards-container">
		{#each visibleCards as card (card.id)}
			<div
				class="message-card {card.stackIndex === 0 ? 'top-card' : ''}"
				class:is-dragging={card.stackIndex === 0 && isDragging}
				class:no-transition={card.stackIndex === 0 && isDragging}
				style="{getCardStyle(card.stackIndex, card.stackIndex === 0 && isDragging, currentX, currentY, card.id)} {getCardGlow(card.stackIndex, voteType)}"
				onpointerdown={card.stackIndex === 0 ? handlePointerDown : null}
				onpointermove={card.stackIndex === 0 ? handlePointerMove : null}
				onpointerup={card.stackIndex === 0 ? handlePointerUp : null}
				onpointercancel={card.stackIndex === 0 ? handlePointerUp : null}
				role="button"
				tabindex={card.stackIndex === 0 ? 0 : -1}
				aria-label={card.stackIndex === 0 ? "留言卡片，拖拽投票" : "留言卡片（不可交互）"}
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
							<h3 class="message-title">留言 #{card.id && card.id.includes('_') ? card.id.split("_")[1] : card.id}</h3>
							<div class="title-underline"></div>
							<p class="message-text">{card.content}</p>
						</div>
					</div>

					<!-- 投票统计 -->
					<div class="card-votes">
						<span class="card-vote agree"><Icon icon="material-symbols:thumb-up" size="sm" /> {card.votes.agree}</span>
						<span class="card-vote neutral"><Icon icon="material-symbols:remove" size="sm" /> {card.votes.neutral}</span>
						<span class="card-vote disagree"><Icon icon="material-symbols:thumb-down" size="sm" /> {card.votes.disagree}</span>
					</div>

					<!-- 底部 -->
					<div class="card-footer" data-no-drag onclick={(e) => openDetail(card, e)} onkeydown={(e) => e.key === "Enter" && openDetail(card, e)} role="button" tabindex="0">
						<span class="footer-text">读取档案 >></span>
					</div>

					<!-- 投票标签 -->
					{#if card.stackIndex === 0 && isDragging && voteType}
						{@const label = getVoteLabel(voteType)}
						{#if label}
							<div class="vote-label {label.color} {label.position}">
								{label.text}
							</div>
						{/if}
					{/if}

					<!-- 底层卡片遮罩层 (替代高开销的 filter: brightness) -->
					{#if card.stackIndex > 0}
						<div class="card-overlay" style="opacity: {Math.min(0.6, card.stackIndex * 0.15)}"></div>
					{/if}
				</div>
			</div>
		{/each}

		<!-- 空状态 -->
		{#if visibleCards.length === 0}
			<div class="empty-state">
				<div class="empty-icon"><Icon icon="material-symbols:mail-outline" size="xl" /></div>
				<div class="empty-text">暂无更多留言</div>
			</div>
		{/if}
	</div>

	<!-- 操作提示 -->
	<div class="swipe-hint">
		<div class="hint-item">
			<Icon icon="material-symbols:pan-tool" size="sm" />
			<span class="hint-text">拖拽翻看</span>
		</div>
	</div>

</div>

<style>
	.card-overlay {
		position: absolute;
		inset: 0;
		background: #000;
		pointer-events: none;
		z-index: 25;
		transition: opacity 0.5s cubic-bezier(0.22, 0.68, 0.25, 1);
	}

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
		justify-content: flex-end;
		padding: 0 1rem;
		background: var(--card-footer-bg);
		cursor: pointer;
		transition: filter 0.2s;
	}

	.card-footer:hover {
		filter: brightness(1.1);
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
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: #71717a;
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
	@media (max-width: 768px) {
		.guestbook-card-stack {
			min-height: auto;
			padding: 8px;
		}

		.cards-container {
			width: auto;
			max-width: 95%;
			height: 400px;
			aspect-ratio: 3 / 2;
		}

		.message-card,
		.card-inner {
			max-height: 400px;
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
