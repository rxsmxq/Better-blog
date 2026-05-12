<script lang="ts">
import { gsap } from "gsap";
import Icon from "@/components/common/Icon.svelte";
import { portal } from "@/components/common/portal";

interface LinkItem {
	name: string;
	icon: string;
	url: string;
	showName?: boolean;
}

interface Props {
	links: LinkItem[];
	class?: string;
}

let { links, class: className = "" }: Props = $props();

let isMenuOpen = $state(false);
let showOverlay = $state(false);

let overlayRef: HTMLDivElement | undefined = $state();
let bubblesRef = $state<HTMLAnchorElement[]>([]);
let labelRefs = $state<HTMLSpanElement[]>([]);

// 自定义参数 - 参考图片设置
const animationEase = "elastic.out(1,0.5)";
const animationDuration = 0.8;
const staggerDelay = 0.15;
const menuBg = "#111111";
const menuContentColor = "#ffffff";

function handleToggle() {
	if (isMenuOpen) {
		isMenuOpen = false;
		showOverlay = false;
	} else {
		showOverlay = true;
		isMenuOpen = true;
	}
}

function closeMenu() {
	isMenuOpen = false;
	showOverlay = false;
}

function handleBackdropClick(e: MouseEvent) {
	if (e.target === e.currentTarget) {
		closeMenu();
	}
}

$effect(() => {
	if (!isMenuOpen) return;

	const overlay = overlayRef;
	const bubbles = bubblesRef.filter(Boolean);
	const labels = labelRefs.filter(Boolean);

	if (!overlay || !bubbles.length) return;

	gsap.killTweensOf([...bubbles, ...labels]);
	gsap.set(bubbles, { scale: 0, transformOrigin: "50% 50%" });
	gsap.set(labels, { y: 24, autoAlpha: 0 });

	bubbles.forEach((bubble, i) => {
		const delay = i * staggerDelay + gsap.utils.random(-0.05, 0.05);
		const tl = gsap.timeline({ delay });

		tl.to(bubble, {
			scale: 1,
			duration: animationDuration,
			ease: animationEase,
		});
		if (labels[i]) {
			tl.to(
				labels[i],
				{
					y: 0,
					autoAlpha: 1,
					duration: animationDuration,
					ease: "power3.out",
				},
				`-=${animationDuration * 0.9}`,
			);
		}
	});
});

let isDark = $state(false);

