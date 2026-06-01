<script lang="ts">
/**
 * 留言板视图容器
 * 统一管理卡片/列表视图的切换显示
 * 避免 client:only 占位符导致的双视图问题
 */
import { onMount } from "svelte";
import GuestbookCardStack from "./GuestbookCardStack.svelte";
import GuestbookDataProvider from "./GuestbookDataProvider.svelte";
import GuestbookViewTabs from "./GuestbookViewTabs.svelte";
import GuestbookVirtualList from "./GuestbookVirtualList.svelte";

let currentView = $state<"card" | "list">("card");
let isReady = $state(false);

onMount(() => {
	const saved = localStorage.getItem("guestbookView");
	if (saved === "card" || saved === "list") {
		currentView = saved;
	}
	isReady = true;
});

let previousView: "card" | "list" = "card";

$effect(() => {
	if (currentView !== previousView && isReady) {
		previousView = currentView;
		window.dispatchEvent(
			new CustomEvent("guestbook:view-changed", {
				detail: { view: previousView },
			}),
		);
		if (currentView === "list") {
			window.dispatchEvent(new CustomEvent("guestbook:request-data"));
		}
	}
});
</script>

<GuestbookDataProvider />

<div class="flex justify-start mb-4">
	<GuestbookViewTabs bind:activeView={currentView} />
</div>

{#if isReady}
	<div class="guestbook-container" class:hidden={currentView !== "card"}>
		<GuestbookCardStack />
	</div>

	<div class="guestbook-list-container" class:hidden={currentView !== "list"}>
		<GuestbookVirtualList />
	</div>
{/if}

<style>
	.guestbook-container {
		position: relative;
		width: 100%;
		min-height: 560px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.guestbook-list-container {
		position: relative;
		width: 100%;
		min-height: 560px;
	}

	.guestbook-container.hidden,
	.guestbook-list-container.hidden {
		display: none;
	}

	@media (max-width: 768px) {
		.guestbook-container {
			min-height: 420px;
			height: auto;
		}

		.guestbook-list-container {
			min-height: 420px;
		}
	}
</style>
