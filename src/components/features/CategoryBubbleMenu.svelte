<script lang="ts">
import { gsap } from "gsap";
import { portal } from "@/components/common/portal";

interface CategoryItem {
	name: string;
	count: number;
	url: string;
}

interface Props {
	categories: CategoryItem[];
	class?: string;
}

let { categories, class: className = "" }: Props = $props();

let isMenuOpen = $state(false);
let showOverlay = $state(false);

let overlayRef: HTMLDivElement | undefined = $state();
let bubblesRef = $state<HTMLAnchorElement[]>([]);
let labelRefs = $state<HTMLSpanElement[]>([]);

const animationEase = "elastic.out(1,0.5)";
const animationDuration = 0.8;
const staggerDelay = 0.15;

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

function isDarkMode() {
	return (
		typeof document !== "undefined" &&
		document.documentElement.classList.contains("dark")
	);
}

function getCategoryColor(_name: string, index: number) {
	const colors = [
		"#e74c3c",
		"#3498db",
		"#2ecc71",
		"#f39c12",
		"#9b59b6",
		"#1abc9c",
		"#e67e22",
		"#34495e",
	];
	return colors[index % colors.length];
}
</script>

<div class={`category-bubble-menu-wrapper ${className}`.trim()}>
  <div class="category-bubble-menu">
    <button
      type="button"
      class={`category-toggle-btn ${isMenuOpen ? "open" : ""}`}
      onclick={handleToggle}
      aria-label="Toggle categories"
      aria-pressed={isMenuOpen}
    >
      <span class="category-menu-line" />
      <span class="category-menu-line short" />
    </button>
  </div>

  {#if showOverlay}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      use:portal
      class="category-bubble-backdrop"
      onclick={handleBackdropClick}
      style="position:fixed;inset:0;z-index:998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);backdrop-filter:blur(2px);"
    >
      <div
        bind:this={overlayRef}
        class="category-bubble-items"
        aria-hidden={!isMenuOpen}
      >
        <ul class="category-pill-list" role="menu" aria-label="Categories">
          {#each categories as item, idx (item.name)}
            <li role="none" class="category-pill-col">
              <a
                role="menuitem"
                href={item.url}
                aria-label={`View all posts in ${item.name}`}
                class="category-pill-link"
                style={`
                  --item-rot: ${(idx % 2 === 0 ? -8 : 8) + (Math.random() * 4 - 2)}deg;
                  --hover-bg: ${getCategoryColor(item.name, idx)};
                  --hover-color: #ffffff;
                `}
                bind:this={bubblesRef[idx]}
              >
                <span bind:this={labelRefs[idx]} class="category-pill-label">
                  {item.name}
                  <span class="category-count">{item.count}</span>
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
  .category-bubble-menu-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .category-bubble-menu {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    z-index: 99;
  }

  .category-toggle-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid var(--line-divider, rgba(0, 0, 0, 0.12));
    background: #111111;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: box-shadow 0.3s ease;
  }

  .category-toggle-btn:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  :global(.dark) .category-toggle-btn {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.12);
  }

  .category-menu-line {
    width: 20px;
    height: 2px;
    background: #ffffff;
    border-radius: 2px;
    display: block;
    margin: 0 auto;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    transform-origin: center;
  }

  :global(.dark) .category-menu-line {
    background: #111111;
  }

  .category-menu-line + .category-menu-line {
    margin-top: 5px;
  }

  .category-toggle-btn.open .category-menu-line:first-child {
    transform: translateY(3.5px) rotate(45deg);
  }

  .category-toggle-btn.open .category-menu-line:last-child {
    transform: translateY(-3.5px) rotate(-45deg);
  }

  .category-bubble-items {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 999;
  }

  .category-pill-list {
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

  .category-pill-col {
    display: flex;
    justify-content: center;
    align-items: stretch;
  }

  .category-pill-link {
    --pill-bg: #111111;
    --pill-color: #ffffff;
    --item-rot: 0deg;
    --hover-bg: #333333;
    --hover-color: #ffffff;
    min-width: 120px;
    min-height: 56px;
    padding: 12px 24px;
    font-size: 1.1rem;
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

  :global(.dark) .category-pill-link {
    background: #ffffff;
    color: #111111;
  }

  @media (min-width: 640px) {
    .category-pill-link {
      min-width: 200px;
      min-height: 100px;
      padding: 20px 40px;
      font-size: 1.9rem;
      transform: rotate(var(--item-rot));
    }

    .category-pill-link:hover {
      transform: rotate(var(--item-rot)) scale(1.06);
      background: var(--hover-bg);
      color: var(--hover-color);
    }

    .category-pill-link:active {
      transform: rotate(var(--item-rot)) scale(0.94);
    }
  }

  @media (max-width: 639px) {
    .category-pill-link:hover {
      transform: scale(1.06);
      background: var(--hover-bg);
      color: var(--hover-color);
    }

    .category-pill-link:active {
      transform: scale(0.94);
    }
  }

  .category-pill-link .category-pill-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    will-change: transform, opacity;
  }

  .category-count {
    font-size: 0.85rem;
    font-weight: 400;
    opacity: 0.7;
  }

  @media (min-width: 640px) {
    .category-count {
      font-size: 1.2rem;
    }
  }
</style>
