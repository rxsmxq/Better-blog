<script lang="ts">
function openCompose() {
	window.dispatchEvent(new CustomEvent("guestbook:open-compose"));
}
</script>

<button class="compose-btn" onclick={openCompose}>
	<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
	发表留言
</button>

<style>
	.compose-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: var(--primary, #18181b);
		color: #fff;
		border: none;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s, transform 0.15s;
	}

	:root.dark .compose-btn {
		color: rgba(0, 0, 0, 0.7);
	}

	.compose-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.compose-btn:active {
		transform: translateY(0);
	}
</style>
