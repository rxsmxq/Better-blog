<script lang="ts">
/**
 * 留言板虚拟列表组件
 * - 虚拟滚动：只渲染可视区 + 缓冲区的列表项
 * - 展开动效：点击列表项丝滑展开/折叠，带动下方列表整体平滑移动
 * - 完整交互：投票（赞同/反对/中立），限制只能投一次
 * - 数据通过 guestbook:data-update 事件从 GuestbookDataProvider 获取
 */
import { onDestroy, onMount, tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { GuestbookMessage } from "@/types/guestbook";
import { voteGuestbookMessage } from "@/utils/guestbook-api";

// ===== 状态 =====
let allMessages = $state<GuestbookMessage[]>([]);
let containerRef = $state<HTMLDivElement | null>(null);
let scrollTop = $state(0);
let containerHeight = $state(0);
let expandedId = $state<string | null>(null);
let expandedHeights = $state<Record<string, number>>({});
let itemRefs = $state<Record<string, HTMLDivElement>>({});
let isVoting = $state<Record<string, boolean>>({});
let hasMore = $state(true);
let isLoading = $state(false);

// 已投票记录（本地存储，限制只能投一次）
let votedMessages = $state<Record<string, "agree" | "disagree" | "neutral">>(
	{},
);

// 动画中高度（用于平滑过渡）
let animatingHeights = $state<Record<string, number>>({});

// 虚拟列表配置
const ITEM_HEIGHT = 72; // 折叠状态列表项高度
const BUFFER_COUNT = 3; // 上下缓冲数量
const EXPANDED_EXTRA_HEIGHT = 160; // 展开额外高度估算（用于滚动计算）

// ===== 展开/折叠动效状态 =====
let transitioningId = $state<string | null>(null);

// ===== 获取列表项当前高度（考虑动画） =====
function getItemHeight(msg: GuestbookMessage): number {
	const animHeight = animatingHeights[msg.id];
	if (animHeight !== undefined) {
		return ITEM_HEIGHT + animHeight;
	}
	if (expandedId === msg.id) {
		return ITEM_HEIGHT + (expandedHeights[msg.id] || EXPANDED_EXTRA_HEIGHT);
	}
	return ITEM_HEIGHT;
}

// ===== 计算虚拟列表范围 =====
let totalHeight = $derived(
	allMessages.reduce((sum, msg) => sum + getItemHeight(msg), 0),
);

let visibleRange = $derived(() => {
	if (!containerRef) return { start: 0, end: allMessages.length };

	let accumulated = 0;
	let startIdx = 0;
	let endIdx = allMessages.length;

	// 找到 startIdx
	for (let i = 0; i < allMessages.length; i++) {
		const h = getItemHeight(allMessages[i]);
		if (accumulated + h > scrollTop) {
			startIdx = i;
			break;
		}
		accumulated += h;
	}

	// 找到 endIdx
	let visibleAccumulated = 0;
	for (let i = startIdx; i < allMessages.length; i++) {
		const h = getItemHeight(allMessages[i]);
		visibleAccumulated += h;
		if (visibleAccumulated >= containerHeight) {
			endIdx = i + 1;
			break;
		}
	}

	return {
		start: Math.max(0, startIdx - BUFFER_COUNT),
		end: Math.min(allMessages.length, endIdx + BUFFER_COUNT),
	};
});

// ===== 计算每个项目的偏移量 =====
function getItemOffset(index: number): number {
	let offset = 0;
	for (let i = 0; i < index; i++) {
		offset += getItemHeight(allMessages[i]);
	}
	return offset;
}

// ===== 滚动处理 =====
function handleScroll() {
	if (!containerRef) return;
	scrollTop = containerRef.scrollTop;
	checkLoadMore();
}

function handleResize() {
	if (!containerRef) return;
	containerHeight = containerRef.clientHeight;
}

// ===== 平滑动画高度 =====
function animateHeight(
	msgId: string,
	fromHeight: number,
	toHeight: number,
	duration: number,
	onComplete?: () => void,
) {
	const startTime = performance.now();

	function step(currentTime: number) {
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / duration, 1);
		// ease-out cubic
		const eased = 1 - (1 - progress) ** 3;
		const currentHeight = fromHeight + (toHeight - fromHeight) * eased;

		animatingHeights[msgId] = currentHeight;

		if (progress < 1) {
			requestAnimationFrame(step);
		} else {
			delete animatingHeights[msgId];
			onComplete?.();
		}
	}

	requestAnimationFrame(step);
}

