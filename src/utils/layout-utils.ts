// 检查是否为首页
export const isHomePage = (pathname: string): boolean => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	const baseUrlNoSlash = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

	if (pathname === baseUrl) return true;
	if (pathname === baseUrlNoSlash) return true;
	if (pathname === "/") return true;

	return false;
};

export const isPostPage = (pathname: string): boolean => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	const postsPath = baseUrl === "/" ? "/posts/" : `${baseUrl}/posts/`;
	return pathname.startsWith(postsPath) || pathname.includes("/posts/");
};

export const isPostListPage = (pathname: string): boolean => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	// 文章列表页 = /list/ 及其分页 /list/2/ ...（标题「文档」，导航「文章」下拉）
	const listPath = baseUrl === "/" ? "/list/" : `${baseUrl}/list/`;
	return pathname === listPath.slice(0, -1) || pathname.startsWith(listPath);
};

export const isGuestbookPage = (pathname: string): boolean => {
	const baseUrl = import.meta.env.BASE_URL || "/";
	const guestbookPath =
		baseUrl === "/" ? "/guestbook/" : `${baseUrl}/guestbook/`;
	return (
		pathname === guestbookPath.slice(0, -1) ||
		pathname.startsWith(guestbookPath)
	);
};
