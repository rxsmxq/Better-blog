import type { FriendLink, FriendsPageConfig } from "../types/config";

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,

	// 友链申请链接，填写后会在友链页面显示申请按钮
	// ⚠️ 已换成你自己的 GitHub（原先指向原作者仓库）；若仓库里没有 friend-link.yml
	// 模板，可删掉 `?template=...` 直接用 issues/new
	applyLink: "https://github.com/rxsmxq/my-blog/issues/new?template=friend-link.yml",

	// 本站信息，用于友链申请指南弹窗中的站点信息展示
	siteInfo: {
		name: "Better的博客",
		desc: "一个记录学习、生活，分享经验的个人博客。",
		// ⚠️ 占位值，改成你自己的域名（与 siteConfig.site_url 保持一致）
		url: "https://example.com",
		// 头像直链：部署后对方可通过 https://你的域名/assets/images/avatar.webp 访问
		// （site_url 定下来后，这里建议改成完整 URL）
		avatar: "/assets/images/avatar.webp",
		// 与 footerConfig 里的邮箱保持一致
		email: "1904253070@qq.com",
	},

	// 注意事项，用于友链申请指南弹窗中的注意事项展示
	notes: [
		{
			title: "互换原则",
			content: "请先将本站添加到您的友链页面，确认后会添加您的友链",
		},
		{
			title: "链接维护",
			content: "友链网站长期无法访问或内容违规，将会被移除",
		},
		{
			title: "内容要求",
			content: "内容积极向上，不含有任何含色情/反动/暴力等违法违规内容",
		},
		{
			title: "站点要求",
			content: "支持 HTTPS，以原创内容为主，能够正常访问且有持续更新",
		},
	],

	// 对话气泡文案，滚动到申请区时逐个弹出并打字机显示
	// role: "cat" = 喵墩（左侧，作者头像）；"owner" = 站长（右侧，文字头像）
	// showChat: false 隐藏整个对话气泡区（友链规则/申请区不受影响）
	showChat: false,
	chat: [
		{
			role: "cat",
			name: "喵墩",
			text: "来者何人喵？报上名号，本喵爪子底下可不收无名之辈。",
		},
		{
			role: "owner",
			name: "站长",
			text: "哈基墩，不得无礼！！欢迎各位大佬来小破站。",
		},
		{
			role: "cat",
			name: "喵墩",
			text: "喵？抱歉喵~第一时间没认出大佬您，里边请，茶水管够，把这儿当自己窝就行喵~",
		},
	],
};

// 友链配置
export const friendsConfig: FriendLink[] = [
	// 友链列表已清空（原先是 fork 来源作者的友链数据，连同其头像图一并清理）
	// 添加一条友链的格式：
	// {
	// 	title: "站点名",
	// 	imgurl: "https://example.com/avatar.png",   // 头像直链（推荐，省得自己存图）
	// 	// image: "/assets/images/friends/xxx.webp",  // 也可以用 public 下的本地图
	// 	desc: "一句话简介",
	// 	siteurl: "https://example.com",
	// 	tags: ["Blog"],
	// 	weight: 5,        // 越大越靠前
	// 	enabled: true,    // false 则不显示
	// },
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	// 权重降序；同权重时保留配置列表中的原始顺序
	return friends
		.map((friend, index) => ({ friend, index }))
		.sort((a, b) => b.friend.weight - a.friend.weight || a.index - b.index)
		.map(({ friend }) => friend);
};
