// 侧边栏组件配置类型定义
//
// 本文件从 Firefly 上游同步（CuteLeaf/Firefly v6.16.8），并按 MmzMing-mod 实际
// 支持的挂件做了裁剪：保留 announcement / categories / tags / stats，并新增
// music（Now Playing 卡片）/ calendar（文章日历热力图）。sidebarToc 已删除，
// 文章目录改由原生浮动的 ArticleTocPanel 提供，避免与侧栏重复。
//
// 若要新增挂件，三步即可：
//   1. 在这里把类型名加进 WidgetComponentType 联合
//   2. 在 src/components/layout/SideBar.astro 的 componentMap 里补上组件
//   3. 在 src/config/sidebarConfig.ts 里配置启用

export type WidgetComponentType =
	| "announcement"
	| "categories"
	| "tags"
	| "stats"
	| "music"
	| "calendar";

export type WidgetComponentConfig = {
	type: WidgetComponentType; // 组件类型
	enable: boolean; // 是否启用该组件
	showTitle?: boolean; // 是否显示该组件标题，默认 true
	position: "top" | "sticky"; // 组件位置：top=固定在顶部，sticky=粘性定位（可滚动）
	showOnPostPage?: boolean; // 是否在文章详情页显示，默认 true
	hideOnNonPostPage?: boolean; // 是否在非文章详情页隐藏，默认 false
	hideOnPostListPage?: boolean; // 是否在文章列表页（/list/「文档」）隐藏，默认 false
	specificConfig?: WidgetSpecificConfig;
	customProps?: Record<string, unknown>; // 自定义属性，用于扩展组件功能
};

export type MobileBottomComponentConfig = {
	type: WidgetComponentType; // 组件类型
	enable: boolean; // 是否启用该组件
	showTitle?: boolean; // 是否显示该组件标题，默认 true
	showOnPostPage?: boolean; // 是否在文章详情页显示
	hideOnNonPostPage?: boolean; // 是否在非文章详情页隐藏
	hideOnPostListPage?: boolean; // 是否在文章列表页（/list/「文档」）隐藏
	specificConfig?: WidgetSpecificConfig;
	customProps?: Record<string, unknown>;
};

// 组件通用专属配置
export type WidgetSpecificConfig = {
	collapseThreshold?: number; // 折叠阈值：条目数超过该值时自动折叠
};

export type SidebarLayoutConfig = {
	enable: boolean; // 是否启用侧边栏
	position: "left" | "right" | "both"; // 侧边栏位置
	tabletSidebar?: "left" | "right"; // 平板端(768-1279px)显示哪侧，仅 position 为 both 时生效，默认 left
	hideSidebarOnPostPage?: boolean; // 文章详情页隐藏侧边栏，默认 false
	hideSidebarOnGuestbookPage?: boolean; // 留言页（/guestbook/）隐藏侧边栏，默认 false
	/**
	 * 首页隐藏侧边栏，默认 true。
	 * 本项目的首页是全屏滚动画卷（HomeHero / HomeBlinds / HomeDataLayer），
	 * 且内容区自带「分类 / 标签索引 / 订阅」门户卡片，与侧栏信息重复；
	 * 加上侧栏会把内容列从 64rem 压窄，破坏这套版式。需要时置 false 即可开启。
	 */
	hideSidebarOnHomePage?: boolean;
	/**
	 * 本页没有侧栏列时，内容栏的最大宽度（CSS 长度，默认 64rem）。
	 * 用绝对宽度而非比例，保证首页/无侧栏页与改造前的 64rem 版心完全一致，
	 * 不受视口宽度影响。
	 */
	noSidebarContentMaxWidth?: string;
	leftComponents: WidgetComponentConfig[]; // 左侧边栏组件配置列表
	rightComponents: WidgetComponentConfig[]; // 右侧边栏组件配置列表
	mobileBottomComponents: MobileBottomComponentConfig[]; // 移动端底部组件列表（<768px 显示）
};
