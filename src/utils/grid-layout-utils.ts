/**
 * 主网格列布局与侧边栏可见性 / 吸顶间距管理（客户端）
 *
 * 从 Firefly 上游同步（CuteLeaf/Firefly v6.16.8），
 * isArticleDetailPage 替换为本项目 layout-utils 的 isPostPage。
 */

import { isHomePage, isPostPage, isPostListPage, isGuestbookPage } from "@/utils/layout-utils";
import {
	computeGridColumns,
	gridColumnVarsToStyle,
} from "@/utils/responsive-utils";

const sidebarStickyState: Record<
	"left" | "right",
	{ topClass: "top-0" | "top-4"; hasVisibleTop: boolean }
> = {
	left: { topClass: "top-0", hasVisibleTop: false },
	right: { topClass: "top-0", hasVisibleTop: false },
};

const isCurrentPagePost = (): boolean => isPostPage(window.location.pathname);

// 上一次写入的几何，用于 page:view 重复调用时短路
let lastAppliedGeometry = "";

/**
 * 更新主网格的列几何。
 *
 * 几何自定义属性写在 #main-grid 上（SSR 时由 MainGridLayout 写入同一组值），
 * 这里在每次 swup 切页后按当前页面类型重算，保证软导航后与 SSR 一致。
 */
export function updateMainGridCols(): void {
	const mainGrid = document.getElementById("main-grid");
	if (!mainGrid) return;

	const isPost = isCurrentPagePost();
	// 缺省视为 true（fail-open）：属性缺失时不要误把整列折叠掉
	const flag = (name: string): boolean =>
		mainGrid.getAttribute(name) !== "false";
	const positionAttr = mainGrid.getAttribute("data-sidebar-position");

	const vars = computeGridColumns({
		enabled: flag("data-sidebar-enable"),
		position:
			positionAttr === "right" || positionAttr === "both"
				? positionAttr
				: "left",
		tabletSidebar:
			mainGrid.getAttribute("data-tablet-sidebar") === "right"
				? "right"
				: "left",
		hideSidebarOnPostPage:
			mainGrid.getAttribute("data-grid-hide-sidebar-on-post") === "true",
		hideSidebarOnHomePage:
			mainGrid.getAttribute("data-grid-hide-sidebar-on-home") === "true",
		hideSidebarOnGuestbookPage:
			mainGrid.getAttribute("data-grid-hide-sidebar-on-guestbook") ===
			"true",
		isPostPage: isPost,
		isHomePage: isHomePage(window.location.pathname),
		isGuestbookPage: isGuestbookPage(window.location.pathname),
		hasLeftWidgets: flag(
			isPost ? "data-has-left-on-post" : "data-has-left-on-non-post",
		),
		hasRightWidgets: flag(
			isPost ? "data-has-right-on-post" : "data-has-right-on-non-post",
		),
		noSidebarContentMaxWidth:
			mainGrid.getAttribute("data-no-sidebar-content-max-width") || undefined,
	});

	const serialized = gridColumnVarsToStyle(vars);
	if (serialized === lastAppliedGeometry) return;
	lastAppliedGeometry = serialized;
	for (const [key, value] of Object.entries(vars)) {
		mainGrid.style.setProperty(key, value);
	}
}

/** 更新侧边栏组件的可见性（切页后按新路径重算） */
export function updateSidebarComponentsVisibility(): void {
	const isPost = isCurrentPagePost();
	const isPostList = isPostListPage(window.location.pathname);

	// 侧栏级别的 hideSidebarOnPostPage 配置
	document
		.querySelectorAll<HTMLElement>("[data-hide-sidebar-on-post]")
		.forEach((wrapper) => {
			const hideOnPost =
				wrapper.getAttribute("data-hide-sidebar-on-post") === "true";
			if (isPost && hideOnPost) {
				wrapper.style.setProperty("display", "none", "important");
			} else {
				wrapper.style.removeProperty("display");
			}
		});

	// 组件级别的 showOnPostPage === false
	document.querySelectorAll(".widget-hide-on-post").forEach((widget) => {
		isPost
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 组件级别的 hideOnNonPostPage === true
	document.querySelectorAll(".widget-hide-on-non-post").forEach((widget) => {
		!isPost
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 组件级别的 hideOnPostListPage === true（文章列表页 /list/「文档」）
	document.querySelectorAll(".widget-hide-on-post-list").forEach((widget) => {
		isPostList
			? widget.classList.add("hidden")
			: widget.classList.remove("hidden");
	});

	// 组件可见性变化后重算 sticky 间距，避免 swup 切页后残留旧间距
	refreshSidebarStickyState();
}

/**
 * 重新读取侧边栏 top 容器的可见性并应用间距。
 * 含 offsetHeight 布局读取，仅初始化 / 切页时调用；滚动路径用缓存值。
 */
export function refreshSidebarStickyState(): void {
	(["left", "right"] as const).forEach((side) => {
		const sticky = document.getElementById(`${side}-sidebar-sticky`);
		if (!sticky) return;

		const topContainer = sticky.previousElementSibling as HTMLElement | null;
		const hasVisibleTop = !!topContainer && topContainer.offsetHeight > 1;
		sidebarStickyState[side].hasVisibleTop = hasVisibleTop;

		// 从非文章页切到文章页时，top 容器可能残留 mb-4，需按可见性动态修正
		if (topContainer) {
			if (hasVisibleTop) {
				topContainer.classList.add("mb-4");
			} else {
				topContainer.classList.remove("mb-4");
			}
		}
	});

	updateSidebarStickySpacing();
}

/**
 * 根据当前滚动位置动态更新侧边栏 sticky 顶部偏移。
 * 滚动路径：只切 top-0/top-4，不读布局（hasVisibleTop 由 refreshSidebarStickyState 缓存）
 */
export function updateSidebarStickySpacing(): void {
	const scrollTop = document.documentElement.scrollTop || window.scrollY || 0;
	const isScrolled = scrollTop > 2;

	(["left", "right"] as const).forEach((side) => {
		const sticky = document.getElementById(`${side}-sidebar-sticky`);
		if (!sticky) return;

		const nextTopClass: "top-0" | "top-4" =
			sidebarStickyState[side].hasVisibleTop || isScrolled ? "top-4" : "top-0";

		if (sidebarStickyState[side].topClass !== nextTopClass) {
			sticky.classList.remove(sidebarStickyState[side].topClass);
			sticky.classList.add(nextTopClass);
			sidebarStickyState[side].topClass = nextTopClass;
		}
	});
}
