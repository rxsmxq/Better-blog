import type { CommentConfig } from "../types/config";

export const commentConfig: CommentConfig = {
	// 评论系统类型: none, twikoo, waline, giscus, disqus, artalk，默认为none，即不启用评论系统
	type: "waline",

	//twikoo评论系统配置，版本1.7.4
	twikoo: {
		envId: "https://twikoo.vercel.app",
		// 设置 Twikoo 评论系统语言
		lang: "zh-CN",
		// 是否启用文章访问量统计功能
		visitorCount: true,
	},

	//waline评论系统配置
	waline: {
		// waline 后端服务地址
		serverURL: "https://waline.mmzhiku.xyz/",
		// 设置 Waline 评论系统语言
		lang: "zh-CN",
		// 设置 Waline 评论系统表情地址
		emoji: [
			"https://unpkg.com/@waline/emojis@1.4.0/weibo",
			"https://unpkg.com/@waline/emojis@1.4.0/bilibili",
			"https://unpkg.com/@waline/emojis@1.4.0/bmoji",
		],
		// 可配置兼容的自建图片接口；留空时使用 Waline 原生内嵌图片
		// 评论登录模式。可选值如下：
		//   'enable'   —— 默认，允许访客匿名评论和用第三方 OAuth 登录评论，兼容性最佳。
		//   'force'    —— 强制必须登录后才能评论，适合严格社区，关闭匿名评论。
		//   'disable'  —— 禁止所有登录和 OAuth，仅允许匿名评论（填写昵称/邮箱），适用于极简留言。
		login: "enable",
		// 是否启用文章访问量统计功能
		visitorCount: false,
	},

	// artalk评论系统配置
	artalk: {
		// artalk后端程序 API 地址
		server: "https://artalk.example.com/",
		// 设置 Artalk 语言
		locale: "zh-CN",
		// 是否启用文章访问量统计功能
		visitorCount: true,
	},

	//giscus评论系统配置
	// ⚠️ 当前 commentConfig.type 是 "waline"，此段配置尚未生效（giscus 分支不会渲染）
	// 若要启用 giscus，需先完成两步：
	//   1) 在仓库 rxsmxq/Better-blog 安装 giscus App 并开启 Discussions
	//   2) 到 https://giscus.app 用该仓库重新生成 repoId / categoryId
	//      （当前二者为空字符串，为空时即便把 type 改成 giscus 也无法工作）
	giscus: {
		// 设置 Giscus 评论系统仓库
		repo: "rxsmxq/Better-blog",
		// 设置 Giscus 评论系统仓库ID
		repoId: "",
		// 设置 Giscus 评论系统分类
		category: "General",
		// 获取 Giscus 评论系统分类ID
		categoryId: "",
		// 获取 Giscus 评论系统映射方式
		mapping: "pathname",
		// 获取 Giscus 评论系统严格模式
		strict: "0",
		// 获取 Giscus 评论系统反应功能
		reactionsEnabled: "1",
		// 获取 Giscus 评论系统元数据功能
		emitMetadata: "0",
		// 获取 Giscus 评论系统输入位置
		inputPosition: "top",
		// 获取 Giscus 评论系统语言
		lang: "zh-CN",
		// 获取 Giscus 评论系统加载方式
		loading: "lazy",
	},

	//disqus评论系统配置
	disqus: {
		// 获取 Disqus 评论系统
		shortname: "firefly",
	},
};
