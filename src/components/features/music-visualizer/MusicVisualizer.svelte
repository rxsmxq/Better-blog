<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { AudioAnalyzer } from "./AudioAnalyzer";
import LyricsOverlay from "./LyricsOverlay.svelte";
import ThreeScene from "./ThreeScene.svelte";
import VisualizerControls from "./VisualizerControls.svelte";

const audioAnalyzer = new AudioAnalyzer();
const isDark = true; // 固定使用深色主题
let sceneReady = $state(false);

function connectAudio() {
	const audio = document.getElementById(
		"firefly-music-audio",
	) as HTMLAudioElement | null;
	if (!audio) {
		setTimeout(connectAudio, 200);
		return;
	}
	audio.crossOrigin = "anonymous";
	audioAnalyzer.connect(audio);

	if (audioCtxState() === "suspended") {
		audioAnalyzer.resume();
	}
}

function audioCtxState() {
	return (audioAnalyzer as any).audioCtx?.state || "running";
}

onMount(() => {
	const mgr = (window as any).__fireflyMusic;
	if (!mgr) {
		const waitForMgr = () => {
			if ((window as any).__fireflyMusic) {
				connectAudio();
			} else {
				setTimeout(waitForMgr, 100);
			}
		};
		waitForMgr();
	} else {
		if (!mgr.getState().initialized) {
			mgr.init();
		}
		connectAudio();
	}

	const handleFirstClick = () => {
		audioAnalyzer.resume();
		document.removeEventListener("click", handleFirstClick);
	};
	document.addEventListener("click", handleFirstClick);

	return () => {
		document.removeEventListener("click", handleFirstClick);
	};
});

onDestroy(() => {
	audioAnalyzer.disconnect();
});
</script>

<div class="music-visualizer" class:music-visualizer--dark={isDark}>
	{#if sceneReady}
		<VisualizerControls />
		<LyricsOverlay />
	{/if}
	<ThreeScene
		{audioAnalyzer}
		{isDark}
		onSceneReady={() => (sceneReady = true)}
	/>
</div>
