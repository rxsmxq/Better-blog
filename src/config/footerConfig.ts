import type { FooterConfig } from "../types/config";

export const footerConfig: FooterConfig = {
	// 社交链接（mailto:/tel: 开头的链接不会在新标签打开）
	socialLinks: [
		{
			label: "GitHub",
			href: "https://github.com/rxsmxq",
			icon: "fa7-brands:github",
		},
		{
			label: "QQ",
			href: "https://qm.qq.com/q/rZBqjUc0Ks",
			icon: "fa7-brands:qq",
		},
		{
			label: "B站",
			href: "https://space.bilibili.com/119850018",
			icon: "fa7-brands:bilibili",
		},
		{
			label: "邮箱",
			href: "mailto:1904253070@qq.com",
			icon: "material-symbols:mail",
		},
	],

	// 备案信息（icp/police 留空则不显示对应条目）
	// ⚠️ 下面两个 URL 里的号码都是**示例占位**，换成你自己的备案号后再填 icp / police
	beian: {
		// ICP 备案号（工信部），示例：京ICP备12345678号-1
		icp: "",
		// 公安网备号，示例：京公网安备11010802012345号
		police: "",
		policeIcon: "/assets/images/备案图标.png",
		icpUrl: "https://beian.miit.gov.cn/#/Integrated/index",
		policeUrl: "https://beian.mps.gov.cn/#/query/webSearch?code=00000000000000",
	},

	// Powered by 信息
	poweredBy: [
		{ label: "框架", name: "Astro", href: "https://astro.build" },
		{
			label: "主题",
			name: "Firefly",
			href: "https://github.com/CuteLeaf/Firefly",
		},
	],

	// 页脚工具链接（Sitemap / RSS / 隐私政策 / 用户协议）
	// false = 隐藏（整行不渲染，含分隔符），改成 true 即可恢复，无需改组件
	showUtilityLinks: false,
};
