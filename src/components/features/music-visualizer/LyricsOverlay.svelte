<script lang="ts">
import { onDestroy, onMount, tick } from "svelte";

interface LyricLine {
	time: number;
	text: string;
}

let containerEl: HTMLDivElement;
let trackEl: HTMLDivElement;
let lyrics: LyricLine[] = $state([]);
let currentIndex = $state(-1);
let hasLyrics = $state(false);
let offsetY = $state(0);

function syncLyricOffset() {
	if (!containerEl || !trackEl || lyrics.length === 0) {
		offsetY = 0;
		return;
	}

	const nextIndex = currentIndex >= 0 ? currentIndex : 0;
	const activeEl = trackEl.querySelector<HTMLElement>(
		`[data-lyric-index="${nextIndex}"]`,
	);
	if (!activeEl) return;

	const lyricCenter = activeEl.offsetTop + activeEl.offsetHeight / 2;
	const targetCenter =
		containerEl.clientHeight * (currentIndex >= 0 ? 0.5 : 0.58);
	offsetY = targetCenter - lyricCenter;
}

async function queueLyricOffset() {
	await tick();
	syncLyricOffset();
}

function onLyrics(e: CustomEvent) {
	lyrics = e.detail.lyrics || [];
	currentIndex = -1;
	hasLyrics = lyrics.length > 0;
	void queueLyricOffset();
}

function onLrcIndex(e: CustomEvent) {
	currentIndex = e.detail.index;
	void queueLyricOffset();
}

onMount(() => {
	const mgr = (window as any).__fireflyMusic;
	if (mgr) {
		const state = mgr.getState();
		lyrics = state.lyrics || [];
		currentIndex = state.currentLrcIndex;
		hasLyrics = lyrics.length > 0;
	}
	void queueLyricOffset();

	window.addEventListener("fm:lyrics", onLyrics as EventListener);
	window.addEventListener("fm:lrc-index", onLrcIndex as EventListener);
});

onDestroy(() => {
	window.removeEventListener("fm:lyrics", onLyrics as EventListener);
	window.removeEventListener("fm:lrc-index", onLrcIndex as EventListener);
});
</script>

{#if hasLyrics}
	<div bind:this={containerEl} class="music-visualizer__lyrics">
		<div class="music-visualizer__lyrics-stage">
			<div class="music-visualizer__lyrics-timeline"></div>
		<div
			bind:this={trackEl}
			class="music-visualizer__lyrics-inner"
			style={`transform: translateY(${offsetY}px)`}
		>
			{#each lyrics as line, i}
				<div
					class="music-visualizer__lyric-line"
					class:music-visualizer__lyric-line--active={i === currentIndex}
					class:music-visualizer__lyric-line--past={i < currentIndex}
					data-lyric-index={i}
				>
					<span class="music-visualizer__lyric-marker"></span>
					<span class="music-visualizer__lyric-text">{line.text}</span>
				</div>
			{/each}
		</div>
		</div>
	</div>
{/if}
