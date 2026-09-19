/**
 * 组装侧栏渲染所需的派生状态与网格几何（SSR，纯配置读）
 *
 * 从 Firefly 上游同步（CuteLeaf/Firefly v6.16.8）。
 */

import { sidebarLayoutConfig } from "@/config";
import {
	computeGridColumns,
	getResponsiveSidebarConfig,
	gridColumnVarsToStyle,
} from "@/utils/responsive-utils";

export interface EffectiveSidebarContext {
	isPostPage: boolean;
	isHomePage: boolean;
	isGuestbookPage: boolean;
}

export interface EffectiveSidebarState {
	hideSidebarOnPostPage: boolean;
	hideSidebarOnHomePage: boolean;
	hideSidebarOnGuestbookPage: boolean;
	hasLeftComponents: boolean;
	hasRightComponents: boolean;
	sidebarClass: string;
	staticBarClass: string;
	gridColumnStyle: string;
	/** #main-grid 需要的 data-* 属性，客户端 updateMainGridCols 据此重算几何 */
	gridDataAttrs: Record<string, string>;
}

/**
 * hasLeft/RightComponents 只依据 enable + position，不含页面类型判定 ——
 * 静态容器只 SSR 一次，按页型收窄会让它永久变空。
 */
export function getEffectiveSidebarState(
	ctx: EffectiveSidebarContext,
): EffectiveSidebarState {
	const { isPostPage, isHomePage, isGuestbookPage } = ctx;

	const sidebarConfig = getResponsiveSidebarConfig();

	const hideSidebarOnPostPage =
		sidebarLayoutConfig.hideSidebarOnPostPage === true;
	const hideSidebarOnHomePage =
		sidebarLayoutConfig.hideSidebarOnHomePage === true;
	const hideSidebarOnGuestbookPage =
		sidebarLayoutConfig.hideSidebarOnGuestbookPage === true;

	const gridColumnVars = computeGridColumns({
		enabled: sidebarLayoutConfig.enable,
		position: sidebarLayoutConfig.position,
		tabletSidebar: sidebarConfig.tabletSidebar,
		hideSidebarOnPostPage,
		hideSidebarOnHomePage,
		hideSidebarOnGuestbookPage,
		isPostPage,
		isHomePage,
		isGuestbookPage,
		hasLeftWidgets: isPostPage
			? sidebarConfig.hasLeftWidgetsOnPost
			: sidebarConfig.hasLeftWidgetsOnNonPost,
		hasRightWidgets: isPostPage
			? sidebarConfig.hasRightWidgetsOnPost
			: sidebarConfig.hasRightWidgetsOnNonPost,
		noSidebarContentMaxWidth: sidebarLayoutConfig.noSidebarContentMaxWidth,
	});

	return {
		hideSidebarOnPostPage,
		hideSidebarOnHomePage,
		hideSidebarOnGuestbookPage,
		hasLeftComponents: sidebarConfig.hasLeftComponents,
		hasRightComponents: sidebarConfig.hasRightComponents,
		// 定位类已由 #main-grid 的列几何接管，这里只剩与列位置无关的公共类
		sidebarClass: "mb-4 onload-animation",
		// 只裁横向、纵向放开：评论区浮层需能溢出内容列；clip 不产生滚动容器，不影响列内吸顶
		staticBarClass: "min-w-0 overflow-x-clip overflow-y-visible",
		gridColumnStyle: gridColumnVarsToStyle(gridColumnVars),
		gridDataAttrs: {
			"data-sidebar-enable": sidebarLayoutConfig.enable ? "true" : "false",
			"data-grid-hide-sidebar-on-post": hideSidebarOnPostPage
				? "true"
				: "false",
			"data-grid-hide-sidebar-on-home": hideSidebarOnHomePage
				? "true"
				: "false",
			"data-grid-hide-sidebar-on-guestbook": hideSidebarOnGuestbookPage
				? "true"
				: "false",
			"data-sidebar-position": sidebarLayoutConfig.position,
			"data-tablet-sidebar": sidebarConfig.tabletSidebar,
			// 无侧栏列时的内容栏最大宽度（CSS 长度），空串表示未配置
			"data-no-sidebar-content-max-width":
				sidebarLayoutConfig.noSidebarContentMaxWidth ?? "",
			"data-has-left-on-post": sidebarConfig.hasLeftWidgetsOnPost
				? "true"
				: "false",
			"data-has-left-on-non-post": sidebarConfig.hasLeftWidgetsOnNonPost
				? "true"
				: "false",
			"data-has-right-on-post": sidebarConfig.hasRightWidgetsOnPost
				? "true"
				: "false",
			"data-has-right-on-non-post": sidebarConfig.hasRightWidgetsOnNonPost
				? "true"
				: "false",
		},
	};
}
