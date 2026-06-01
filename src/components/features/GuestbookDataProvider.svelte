<script lang="ts">
/**
 * 留言板数据共享组件
 * 负责统一获取留言数据，通过 CustomEvent 分发给卡片和列表视图
 * 避免两个视图各自独立请求 API
 */
import { onDestroy, onMount } from "svelte";
import type { GuestbookMessage } from "@/types/guestbook";
import { fetchGuestbookMessages } from "@/utils/guestbook-api";

// 使用全局状态，避免 Swup 切换时重置
const GLOBAL_KEY = "__guestbook_data__";

function getGlobalState() {
	if (typeof window === "undefined") return null;
	return (window as Record<string, unknown>)[GLOBAL_KEY] as
		| {
				allMessages: GuestbookMessage[];
				totalMessages: number;
				listOffset: number;
				hasMore: boolean;
				isInitialized: boolean;
		  }
		| undefined;
}

function setGlobalState(state: {
	allMessages: GuestbookMessage[];
	totalMessages: number;
	listOffset: number;
	hasMore: boolean;
	isInitialized: boolean;
}) {
	if (typeof window === "undefined") return;
	(window as Record<string, unknown>)[GLOBAL_KEY] = state;
}

// 初始化状态：优先从全局状态恢复
let globalState = getGlobalState();
let allMessages = $state<GuestbookMessage[]>(globalState?.allMessages ?? []);
let totalMessages = $state(globalState?.totalMessages ?? 0);
let isLoading = $state(false);
let listOffset = $state(globalState?.listOffset ?? 0);
let hasMore = $state(globalState?.hasMore ?? true);
let isInitialized = $state(globalState?.isInitialized ?? false);

const BATCH_SIZE = 20;

// 同步到全局状态
function syncGlobalState() {
	setGlobalState({
		allMessages,
		totalMessages,
		listOffset,
		hasMore,
		isInitialized,
	});
}

// 广播数据更新
function broadcast() {
	window.dispatchEvent(
		new CustomEvent("guestbook:data-update", {
			detail: {
				messages: allMessages,
				total: totalMessages,
				hasMore,
			},
		}),
	);
	syncGlobalState();
}

// 加载更多数据
async function loadMore() {
	if (isLoading || !hasMore) return;
	isLoading = true;

	try {
		const { messages, total } = await fetchGuestbookMessages(
			listOffset,
			BATCH_SIZE,
		);
		totalMessages = total;
		if (messages.length > 0) {
			allMessages = [...allMessages, ...messages];
			listOffset += messages.length;
		}
		hasMore = listOffset < total;
		broadcast();
	} catch (err) {
		console.error("Failed to load guestbook messages:", err);
	} finally {
		isLoading = false;
	}
}

// 重新加载
async function reload() {
	listOffset = 0;
	hasMore = true;
	allMessages = [];
	isInitialized = false;
	await loadMore();
}

// 处理新留言
function handleNewMessage(e: CustomEvent<GuestbookMessage>) {
	const msg = e.detail;
	if (!msg) return;
	allMessages.unshift(msg);
	totalMessages++;
	broadcast();
}

// 处理数据请求
function handleRequestData() {
	if (!isInitialized) {
		isInitialized = true;
		loadMore();
	} else {
		// 数据已存在，直接广播
		broadcast();
		// 如果数据量较少，继续加载更多（避免卡片只加载5条后列表显示不全）
		if (allMessages.length < BATCH_SIZE && hasMore) {
			loadMore();
		}
	}
}

// 处理加载更多请求
function handleLoadMore() {
	loadMore();
}

onMount(() => {
	window.addEventListener("guestbooknew", handleNewMessage as EventListener);
	window.addEventListener("guestbook:request-data", handleRequestData);
	window.addEventListener("guestbook:load-more", handleLoadMore);

	// 如果全局状态已有数据，立即广播
	if (allMessages.length > 0) {
		broadcast();
	}
});

onDestroy(() => {
	window.removeEventListener("guestbooknew", handleNewMessage as EventListener);
	window.removeEventListener("guestbook:request-data", handleRequestData);
	window.removeEventListener("guestbook:load-more", handleLoadMore);
});
</script>

<!-- 此组件无可见 UI，仅作为数据提供者 -->
