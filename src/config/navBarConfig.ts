import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 归档
		LinkPreset.Archive,
	];

	// 根据配置决定是否添加友链，在siteConfig关闭pages.friends时导航栏不显示友链
	if (siteConfig.pages.friends) {
		links.push(LinkPreset.Friends);
	}

	// 根据配置决定是否添加留言板，在siteConfig关闭pages.guestbook时导航栏不显示留言板
	if (siteConfig.pages.guestbook) {
		links.push(LinkPreset.Guestbook);
	}

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "/my/",
		icon: "material-symbols:person",
		children: [
			LinkPreset.About,
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),
			...(siteConfig.pages.gallery ? [LinkPreset.Gallery] : []),
			...(siteConfig.pages.bangumi
				? [
						{
							name: "追番",
							url: "/bangumi/",
							icon: "material-symbols:play-circle",
						},
					]
				: []),
		],
	});

	// 工具及其子菜单
	links.push({
		name: "工具",
		url: "/other/",
		icon: "material-symbols:apps",
		children: [
			...(siteConfig.pages.collections ? [LinkPreset.Collections] : []),
			{
				name: "统计",
				url: "https://stats.mmzhiku.xyz/share/uAfsjwbIKgVPjxtc",
				icon: "material-symbols:bar-chart",
				external: true,
			},
			{
				name: "简历生成器",
				url: "https://resume.mmzmingzsk.dpdns.org",
				icon: "material-symbols:description",
				external: true,
			},
		],
	});

	// 自定义导航栏链接,并且支持多级菜单
	links.push({
		name: "联系",
		url: "/links/",
		icon: "material-symbols:contact-page",

		// 子菜单
		children: [
			{
				name: "GitHub",
				url: "https://github.com/MmzMing",
				external: true,
				icon: "fa7-brands:github",
			},
			{
				name: "哈基墩QQ",
				url: "tencent://AddContact/?fromId=50&fromSubId=1&subcmd=all&uin=771220492",
				external: true,
				icon: "fa7-brands:qq",
			},
			{
				name: "B站",
				url: "https://space.bilibili.com/15446538",
				external: true,
				icon: "fa7-brands:bilibili",
			},
		],
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
