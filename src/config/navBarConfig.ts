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

		// 日历
		...(siteConfig.pages.calendar ? [LinkPreset.Calendar] : []),
	];

	// 根据配置决定是否添加留言板，在siteConfig关闭pages.guestbook时导航栏不显示留言板
	if (siteConfig.pages.guestbook) {
		links.push(LinkPreset.Guestbook);
	}

	// 根据配置决定是否添加友链，在siteConfig关闭pages.friends时导航栏不显示友链
	if (siteConfig.pages.friends) {
		links.push(LinkPreset.Friends);
	}

	// 工具及其子菜单
	links.push({
		name: "工具",
		url: "/other/",
		icon: "material-symbols:inventory-2",
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

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "/my/",
		icon: "material-symbols:person",
		children: [
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
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),
			LinkPreset.About,
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
