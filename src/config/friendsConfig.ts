import type { FriendLink, FriendsPageConfig } from "../types/config";

// 可以在src/content/spec/friends.md中编写友链页面下方的自定义内容

// 友链页面配置
export const friendsPageConfig: FriendsPageConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 是否显示底部自定义内容（friends.mdx 中的内容）
	showCustomContent: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否开启随机排序配置，如果开启，就会忽略权重，构建时进行一次随机排序
	randomizeSort: false,

	// 友链申请链接，填写后会在友链页面显示申请按钮
	// 使用模板参数直接跳转到友链申请模板
	applyLink:
		"https://github.com/MmzMing/my-blog/issues/new?template=friend-link.yml",
};

// 友链配置
export const friendsConfig: FriendLink[] = [
	{
		title: "Firefly Docs",
		imgurl: "https://docs-firefly.cuteleaf.cn/logo.png",
		desc: "Firefly主题模板文档",
		siteurl: "https://docs-firefly.cuteleaf.cn",
		tags: ["Docs"],
		weight: 5,
		enabled: true,
	},
	{
		title: "简历生成器",
		imgurl: "https://i.stardots.io/784774835/StarDots-2026042803043780900.png",
		desc: "一个轻量，网页端，本地缓存的简历生成器，支持多套模板，欢迎试用和反馈！",
		siteurl: "https://resume.mmzmingzsk.dpdns.org",
		tags: ["Tools"],
		weight: 5,
		enabled: true,
	},
	{
		title: "带后台带视频博客",
		imgurl: "https://i.stardots.io/784774835/StarDots-2026042803043780900.png",
		desc: "目前只展示前端，带企业级的后台视频博客，支持视频上传和播放，文档上传和下载，后台还带链路监控、日志监控等功能等等。因为使劲堆后台，实在太大，中间件一开启就用掉了6G的内存，还是一个微服务架构的博客。",
		siteurl: "https://dev.mmzmingzsk.dpdns.org/",
		tags: ["Blog"],
		weight: 5,
		enabled: true,
	},
	{
		title: "Fqzlr",
		imgurl: "https://q1.qlogo.cn/g?b=qq&nk=379446167&s=640",
		desc: "番茄煮理人大佬的博客，一位主打「人间凑数」「快乐摸鱼」的生活体验家，解锁了各种有趣的「非专业」技能，热衷于在生活里挖掘快乐，在摆烂中寻找平衡。",
		siteurl: "https://fqzlr.com/",
		tags: ["Blog"],
		weight: 5,
		enabled: true,
	},
	{
		title: "琳心",
		imgurl: "https://karina.xin/IMG_0280.jpeg",
		desc: "恣意探索 放弃就到此为止啦….",
		siteurl: "https://karina.xin/",
		tags: ["Blog"],
		weight: 5,
		enabled: true,
	},
	{
		title: "流欺の博客",
		imgurl: "https://tc.lqay.cn/LightPicture/2026/03/5f64e0f0f361e19c.png",
		desc: "嗯对就是个博客",
		siteurl: "https://blog.lqay.cn/",
		tags: ["Blog"],
		weight: 5,
		enabled: true,
	},
];

// 获取启用的友链并进行排序
export const getEnabledFriends = (): FriendLink[] => {
	const friends = friendsConfig.filter((friend) => friend.enabled);

	if (friendsPageConfig.randomizeSort) {
		return friends.sort(() => Math.random() - 0.5);
	}

	return friends.sort((a, b) => b.weight - a.weight);
};