// ===== 展开/折叠 =====
async function toggleExpand(msg: GuestbookMessage) {
	if (transitioningId) return; // 防止动效期间重复点击

	const isExpanding = expandedId !== msg.id;

	if (isExpanding) {
		// 展开
		transitioningId = msg.id;
		expandedId = msg.id;
		await tick();

		const el = itemRefs[msg.id];
		if (el) {
			const contentEl = el.querySelector(".expand-content") as HTMLElement;
			if (contentEl) {
				// 测量实际高度
				contentEl.style.maxHeight = "none";
				const actualHeight = contentEl.scrollHeight;
				expandedHeights[msg.id] = actualHeight;

				// 从 0 动画到实际高度
				animateHeight(msg.id, 0, actualHeight, 350, () => {
					transitioningId = null;
				});
			}
		} else {
			transitioningId = null;
		}
	} else {
		// 折叠
		transitioningId = msg.id;
		const currentHeight = expandedHeights[msg.id] || EXPANDED_EXTRA_HEIGHT;

		// 从当前高度动画到 0
		animateHeight(msg.id, currentHeight, 0, 350, () => {
			expandedId = null;
			delete expandedHeights[msg.id];
			transitioningId = null;
		});
	}
}

// ===== 投票（限制只能投一次） =====
async function handleVote(
	msgId: string,
	type: "agree" | "disagree" | "neutral",
	e: Event,
) {
	e.stopPropagation();
	if (isVoting[msgId]) return;

	// 检查是否已经投过票
	if (votedMessages[msgId]) {
		alert("您已经投过票了！");
		return;
	}

	isVoting[msgId] = true;
	try {
		const updated = await voteGuestbookMessage(msgId, type);
		const idx = allMessages.findIndex((m) => m.id === updated.id);
		if (idx !== -1) {
			allMessages[idx] = updated;
		}
		// 记录已投票
		votedMessages[msgId] = type;
		// 持久化到 localStorage
		const votedData = JSON.parse(
			localStorage.getItem("guestbookVoted") || "{}",
		);
		votedData[msgId] = type;
		localStorage.setItem("guestbookVoted", JSON.stringify(votedData));
	} catch (err) {
		console.error("Failed to vote:", err);
	} finally {
		isVoting[msgId] = false;
	}
}

// ===== 检查是否已经投票 =====
function hasVoted(msgId: string): boolean {
	return !!votedMessages[msgId];
}

// ===== 获取投票类型 =====
function getVotedType(msgId: string): "agree" | "disagree" | "neutral" | null {
	return votedMessages[msgId] || null;
}

// ===== 处理新留言事件 =====
function handleNewMessage(e: CustomEvent<GuestbookMessage>) {
	const msg = e.detail;
	if (!msg) return;
	allMessages.unshift(msg);
}

// ===== 处理数据更新事件 =====
function handleDataUpdate(e: CustomEvent) {
	const detail = e.detail;
	if (!detail?.messages) return;
	allMessages = detail.messages;
	hasMore = detail.hasMore ?? true;
}

// ===== 加载更多数据 =====
function loadMore() {
	if (isLoading || !hasMore) return;
	window.dispatchEvent(new CustomEvent("guestbook:load-more"));
}

// ===== 检查是否需要加载更多 =====
function checkLoadMore() {
	if (!containerRef || !hasMore || isLoading) return;
	const { scrollTop, scrollHeight, clientHeight } = containerRef;
	if (scrollTop + clientHeight >= scrollHeight - 100) {
		loadMore();
	}
}

function handleViewChanged(e: CustomEvent) {
	if (e.detail?.view === "list") {
		requestAnimationFrame(() => {
			if (containerRef) {
				containerHeight = containerRef.clientHeight;
				scrollTop = containerRef.scrollTop;
			}
		});
	}
}

// ===== 生命周期 =====
onMount(() => {
	if (containerRef) {
		containerHeight = containerRef.clientHeight;
		containerRef.addEventListener("scroll", handleScroll, { passive: true });
	}
	window.addEventListener("resize", handleResize);
	window.addEventListener("guestbooknew", handleNewMessage as EventListener);
	window.addEventListener(
		"guestbook:data-update",
		handleDataUpdate as EventListener,
	);
	window.addEventListener(
		"guestbook:view-changed",
		handleViewChanged as EventListener,
	);

	// 恢复已投票记录
	try {
		const votedData = JSON.parse(
			localStorage.getItem("guestbookVoted") || "{}",
		);
		votedMessages = votedData;
	} catch {
		votedMessages = {};
	}

	// 延迟触发数据请求，确保 GuestbookDataProvider 已挂载
	setTimeout(() => {
		window.dispatchEvent(new CustomEvent("guestbook:request-data"));
	}, 50);
});

onDestroy(() => {
	if (containerRef) {
		containerRef.removeEventListener("scroll", handleScroll);
	}
	window.removeEventListener("resize", handleResize);
	window.removeEventListener("guestbooknew", handleNewMessage as EventListener);
	window.removeEventListener(
		"guestbook:data-update",
		handleDataUpdate as EventListener,
	);
	window.removeEventListener(
		"guestbook:view-changed",
		handleViewChanged as EventListener,
	);
});

