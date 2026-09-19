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

	// 赞助方式列表
	methods: [
		{
			name: "菲比啾比支付",
			icon: "material-symbols:chat-bubble",
			// 收款码图片路径（需要放在 public 目录下）
			qrCode: "/assets/images/wechat-pay.avif",
			link: "",
			description: "",
			enabled: true,
		},
		{
			name: "支付宝支付",
			icon: "fa7-brands:alipay",
			// 收款码图片路径（需要放在 public 目录下）/assets/images/alipay.webp
			qrCode: "",
			link: "",
			description: "",
			enabled: true,
		},
	],

	// 赞助者列表（可选）
	// 原列表是原作者的示例数据（含其图床头像），已清空；有真实赞助者后再往里加
	sponsors: [],
};
