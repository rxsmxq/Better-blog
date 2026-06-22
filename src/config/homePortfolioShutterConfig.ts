export type HomePortfolioShutterPanel = {
	title: string;
	english: string;
	description: string;
	image: string;
	alt?: string;
};

export type HomePortfolioShutterInterlude = {
	/** 前景大图（仅显示上半部分） */
	foreground: string;
	/** 背景左侧滑入长条（从左向右） */
	stripLeft: string;
	/** 背景右侧滑入长条（从右向左） */
	stripRight: string;
	/** 中景左侧文字（人物左侧） */
	copyLeft: string;
	/** 中景右侧文字（人物右侧） */
	copyRight: string;
};

export type HomePortfolioShutterConfig = {
	enabled: boolean;
	kicker: string;
	title: string;
	description: string;
	scrollDistance: number;
	finalImage: {
		src: string;
		alt: string;
	};
	panels: HomePortfolioShutterPanel[];
	/** 5 张长条图之后的插入动画段：三层布局（背景长条 / 中景文字 / 前景大图） */
	interlude: HomePortfolioShutterInterlude;
};

export const homePortfolioShutterConfig = {
	enabled: true,
	kicker: "The End",
	title: "愿你每一天 都闪闪发光",
	description: "岁岁常欢愉，万事皆胜意",
	scrollDistance: 6000,
	finalImage: {
		src: "/assets/images/home-truncated/utl.webp",
		alt: "2026年 加油！",
	},
	interlude: {
		foreground: "/assets/images/home-truncated/b-1.webp",
		stripLeft: "/assets/images/home-truncated/b-2.webp",
		stripRight: "/assets/images/home-truncated/b-3.webp",
		copyLeft: "菲比",
		copyRight: "啾比",
	},
	panels: [
		{
			title: "外部站点",
			english: "PROJECTS",
			description: "菲比主站 · 工具导航",
			image: "/assets/images/home-truncated/1.webp",
			alt: "外部站点",
		},
		{
			title: "术业专攻",
			english: "SPECIALITIES",
			description: "AI学习 · 技术架构 · 踩坑记录",
			image: "/assets/images/home-truncated/2.webp",
			alt: "术业专攻",
		},
		{
			title: "博客特色",
			english: "BLOG FEATURES",
			description: "RAG 知识检索 · 归档热力图 · 结构化知识库",
			image: "/assets/images/home-truncated/3.webp",
			alt: "博客特色",
		},
		{
			title: "站点技术",
			english: "STACK",
			description: "Astro · SSG静态生成 · 纯AI零手工",
			image: "/assets/images/home-truncated/4.webp",
			alt: "站点技术",
		},
		{
			title: "相册收录",
			english: "PHOTO ALBUM",
			description: "AI 生图 · API 接入",
			image: "/assets/images/home-truncated/5.webp",
			alt: "相册收录",
		},
	],
} satisfies HomePortfolioShutterConfig;