// ===== 计算当前可见消息 =====
let visibleMessages = $derived(() => {
	const range = visibleRange();
	return allMessages.slice(range.start, range.end).map((msg, idx) => ({
		...msg,
		_virtualIndex: range.start + idx,
	}));
});
</script>

<div class="virtual-list-container" bind:this={containerRef}>
	<!-- 占位高度 -->
	<div class="list-spacer" style="height: {totalHeight}px;">
		<!-- 可见项目 -->
		{#each visibleMessages() as msg (msg.id)}
			{@const offset = getItemOffset(msg._virtualIndex)}
			{@const isExpanded = expandedId === msg.id}
			{@const isAnimating = msg.id in animatingHeights}
			{@const showContent = isExpanded || isAnimating}
			<div
				class="list-item"
				class:expanded={showContent}
				style="transform: translateY({offset}px);"
				bind:this={itemRefs[msg.id]}
			>
				<!-- 主行：点击展开 -->
				<button
					class="item-header"
					onclick={() => toggleExpand(msg)}
					aria-expanded={showContent}
				>
					<div class="item-main">
						<span class="item-author">{msg.author}</span>
						<span class="item-id">留言 #{msg.id.slice(-3)}</span>
					</div>
					<div class="item-content-preview">
						<span class="content-text">{msg.content}</span>
					</div>
					<div class="item-right">
						<div class="item-votes-summary">
							<span class="vote-sum agree" class:voted={getVotedType(msg.id) === "agree"}>
								<Icon icon="material-symbols:thumb-up" size="sm" /> {msg.votes.agree}
							</span>
							<span class="vote-sum neutral" class:voted={getVotedType(msg.id) === "neutral"}>
								<Icon icon="material-symbols:remove" size="sm" /> {msg.votes.neutral}
							</span>
							<span class="vote-sum disagree" class:voted={getVotedType(msg.id) === "disagree"}>
								<Icon icon="material-symbols:thumb-down" size="sm" /> {msg.votes.disagree}
							</span>
						</div>
						<div class="expand-icon" class:rotated={showContent}>
							<Icon icon="material-symbols:keyboard-arrow-down" size="sm" />
						</div>
					</div>
				</button>

				<!-- 展开内容：显示完整内容 + 投票按钮 -->
				{#if showContent}
					<div
						class="expand-content"
						style="height: {isAnimating ? animatingHeights[msg.id] : expandedHeights[msg.id]}px;"
					>
						<div class="expand-inner">
							<div class="expand-divider"></div>

							<!-- 完整内容 -->
							<p class="expand-text">{msg.content}</p>

							<!-- 投票按钮 -->
							<div class="expand-votes">
								<button
									class="vote-btn agree"
									class:voted={getVotedType(msg.id) === "agree"}
									disabled={isVoting[msg.id] || hasVoted(msg.id)}
									onclick={(e) => handleVote(msg.id, "agree", e)}
								>
									<Icon icon="material-symbols:thumb-up" size="sm" />
									<span>赞同 {msg.votes.agree}</span>
								</button>
								<button
									class="vote-btn neutral"
									class:voted={getVotedType(msg.id) === "neutral"}
									disabled={isVoting[msg.id] || hasVoted(msg.id)}
									onclick={(e) => handleVote(msg.id, "neutral", e)}
								>
									<Icon icon="material-symbols:remove" size="sm" />
									<span>中立 {msg.votes.neutral}</span>
								</button>
								<button
									class="vote-btn disagree"
									class:voted={getVotedType(msg.id) === "disagree"}
									disabled={isVoting[msg.id] || hasVoted(msg.id)}
									onclick={(e) => handleVote(msg.id, "disagree", e)}
								>
									<Icon icon="material-symbols:thumb-down" size="sm" />
									<span>反对 {msg.votes.disagree}</span>
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 空状态 -->
	{#if allMessages.length === 0}
		<div class="empty-state">
			<div class="empty-icon"><Icon icon="material-symbols:mail-outline" size="xl" /></div>
			<div class="empty-text">暂无留言</div>
		</div>
	{/if}
</div>

<style>
	/* ===== 自定义滚动条（仅列表容器，常驻显示） ===== */
	.virtual-list-container::-webkit-scrollbar {
		width: 6px;
		display: block !important;
	}

	.virtual-list-container::-webkit-scrollbar-track {
		background: rgba(128, 128, 128, 0.1);
		border-radius: 3px;
	}

	.virtual-list-container::-webkit-scrollbar-thumb {
		background: var(--card-text-secondary, #a1a1aa);
		border-radius: 3px;
		min-height: 40px;
	}

	.virtual-list-container::-webkit-scrollbar-thumb:hover {
		background: var(--card-text, #71717a);
	}

	/* Firefox 滚动条 */
	.virtual-list-container {
		scrollbar-width: thin;
		scrollbar-color: var(--card-text-secondary, #a1a1aa) rgba(128, 128, 128, 0.1);
	}

	.virtual-list-container {
		position: relative;
		width: 100%;
		height: 560px;
		overflow-y: scroll;
		overflow-x: hidden;
		border: 2px solid var(--card-border, #18181b);
		border-radius: 16px;
		background: transparent;
	}

	:root.dark .virtual-list-container {
		border-color: #52525b;
	}

	.list-spacer {
		position: relative;
		width: 100%;
	}

	.list-item {
		position: absolute;
		left: 0;
		right: 0;
		width: 100%;
		will-change: transform;
		transition: transform 0.35s cubic-bezier(0.22, 0.68, 0.25, 1);
	}

	.item-header {
		width: 100%;
		padding: 0.875rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--card-line, #d4d4d8);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s ease;
	}

	.item-header:hover {
		background: rgba(128, 128, 128, 0.05);
	}

	.item-main {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex-shrink: 0;
		width: 120px;
	}

	.item-content-preview {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		padding: 0 0.75rem;
	}

	.content-text {
		font-size: 0.875rem;
		color: var(--card-text-secondary, #71717a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	:root.dark .content-text {
		color: var(--card-text-secondary, #a1a1aa);
	}

	.item-author {
		font-size: 1rem;
		font-weight: 700;
		color: var(--card-text, #18181b);
		line-height: 1.25;
	}

	:root.dark .item-author {
		color: var(--card-text, #fafafa);
	}

	.item-id {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--card-text-secondary, #71717a);
		line-height: 1.25;
	}

	:root.dark .item-id {
		color: var(--card-text-secondary, #a1a1aa);
	}

	.item-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.item-votes-summary {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.vote-sum {
		font-size: 0.75rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--card-text-secondary, #71717a);
		transition: color 0.2s ease;
	}

	.vote-sum.agree { color: #34d399; }
	.vote-sum.neutral { color: #eab308; }
	.vote-sum.disagree { color: #fb7185; }

	.vote-sum.agree.voted { color: #10b981; font-weight: 700; }
	.vote-sum.neutral.voted { color: #ca8a04; font-weight: 700; }
	.vote-sum.disagree.voted { color: #e11d48; font-weight: 700; }

	.expand-icon {
		flex-shrink: 0;
		color: var(--card-text-secondary, #71717a);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* 展开内容 */
	.expand-content {
		overflow: hidden;
		background: var(--card-bg, #ffffff);
	}

	:root.dark .expand-content {
		background: var(--card-bg, #09090b);
	}

	.expand-inner {
		padding: 0 1.25rem 1rem;
	}

	.expand-divider {
		height: 1px;
		background: var(--card-line, #d4d4d8);
		margin-bottom: 0.75rem;
		opacity: 0.5;
	}

	.expand-text {
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--card-text, #18181b);
		margin: 0 0 1rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	:root.dark .expand-text {
		color: var(--card-text, #fafafa);
	}

	.expand-votes {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.vote-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		border: 2px solid;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		background: transparent;
	}

	.vote-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.vote-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.vote-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.vote-btn.agree {
		border-color: #10b981;
		color: #10b981;
	}
	.vote-btn.agree:hover:not(:disabled) {
		background: rgba(16, 185, 129, 0.1);
	}
	.vote-btn.agree.voted {
		background: rgba(16, 185, 129, 0.15);
		font-weight: 700;
	}

	.vote-btn.neutral {
		border-color: #eab308;
		color: #eab308;
	}
	.vote-btn.neutral:hover:not(:disabled) {
		background: rgba(234, 179, 8, 0.1);
	}
	.vote-btn.neutral.voted {
		background: rgba(234, 179, 8, 0.15);
		font-weight: 700;
	}

	.vote-btn.disagree {
		border-color: #f43f5e;
		color: #f43f5e;
	}
	.vote-btn.disagree:hover:not(:disabled) {
		background: rgba(244, 63, 94, 0.1);
	}
	.vote-btn.disagree.voted {
		background: rgba(244, 63, 94, 0.15);
		font-weight: 700;
	}

	/* 空状态 */
	.empty-state {
		position: absolute;
		inset: 0;
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

	/* 响应式 */
	@media (max-width: 768px) {
		.virtual-list-container {
			height: 420px;
		}

		.item-header {
			padding: 0.75rem;
			flex-wrap: wrap;
		}

		.item-author {
			font-size: 0.875rem;
		}
	}
</style>
