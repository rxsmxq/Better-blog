import type { AboutConfig } from "../types/config";

export const aboutConfig: AboutConfig = {
	// 是否显示关于页底部的「更新日志」模块
	// 数据来源：src/content/spec/log.md（渲染组件 src/components/about/ChangelogGraph.astro）
	// 设为 false 后整个 section 不再渲染，组件脚本也不会执行
	showChangelog: false,
};
