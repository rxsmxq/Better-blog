<script lang="ts">
/**
 * 留言板视图切换 Tabs
 * 文字标签风格，左对齐，点击切换无悬停滑动
 */
import { onMount } from "svelte";

interface Props {
	activeView: "card" | "list";
	class?: string;
}

let { activeView = $bindable("card"), class: className = "" }: Props = $props();

let tabRef = $state<HTMLDivElement | null>(null);
let cardBtnRef = $state<HTMLButtonElement | null>(null);
let listBtnRef = $state<HTMLButtonElement | null>(null);
let indicatorStyle = $state({ left: 0, width: 0, opacity: 0 });

function updateIndicatorPosition(view: "card" | "list") {
	const btnRef = view === "card" ? cardBtnRef : listBtnRef;
	if (!btnRef || !tabRef) return;

	const parentRect = tabRef.getBoundingClientRect();
	const btnRect = btnRef.getBoundingClientRect();

	indicatorStyle = {
		left: btnRect.left - parentRect.left,
		width: btnRect.width,
		opacity: 1,
	};
}

function handleViewChange(view: "card" | "list") {
	activeView = view;
	localStorage.setItem("guestbookView", view);
	updateIndicatorPosition(view);
}

onMount(() => {
	requestAnimationFrame(() => updateIndicatorPosition(activeView));
});
</script>

<div
	class="view-tabs {className}"
	bind:this={tabRef}
>
	<!-- 滑动背景指示器 -->
	<div
		class="tab-indicator"
		style="left: {indicatorStyle.left}px; width: {indicatorStyle.width}px; opacity: {indicatorStyle.opacity};"
	></div>

	<!-- 卡片视图 -->
	<button
		bind:this={cardBtnRef}
		class="tab-item {activeView === 'card' ? 'active' : ''}"
		onclick={() => handleViewChange("card")}
		aria-label="卡片视图"
	>
		<span class="tab-label">卡片</span>
	</button>

	<!-- 列表视图 -->
	<button
		bind:this={listBtnRef}
		class="tab-item {activeView === 'list' ? 'active' : ''}"
		onclick={() => handleViewChange("list")}
		aria-label="列表视图"
	>
		<span class="tab-label">列表</span>
	</button>
</div>

<style>
	.view-tabs {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem;
		border-radius: 9999px;
		background: var(--card-bg, rgba(255, 255, 255, 0.6));
		border: 2px solid var(--card-text, #18181b);
	}

	:root.dark .view-tabs {
		background: var(--card-bg, rgba(30, 30, 30, 0.6));
		border-color: var(--card-text, #fafafa);
	}

	.tab-indicator {
		position: absolute;
		top: 0.375rem;
		bottom: 0.375rem;
		background: var(--primary, #3b82f6);
		border-radius: 9999px;
		transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 0;
	}

	.tab-item {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color 0.2s ease;
		color: var(--btn-content, #666);
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.tab-item:hover {
		color: var(--btn-content-hover, #000);
	}

	.tab-item.active {
		color: #fff;
	}

	.tab-label {
		line-height: 1.25;
	}

	:root.dark .tab-item {
		color: var(--btn-content, #999);
	}

	:root.dark .tab-item:hover {
		color: var(--btn-content-hover, #fff);
	}

	:root.dark .tab-item.active {
		color: #000;
	}

	:root.dark .tab-indicator {
		background: #fff;
	}
</style>
