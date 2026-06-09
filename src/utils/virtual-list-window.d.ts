export type VirtualWindowInput = {
	itemCount: number;
	itemHeight: number;
	scrollY: number;
	viewportHeight: number;
	containerTop: number;
	overscan?: number;
};

export type VirtualWindowResult = {
	start: number;
	end: number;
	paddingTop: number;
	paddingBottom: number;
	totalHeight: number;
};

export type VirtualGridWindowInput = {
	itemCount: number;
	columnCount: number;
	rowHeight: number;
	scrollY: number;
	viewportHeight: number;
	containerTop: number;
	overscan?: number;
};

export type VirtualGridWindowResult = VirtualWindowResult & {
	rowCount: number;
	columnCount: number;
	startIndex: number;
	endIndex: number;
};

export function getVirtualWindow(
	input: VirtualWindowInput,
): VirtualWindowResult;

export function getVirtualGridWindow(
	input: VirtualGridWindowInput,
): VirtualGridWindowResult;
