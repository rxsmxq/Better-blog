/**
 * ECharts 按需引入
 * 只打包用到的模块，减小体积
 */
import * as echarts from "echarts/core";
import { PieChart, TreemapChart } from "echarts/charts";
import {
	TitleComponent,
	TooltipComponent,
	LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
	PieChart,
	TreemapChart,
	TitleComponent,
	TooltipComponent,
	LegendComponent,
	CanvasRenderer,
]);

export default echarts;
