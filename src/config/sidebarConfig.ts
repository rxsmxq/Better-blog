import type { SidebarLayoutConfig } from "../types/sidebarConfig";

/**
 * 侧边栏布局配置
 *
 * 组件的渲染顺序 = 数组中的出现顺序，但 position 为 top 的组件会整体排在 sticky 之前。
 */
export const sidebarLayoutConfig: SidebarLayoutConfig = {
	// 是否启用侧边栏（设为 false 可一键关掉，布局自动回到单列）
	enable: true,

	// left: 仅左侧 | right: 仅右侧 | both: 双侧（≥1280px 双显，768–1279px 按 tabletSidebar 显一侧）
	position: "both",

	// 平板端(768-1279px)显示哪侧侧边栏，仅 position 为 both 时生效
	tabletSidebar: "left",

	// 文章详情页是否整体隐藏侧边栏
	hideSidebarOnPostPage: false,

	// 留言页（/guestbook/）是否整体隐藏侧边栏
	// 留言页以对话流为主，窄侧栏空间利用率低；隐藏后内容列铺满 64rem 版心。
	hideSidebarOnGuestbookPage: true,

	// 首页是否隐藏侧边栏（默认 true）
	// 首页是全屏滚动画卷，且内容区自带分类/标签/订阅门户卡片，与侧栏信息重复。
	// 想让首页也显示侧栏，改成 false 即可。
	hideSidebarOnHomePage: true,

	// 无侧栏列时内容栏的最大宽度，保持与改造前的 64rem 版心一致
	noSidebarContentMaxWidth: "64rem",

	// 左侧边栏组件
	leftComponents: [
		{
			// 公告：页面级可见性开关已补齐（enable / showOnPostPage / hideOnNonPostPage /
			// hideOnPostListPage 均可用，与 stats 一致）。默认全站显示。
			// 想按页隐藏：showOnPostPage:false 隐藏详情页 /posts/*；
			// hideOnPostListPage:true 隐藏列表页 /list/「文档」；
			// hideOnNonPostPage:true 仅在详情页显示、其它页隐藏。
			type: "announcement",
			enable: false,
			position: "top",
			showOnPostPage: true,
			hideOnNonPostPage: false,
			hideOnPostListPage: false,
		},
		{
			type: "categories",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				// 分类数量超过 5 个时自动折叠
				collapseThreshold: 5,
			},
		},
		{
			type: "tags",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				// 标签数量超过 12 个时自动折叠
				collapseThreshold: 12,
			},
		},
	],

	// 右侧边栏组件
	rightComponents: [
		{
			// 站点统计：文章界面（详情页 /posts/* + 列表页 /list/「文档」）隐藏，
			// 其余页面（归档/分类/关于/友链/画廊…）保留；首页无侧栏故自动不显示。
			// showOnPostPage:false 管详情页，hideOnPostListPage:true 管列表页——两者配合
			// 才覆盖"整个文章界面"。要全站显示改 enable:true 并去掉这两个隐藏开关即可。
			type: "stats",
			enable: true,
			position: "top",
			showOnPostPage: false,
			hideOnPostListPage: true,
		},
		{
			// 音乐：Now Playing 卡片，订阅全局音乐引擎（当前关闭，enable 改 true 即可恢复）
			type: "music",
			enable: false,
			position: "sticky",
			showOnPostPage: true,
			hideOnNonPostPage: false,
		},
		{
			// 文章日历热力图
			type: "calendar",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			hideOnNonPostPage: false,
		},
	],

	// 移动端底部组件（<768px 时侧栏不参与布局，改由这里承担）
	mobileBottomComponents: [
		{
			type: "announcement",
			enable: false,
			showOnPostPage: true,
		},
		{
			type: "categories",
			enable: false,
			showOnPostPage: true,
		},
	],
};
