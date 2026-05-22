/**
 * PixelTransition - 像素入侵风格页面过渡动画
 * 参照 Figma Pixel Invasion Visual Effect 设计
 *
 * 动画流程：入侵(1s) → 加载遮罩(随页面加载) → 退场揭示
 *
 * 使用 GSAP 驱动，与 Swup 页面切换生命周期集成
 *
 * 时序门控：maskReadyPromise 在入侵+遮罩完成后 resolve，
 * Swup 通过 animation:out:await 等待此 Promise，确保遮罩完全覆盖后再替换内容。
 */

import gsap from "gsap";

type Phase = "idle" | "invasion" | "loading" | "reveal" | "done";

interface Block {
	id: number;
	el: HTMLDivElement;
	w: number;
	h: number;
	left: number;
	top: number;
	color: string;
	startX: number;
	startY: number;
	dist: number;
}

const BLOCK_COUNT = 30;
const REVEAL_DURATION = 0.8;
const LOADING_TEXT_CHARS = ["<", "(", "º", "O", "º", ")", ">"];
const MASK_READY_TIMEOUT = 3000;

let overlay: HTMLDivElement | null = null;
let blocks: Block[] = [];
let currentPhase: Phase = "idle";
let maskEl: HTMLDivElement | null = null;
let activeTimeline: gsap.core.Timeline | null = null;
let maskReadyResolve: (() => void) | null = null;
let maskReadyPromise: Promise<void> | null = null;

function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function detectTheme(): boolean {
	return document.documentElement.classList.contains("dark");
}

function getThemeColors() {
	const isDark = detectTheme();
	return {
		isDark,
		blockColors: isDark ? ["#e2e8f0", "#262626"] : ["#000000", "#FFFFFF"],
		maskBg: isDark ? "#262626" : "#ffffff",
		textColor: isDark ? "#ffffff" : "#000000",
		shadow: isDark
			? "0 4px 30px rgba(0,0,0,0.4)"
			: "0 4px 30px rgba(0,0,0,0.15)",
	};
}

function generateBlocks(): Block[] {
	const colors = getThemeColors();
	const arr: Block[] = [];

	for (let i = 0; i < BLOCK_COUNT; i++) {
		const w = 5 + Math.random() * 23;
		const h = 3 + Math.random() * 19;
		const left = Math.random() * (100 - w);
		const top = Math.random() * (100 - h);
		const color = colors.blockColors[Math.random() > 0.5 ? 0 : 1];

		const cx = left + w / 2;
		const cy = top + h / 2;
		const dist = Math.sqrt((cx - 50) ** 2 + (cy - 50) ** 2);

		const dLeft = cx;
		const dRight = 100 - cx;
		const dTop = cy;
		const dBottom = 100 - cy;
		const min = Math.min(dLeft, dRight, dTop, dBottom);

		let startX = 0;
		let startY = 0;
		if (min === dLeft) startX = -100;
		else if (min === dRight) startX = 100;
		else if (min === dTop) startY = -100;
		else if (min === dBottom) startY = 100;

		arr.push({
			id: i,
			el: null as unknown as HTMLDivElement,
			w,
			h,
			left,
			top,
			color,
			startX,
			startY,
			dist,
		});
	}

	return arr.sort((a, b) => b.dist - a.dist);
}

function killActiveAnimations() {
	if (activeTimeline) {
		activeTimeline.kill();
		activeTimeline = null;
	}
	if (overlay) {
		gsap.killTweensOf(overlay);
	}
	if (maskEl) {
		gsap.killTweensOf(maskEl);
	}
	for (const b of blocks) {
		gsap.killTweensOf(b.el);
	}
}

function createOverlay(): HTMLDivElement {
	if (overlay) {
		killActiveAnimations();
		overlay.remove();
	}

	const colors = getThemeColors();
	const container = document.createElement("div");
	container.id = "pixel-transition-overlay";
	container.setAttribute("aria-hidden", "true");
	container.style.cssText = `
		position: fixed;
		inset: 0;
		z-index: 999999;
		pointer-events: none;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
	`;

	const newBlocks = generateBlocks();
	blocks = newBlocks.map((b) => {
		const el = document.createElement("div");
		el.style.cssText = `
			position: absolute;
			left: ${b.left}vw;
			top: ${b.top}vh;
			width: ${b.w}vw;
			height: ${b.h}vh;
			background-color: ${b.color};
			box-shadow: ${colors.shadow};
			will-change: transform, opacity;
		`;
		gsap.set(el, {
			x: `${b.startX}vw`,
			y: `${b.startY}vh`,
			opacity: 0,
			scale: 0.5,
		});
		container.appendChild(el);
		b.el = el;
		return b;
	});

	const mask = document.createElement("div");
	mask.className = "pixel-mask";
	mask.style.cssText = `
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		opacity: 0;
		background-color: ${colors.maskBg};
	`;

	const textContainer = document.createElement("div");
	textContainer.className = "pixel-loading-text";
	textContainer.style.cssText = `
		display: flex;
		align-items: center;
		gap: 0.125rem;
		font-size: clamp(2.5rem, 8vw, 6rem);
		font-weight: 900;
		letter-spacing: 0.1em;
		padding: 2.5rem 1rem;
		perspective: 800px;
		user-select: none;
		color: ${colors.textColor};
	`;

	LOADING_TEXT_CHARS.forEach((char, i) => {
		const span = document.createElement("span");
		span.textContent = char;
		span.style.cssText = `
			display: inline-block;
			will-change: transform, opacity;
		`;
		gsap.set(span, {
			y: "150%",
			scale: 0.2,
			opacity: 0,
			rotateX: 80,
			rotateZ: i % 2 === 0 ? -15 : 15,
		});
		textContainer.appendChild(span);
	});

	mask.appendChild(textContainer);
	container.appendChild(mask);
	maskEl = mask;

	document.body.appendChild(container);
	if (container !== document.body.lastElementChild) {
		document.body.appendChild(container);
	}
	overlay = container;

	return container;
}

