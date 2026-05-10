<script lang="ts">
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { DARK_MODE, LIGHT_MODE } from "@/constants/constants";
import type { LIGHT_DARK_MODE } from "@/types/config.ts";
import {
	applyThemeToDocument,
	getStoredTheme,
	setTheme,
} from "@/utils/setting-utils";

interface SwupHooks {
	on(event: string, callback: () => void): void;
}

interface SwupInstance {
	hooks?: SwupHooks;
}

type WindowWithSwup = Window & { swup?: SwupInstance };

let mode: LIGHT_DARK_MODE = $state(LIGHT_MODE);

function toggleTheme() {
	const newMode = mode === LIGHT_MODE ? DARK_MODE : LIGHT_MODE;
	mode = newMode;
	setTheme(newMode);
}

onMount(() => {
	const storedTheme = getStoredTheme();
	// If stored theme is "system" (legacy), resolve to actual theme
	if (storedTheme === "system") {
		const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		mode = isDark ? DARK_MODE : LIGHT_MODE;
		setTheme(mode);
	} else {
		mode = storedTheme;
	}

	// Ensure DOM state matches stored theme
	const currentTheme = document.documentElement.classList.contains("dark")
		? DARK_MODE
		: LIGHT_MODE;
	if (mode !== currentTheme) {
		applyThemeToDocument(mode);
	}

	// Swup listener
	const handleContentReplace = () => {
		const newTheme = getStoredTheme();
		if (newTheme !== "system") {
			mode = newTheme;
		}
	};

	const win = window as WindowWithSwup;
	if (win.swup?.hooks) {
		win.swup.hooks.on("content:replace", handleContentReplace);
	} else {
		document.addEventListener("swup:enable", () => {
			const w = window as WindowWithSwup;
			if (w.swup?.hooks) {
				w.swup.hooks.on("content:replace", handleContentReplace);
			}
		});
	}

	// Listen for theme-change events from other components
	const handleThemeChange = () => {
		const newTheme = getStoredTheme();
		if (newTheme !== "system") {
			mode = newTheme;
		}
	};
	window.addEventListener("theme-change", handleThemeChange);

	return () => {
		window.removeEventListener("theme-change", handleThemeChange);
	};
});
</script>

<div class="relative z-50">
    <button aria-label="Light/Dark Mode" class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" id="scheme-switch" onclick={toggleTheme}>
        <div class="absolute inset-0 flex items-center justify-center" class:opacity-0={mode !== LIGHT_MODE}>
            <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem]"></Icon>
        </div>
        <div class="absolute inset-0 flex items-center justify-center" class:opacity-0={mode !== DARK_MODE}>
            <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem]"></Icon>
        </div>
    </button>
</div>
