import { handleAIChat } from "./workers/ai-chat.js";
import { handleGuestbook } from "./workers/guestbook.js";

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/guestbook")) {
			return handleGuestbook(request, env, url);
		}

		if (url.pathname === "/api/ai-chat") {
			return handleAIChat(request, env);
		}

		if (env.ASSETS) {
			return env.ASSETS.fetch(request);
		}
		return new Response("Not Found", { status: 404 });
	},
};