function animateInvasion(): Promise<void> {
	return new Promise((resolve) => {
		if (!overlay) {
			resolve();
			return;
		}

		currentPhase = "invasion";

		gsap.set(overlay, { opacity: 1 });

		const tl = gsap.timeline({
			onComplete: () => {
				activeTimeline = null;
				resolve();
			},
		});
		activeTimeline = tl;

		blocks.forEach((b, i) => {
			tl.to(
				b.el,
				{
					x: "0vw",
					y: "0vh",
					opacity: 1,
					scale: 1,
					duration: 0.4,
					ease: "expo.out",
				},
				i * 0.015,
			);
		});

		if (maskEl) {
			tl.to(
				maskEl,
				{
					opacity: 1,
					duration: 0.3,
					ease: "power2.in",
				},
				"-=0.25",
			);
		}
	});
}

function animateLoading(): void {
	currentPhase = "loading";
	if (!maskEl) return;

	const tl = gsap.timeline();
	activeTimeline = tl;

	tl.to(maskEl, {
		opacity: 1,
		duration: 0.2,
		ease: "power2.out",
	});

	const spans = maskEl.querySelectorAll("span");
	spans.forEach((span, _i) => {
		tl.to(
			span,
			{
				y: "0%",
				scale: 1,
				opacity: 1,
				rotateX: 0,
				rotateZ: 0,
				duration: 0.5,
				ease: "back.out(1.7)",
			},
			">-0.35",
		);
	});

	tl.add(() => {
		if (!maskEl || currentPhase !== "loading") return;
		const spans = maskEl.querySelectorAll("span");
		spans.forEach((span, i) => {
			gsap.to(span, {
				yoyo: true,
				repeat: -1,
				y: `+=${i % 2 === 0 ? 3 : -3}`,
				duration: 0.6 + i * 0.05,
				ease: "sine.inOut",
			});
		});
	});
}

function animateReveal(): Promise<void> {
	return new Promise((resolve) => {
		currentPhase = "reveal";

		if (!overlay || !maskEl) {
			cleanup();
			resolve();
			return;
		}

		const spans = maskEl.querySelectorAll("span");
		spans.forEach((span) => {
			gsap.killTweensOf(span);
		});

		const swupContainer = document.getElementById("swup-container");

		if (swupContainer) {
			gsap.set(swupContainer, { opacity: 0, y: "0.5rem" });
		}

		const tl = gsap.timeline({
			onComplete: () => {
				activeTimeline = null;
				currentPhase = "done";
				cleanup();
				resolve();
			},
		});
		activeTimeline = tl;

		tl.to(maskEl, {
			opacity: 0,
			scale: 1.05,
			filter: "blur(10px)",
			duration: 0.4,
			ease: "power2.in",
		});

		blocks.forEach((b, i) => {
			tl.to(
				b.el,
				{
					x: `${b.startX * 0.6}vw`,
					y: `${b.startY * 0.6}vh`,
					opacity: 0,
					scale: 0.2,
					duration: REVEAL_DURATION,
					ease: "power3.in",
				},
				0.2 + (blocks.length - 1 - i) * 0.03,
			);
		});

		if (swupContainer) {
			tl.to(
				swupContainer,
				{
					opacity: 1,
					y: "0",
					duration: 0.4,
					ease: "power2.out",
				},
				"-=0.5",
			);
		}

		tl.to(
			overlay,
			{
				opacity: 0,
				duration: 0.3,
				ease: "power2.out",
			},
			"-=0.4",
		);
	});
}

function cleanup() {
	killActiveAnimations();
	if (overlay) {
		overlay.remove();
		overlay = null;
	}
	blocks = [];
	maskEl = null;
	currentPhase = "idle";
	maskReadyPromise = null;
	maskReadyResolve = null;
}

export async function startInvasion(): Promise<void> {
	if (prefersReducedMotion()) {
		maskReadyPromise = Promise.resolve();
		return;
	}

	if (currentPhase !== "idle") {
		maskReadyResolve?.();
		killActiveAnimations();
		if (overlay) overlay.remove();
		overlay = null;
		blocks = [];
		maskEl = null;
		currentPhase = "idle";
	}

	maskReadyPromise = new Promise<void>((resolve) => {
		maskReadyResolve = resolve;
	});

	createOverlay();
	await animateInvasion();
	animateLoading();

	maskReadyResolve?.();
	maskReadyResolve = null;
}

export function getMaskReadyPromise(): Promise<void> {
	if (!maskReadyPromise) return Promise.resolve();
	return Promise.race([
		maskReadyPromise,
		new Promise<void>((resolve) => setTimeout(resolve, MASK_READY_TIMEOUT)),
	]);
}

export async function triggerReveal(): Promise<void> {
	if (prefersReducedMotion()) return;
	if (currentPhase === "idle" || currentPhase === "done") return;

	if (currentPhase === "invasion") {
		await new Promise<void>((resolve) => {
			const check = () => {
				if (currentPhase !== "invasion") {
					resolve();
				} else {
					requestAnimationFrame(check);
				}
			};
			check();
		});
	}

	await animateReveal();
}

export function cancelTransition(): void {
	maskReadyResolve?.();
	maskReadyResolve = null;
	maskReadyPromise = null;
	killActiveAnimations();
	cleanup();
}
