import type { SponsorConfig } from "../types/config";

export const sponsorConfig: SponsorConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "打赏",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 赞助用途说明
	usage: "",

	// 是否显示赞助者列表
	showSponsorsList: true,

	// 赞助方式列表（已清空：原列表里的收款码是 fork 来源作者的）
	// 页面开关在 siteConfig.pages.sponsor，放上自己的收款码后再打开
	// 添加一种方式的格式：
	// {
	// 	name: "微信支付",
	// 	icon: "fa7-brands:wechat-pay",      // 图标名，见 https://icon-sets.iconify.design
	// 	qrCode: "/assets/images/wechat-pay.webp", // 收款码图片，放在 public 目录下
	// 	link: "",                            // 可选：点击跳转的赞助链接（留空则只展示二维码）
	// 	description: "",                     // 可选：一行说明
	// 	enabled: true,                       // false 则不显示
	// },
	methods: [],

	// 赞助者列表（可选）
	// 原列表是原作者的示例数据（含其图床头像），已清空；有真实赞助者后再往里加
	// 添加格式：{ name: "昵称", avatar: "https://.../avatar.png", amount: "¥10", message: "留言", date: "2026-09-21" }
	sponsors: [],
};
