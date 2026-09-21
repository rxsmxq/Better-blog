import type { HomeConfig } from "../types/config";

export const homeConfig: HomeConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "assets/images/avatar.webp",

	// 名字
	name: "Better",

	// 首页展示名字（留空则使用 name）
	displayName: "Better",

	// 职业/身份标签
	occupation: "[学生 / 技术爱好者]",

	// 个人签名（支持多条，会循环打字+删除效果）
	bio: ["道阻且长，行则将至；行而不辍，未来可期。"],

	hero: {
		backgroundImage: "/assets/images/home/home.avif",
		mosaic: {
			rows: 4,
			columns: 6,
			idleVisible: 6,
			idleInterval: 900,
			seed: 20260814,
			// 首屏六块碎片按 reveal rank 放置；滚动或轮换后的随机布局不受影响。
			initialLayout: [
				{ x: 0.14, y: 0.305, width: 0.104, height: 0.205 },
				{ x: 0.435, y: 0.18, width: 0.068, height: 0.13, blur: 5.5 },
				{ x: 0.642, y: 0.368, width: 0.047, height: 0.092, blur: 5 },
				{ x: 0.863, y: 0.402, width: 0.097, height: 0.19 },
				{ x: 0.337, y: 0.653, width: 0.159, height: 0.313 },
				{ x: 0.639, y: 0.751, width: 0.116, height: 0.228 },
			],
			scrub: 0.45,
			// 滑动距离整体砍半，同样的滚动量推进更快
			desktopScrollDistance: 3250,
			mobileScrollDistance: 2300,
			desktopDialogueTailDistance: 240,
			mobileDialogueTailDistance: 180,
			desktopMinViewports: 4.05,
			mobileMinViewports: 3.05,
			interactionHold: 0.06,
		},
		contact: {
			platform: "B站",
			handle: "-_-Better-",
		},
		sticker: {
			image: "/assets/images/home/character.avif",
			alt: "角色贴纸",
			eye: {
				xPercent: 42.1,
				yPercent: 48.2,
				widthPercent: 7,
				travelXPercent: 1.4,
				travelYPercent: 1,
			},
			rightEye: {
				xPercent: 63.1,
				yPercent: 44.7,
				widthPercent: 7,
			},
			mouth: {
				// 静息态尺寸；说话中另可用 talkWidthPercent / talkHeightPercent 覆盖
				xPercent: 53.4,
				yPercent: 53.7,
				widthPercent: 7.2,
				heightPercent: 1.9,
				rotation: -6,
				travelScale: 0.45,
			},
		},
		// galgame 对话框（写死暗黑主题）。内容全部由此驱动，可自由增删
		dialogue: {
			enabled: true,
			speakers: {
				host: "哈基妮",
				visitor: "访客",
			},
			menuTitle: "想了解什么？",
			typingSpeed: 45,
			autoDelay: 1600,
			// 默认逐句播放的简介，末句后弹出话题菜单
			intro: [
				{ speaker: "host", text: "欸——来客人喽，随便坐，别客气。" },
				{ speaker: "host", text: "我是菈妮，Better可能在玩游戏，现在这儿归我管。" },
				{
					speaker: "host",
					text: "对了，得搬上简介了：道阻且长，行则将至；行而不辍，未来可期。",
				},
				{ speaker: "host", text: "想打听啥？戳戳下面的话题，我都能告诉你。" },
			],
			// 话题菜单：点击进入逐句对话，末句后返回菜单
			topics: [
				{
					title: "关于Better",
					lines: [
						{ speaker: "visitor", text: "Better是做什么的？" },
						{
							speaker: "host",
							text: "目前还是学生，建这个博客是因为他太无聊了。",
						},
						{ speaker: "visitor", text: "学生有这么闲吗。" },
						{
							speaker: "host",
							text: "是的，因为专业的原因，他现在正在经历一个很长的假期。",
						},
					],
				},
				{
					title: "博客内容",
					lines: [
						{ speaker: "visitor", text: "一般更新什么类型的文章呢？" },
						{
							speaker: "host",
							text: "主要是记录学习和生活，如果有值得分享的学习笔记或开源项目也会发布。",
						},
						{ speaker: "host", text: "慢慢逛，希望你玩的开心！" },
					],
				},
			],
		},
		// 玻璃雨珠 + 撞击水花（移动端自动降低密度，尊重 prefers-reduced-motion）
		rain: {
			enabled: true,
			intensity: 0.6,
			// 留空则随主题自动取色（暗色→白 / 浅色→深灰）；也可填 "#7fb0ff" 或 "127,176,255"
			color: "#ffffff",
		},
	},

	dataLayer: {
		visitImage: "/assets/images/home/home-data-1.avif",
		archiveImage: "/assets/images/home/home-data-2.avif",
		contactImage: "/assets/images/home/home-data-3.avif",
	},

	// 桌面端双层影像交互：固定背景揭示 → 五幕画面横向叙事
	// 主题「樱笋年光」：樱桃花与新笋同上市的三月，一年里最短暂的一段春光
	homeBlinds: {
		enabled: true,
		reveal: {
			backgroundImage: "/assets/images/home-blinds/act2/1.webp",
			foregroundImage: "/assets/images/home-blinds/act1/1.webp",
			foregroundAlt: "奔跑人物剪影",
			foregroundOpacity: 0.5,
			pointerTravel: 28,
			// 长条横移揭示的入场标题：标题单行显示（版式按 4 字排），
			// 祝福语单行显示（版式按 5 字排），可自由增减条数
			headline: {
				title: "",
				messages: [""],
				enterDuration: 0.6,
				messageHold: 2.6,
				messageFlipDuration: 0.75,
			},
		},
		scenes: {
			scrollDistance: 3400,
			// 背景跑马灯：列表从右往左无缝循环，只有一张也会自动复制到铺满。
			// 第二张是第一张的水平镜像：相邻两格的接缝全是镜像边界，像素级连续，
			// 避免「同一张图自身首尾硬拼」在连续留白的宣纸底色上出现竖向断层
			cycleImages: [
				"/assets/images/home-blinds/act-cycle/1.webp",
				"/assets/images/home-blinds/act-cycle/2.webp",
			],
			cycleDuration: 26,
			composite: {
				eyebrow: "PROLOGUE / BLOOM",
				title: "樱笋年光",
				description: "樱桃花与新笋一同上市，一年里最短的春光，就从这一刻开始。",
				alt: "暮春庭院樱笋同框水墨插画",
				// 明信片右下角的落款文字：五幕依次对应惊蛰→春分→清明→谷雨→立夏，
				// 用节气代替具体日期，删掉即不显示
				date: "惊蛰·樱笋",
			},
			items: [
				{
					eyebrow: "SCENE 02 / BLOSSOM",
					title: "一树樱开",
					description: "风过巷口，一树花全开了，粉白压弯枝头，落满青石板路。",
					image: "/assets/images/home-blinds/act3/1.webp",
					alt: "巷口樱花盛开水墨插画",
					date: "春分·花朝",
				},
				{
					eyebrow: "SCENE 03 / SPROUT",
					title: "春笋破土",
					description: "一夜雨过后，泥里钻出尖尖的笋，裹着褐衣，一夜长半尺。",
					image: "/assets/images/home-blinds/act3/2.webp",
					alt: "春笋破土而出水墨插画",
					date: "清明·新笋",
				},
				{
					eyebrow: "SCENE 04 / PETALS",
					title: "花落成雪",
					description: "花期只七日，风一起便纷纷落，落满石阶与流水，春过半。",
					image: "/assets/images/home-blinds/act3/3.webp",
					alt: "樱花飘落石阶流水水墨插画",
					date: "谷雨·落花",
				},
				{
					eyebrow: "FINALE / DAYLIGHT",
					title: "年光渐长",
					description: "樱尽笋成竹，昼长夜短，年光往前挪了一格，只剩温软旧色。",
					image: "/assets/images/home-blinds/act3/4.webp",
					alt: "初夏绿荫细竹日影水墨插画",
					date: "立夏·年光",
				},
			],
			standImages: ["/assets/images/home-blinds/act4/1.webp"],
		},
	},

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "qq",
			icon: "fa7-brands:qq",
			url: "https://qm.qq.com/q/rZBqjUc0Ks",
			showName: false,
		},
		{
			name: "B站",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/119850018",
			showName: false,
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/rxsmxq",
			showName: false,
		},
		{
			name: "站内留言",
			icon: "material-symbols:chat-rounded",
			url: "/guestbook/",
			showName: false,
		},
		{
			name: "RSS",
			icon: "fa7-solid:rss",
			url: "/rss/",
			showName: false,
		},
	],
};