$effect(() => {
	if (typeof document === "undefined") return;
	isDark = document.documentElement.classList.contains("dark");
	const observer = new MutationObserver(() => {
		isDark = document.documentElement.classList.contains("dark");
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	return () => observer.disconnect();
});

function getHoverBg(item: LinkItem) {
	const colorMap: Record<string, string> = {
		qq: "#4a90d9",
		B站: "#00a1d6",
		GitHub: "#6e7681",
		Email: "#e74c3c",
		RSS: "#f39c12",
	};
	return colorMap[item.name] || "#f3f4f6";
}
</script>

<div class={`bubble-menu-wrapper ${className}`.trim()}>
  <nav class="bubble-menu" aria-label="Social navigation">
    <button
      type="button"
      class={`bubble toggle-bubble menu-btn ${isMenuOpen ? "open" : ""}`}
      onclick={handleToggle}
      aria-label="Toggle social menu"
      aria-pressed={isMenuOpen}
      style={`background: ${isDark ? "#ffffff" : menuBg}; color: ${isDark ? "#111111" : menuContentColor};`}
    >
      <span class="menu-line" style={`background: ${isDark ? "#111111" : menuContentColor};`} />
      <span class="menu-line short" style={`background: ${isDark ? "#111111" : menuContentColor};`} />
    </button>
  </nav>

  {#if showOverlay}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      use:portal
      class="bubble-menu-backdrop"
      onclick={handleBackdropClick}
      style="position:fixed;inset:0;z-index:998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);backdrop-filter:blur(2px);"
    >
      <div
        bind:this={overlayRef}
        class="bubble-menu-items"
        aria-hidden={!isMenuOpen}
      >
        <ul class="pill-list" role="menu" aria-label="Social links">
          {#each links as item, idx (item.name)}
            <li role="none" class="pill-col">
              <a
                role="menuitem"
                href={item.url.startsWith("mailto:") ? "#" : item.url}
                target={item.url.startsWith("mailto:") ? undefined : "_blank"}
                aria-label={item.name}
                class="pill-link"
                style={`
                  --item-rot: ${(idx % 2 === 0 ? -8 : 8) + (Math.random() * 4 - 2)}deg;
                  --pill-bg: ${isDark ? "#ffffff" : menuBg};
                  --pill-color: ${isDark ? "#111111" : menuContentColor};
                  --hover-bg: ${getHoverBg(item)};
                  --hover-color: ${isDark ? "#111111" : "#ffffff"};
                `}
                bind:this={bubblesRef[idx]}
                onclick={(e) => {
                  if (item.url.startsWith("mailto:")) {
                    e.preventDefault();
                    const encodedEmail = btoa(item.url.replace("mailto:", ""));
                    window.location.href = `mailto:${atob(encodedEmail)}`;
                  }
                }}
              >
                <span bind:this={labelRefs[idx]} class="pill-label">
                  <Icon icon={item.icon} />
                  <span class="pill-name">{item.name}</span>
                </span>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .bubble-menu-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .bubble-menu {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 99;
  }

  .bubble-menu .bubble {
    --bubble-size: 48px;
    width: var(--bubble-size);
    height: var(--bubble-size);
    border-radius: 50%;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    cursor: pointer;
    border: 1px solid var(--line-divider, rgba(0, 0, 0, 0.12));
    transition: box-shadow 0.3s ease;
  }

  .bubble-menu .bubble:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .bubble-menu .toggle-bubble {
    width: var(--bubble-size);
    height: var(--bubble-size);
  }

  .bubble-menu .menu-btn {
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--pill-bg);
  }

  .bubble-menu .menu-line {
    width: 20px;
    height: 2px;
    border-radius: 2px;
    display: block;
    margin: 0 auto;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    transform-origin: center;
  }

  .bubble-menu .menu-line + .menu-line {
    margin-top: 5px;
  }

  .bubble-menu .menu-btn.open .menu-line:first-child {
    transform: translateY(3.5px) rotate(45deg);
  }

  .bubble-menu .menu-btn.open .menu-line:last-child {
    transform: translateY(-3.5px) rotate(-45deg);
  }

  .bubble-menu-items {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 999;
  }

  .bubble-menu-items .pill-list {
    list-style: none;
    margin: 0;
    padding: 0 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    width: 100%;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    pointer-events: auto;
    justify-content: center;
  }

  .bubble-menu-items .pill-list .pill-col {
    display: flex;
    justify-content: center;
    align-items: stretch;
  }

  .bubble-menu-items .pill-link {
    --pill-bg: #111111;
    --pill-color: #ffffff;
    --item-rot: 0deg;
    --hover-bg: #333333;
    --hover-color: #ffffff;
    min-width: 200px;
    min-height: 100px;
    padding: 20px 40px;
    font-size: 1.9rem;
    font-weight: 500;
    border-radius: 999px;
    background: var(--pill-bg);
    color: var(--pill-color);
    text-decoration: none;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition:
      background 0.3s ease,
      color 0.3s ease;
    will-change: transform;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    border: none;
  }

  @media (min-width: 640px) {
    .bubble-menu-items .pill-link {
      transform: rotate(var(--item-rot));
    }

    .bubble-menu-items .pill-link:hover {
      transform: rotate(var(--item-rot)) scale(1.06);
      background: var(--hover-bg);
      color: var(--hover-color);
    }

    .bubble-menu-items .pill-link:active {
      transform: rotate(var(--item-rot)) scale(0.94);
    }
  }

  @media (max-width: 639px) {
    .bubble-menu-items .pill-link:hover {
      transform: scale(1.06);
      background: var(--hover-bg);
      color: var(--hover-color);
    }

    .bubble-menu-items .pill-link:active {
      transform: scale(0.94);
    }
  }

  .bubble-menu-items .pill-link .pill-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    will-change: transform, opacity;
  }

  .bubble-menu-items .pill-link .pill-label :global(.inline-icon) {
    font-size: 4rem;
  }

  .bubble-menu-items .pill-link .pill-name {
    font-size: 1.5rem;
    font-weight: 600;
  }
</style>
