// Umami 配置
const UMAMI_BASE_URL = "https://stats.mmzhiku.xyz";
const UMAMI_WEBSITE_ID = "5907656e-d254-4c9e-ad73-5ce40bf184bb";

// 缓存 TTL（秒）
const STATS_CACHE_TTL = 300; // 统计缓存 5 分钟
const TOKEN_CACHE_TTL = 82800; // Token 缓存 23 小时（token 24h 有效，提前 1h 刷新）

/**
 * 获取 Umami JWT Token（带 KV 缓存）
 */
async function getUmamiToken(env) {
	const cached = await env.VISITOR_KV.get("umami:token");
	if (cached) return cached;

	const username = env.UMAMI_USERNAME;
	const password = env.UMAMI_PASSWORD;
	if (!username || !password) {
		throw new Error("UMAMI_USERNAME / UMAMI_PASSWORD not configured");
	}

	const resp = await fetch(`${UMAMI_BASE_URL}/api/auth/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"User-Agent": "curl/8.19.0",
		},
		body: JSON.stringify({ username, password }),
		redirect: "manual",
	});

	// 检查登录是否被重定向（通常是认证失败）
	if (resp.status >= 300 && resp.status < 400) {
		const location = resp.headers.get("location");
		throw new Error(`Umami login redirect detected (${resp.status}) to: ${location}`);
	}

	if (!resp.ok) {
		throw new Error(`Umami login failed: ${resp.status}`);
	}

	const { token } = await resp.json();
	if (!token) throw new Error("Umami login returned no token");

	// 缓存 token（fire-and-forget）
	env.VISITOR_KV.put("umami:token", token, {
		expirationTtl: TOKEN_CACHE_TTL,
	}).catch(() => {});

	return token;
}

/**
 * 从 Umami API 获取全站 PV/UV
 */
async function fetchUmamiStats(token) {
	const endAt = Date.now();
	const startAt = 0;
	const url = `${UMAMI_BASE_URL}/api/websites/${UMAMI_WEBSITE_ID}/sessions/stats?startAt=${startAt}&endAt=${endAt}&timezone=Asia/Shanghai`;

	// 使用 manual redirect 来诊断问题
	const resp = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
			"User-Agent": "curl/8.19.0",
		},
		redirect: "manual",
	});

	// 检查是否是重定向响应
	if (resp.status >= 300 && resp.status < 400) {
		const location = resp.headers.get("location");
		// 如果重定向到相同 URL，可能是认证问题或服务器配置问题
		if (location && (location === url || location.replace(/^http:/, "https:") === url)) {
			throw new Error(`Self-redirect detected (${resp.status}). This usually means: 1) The token is invalid/expired, 2) The API path doesn't exist and server redirects to itself, or 3) Server requires additional headers.`);
		}
		// 尝试跟随一次重定向
		if (location) {
			const redirectResp = await fetch(location, {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				redirect: "manual",
			});
			if (redirectResp.ok) {
				const data = await redirectResp.json();
				return {
					pv: data.pageviews?.value || 0,
					uv: data.visitors?.value || 0,
				};
			}
			throw new Error(`Redirect failed: ${redirectResp.status}`);
		}
	}

	if (!resp.ok) {
		throw new Error(`Umami stats API error: ${resp.status}`);
	}

	const data = await resp.json();
	return {
		pv: data.pageviews?.value || 0,
		uv: data.visitors?.value || 0,
	};
}

/**
 * 获取统计（优先缓存 → 次选 API）
 */
async function getStats(env) {
	const CACHE_KEY = "umami:stats";

	// 1. KV 缓存命中
	const cached = await env.VISITOR_KV.get(CACHE_KEY, { type: "json" });
	if (cached && cached.pv !== undefined) {
		return cached;
	}

	try {
		// 2. 缓存未命中 → 登录 → 查询
		const token = await getUmamiToken(env);
		const stats = await fetchUmamiStats(token);

		// 3. 写入缓存（fire-and-forget）
		env.VISITOR_KV.put(CACHE_KEY, JSON.stringify(stats), {
			expirationTtl: STATS_CACHE_TTL,
		}).catch(() => {});

		return stats;
	} catch (err) {
		// 如果是自循环重定向，可能是 token 过期，清除后重试一次
		if (err.message.includes("Self-redirect detected")) {
			console.log("Token may be invalid, clearing cache and retrying...");
			await env.VISITOR_KV.delete("umami:token");
			const token = await getUmamiToken(env);
			const stats = await fetchUmamiStats(token);
			env.VISITOR_KV.put(CACHE_KEY, JSON.stringify(stats), {
				expirationTtl: STATS_CACHE_TTL,
			}).catch(() => {});
			return stats;
		}
		throw err;
	}
}

export async function handleCount(_request, env) {
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	};

	if (_request.method === "OPTIONS") {
		return new Response(null, { headers });
	}

	try {
		const stats = await getStats(env);
		return Response.json(stats, { headers });
	} catch (err) {
		console.error("Failed to fetch stats:", err.message);

		// 降级：返回过期缓存
		try {
			const stale = await env.VISITOR_KV.get("umami:stats", {
				type: "json",
			});
			if (stale && stale.pv !== undefined) {
				return Response.json(stale, { headers });
			}
		} catch (_) {}

		// 返回错误信息以便调试（生产环境可移除）
		return Response.json(
			{ pv: 0, uv: 0, error: err.message },
			{ headers }
		);
	}
}
