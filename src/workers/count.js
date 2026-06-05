// Umami 配置
const UMAMI_BASE_URL = "https://stats.mmzhiku.xyz";
const UMAMI_WEBSITE_ID = "5907656e-d254-4c9e-ad73-5ce40bf184bb";

// 缓存 TTL（秒）
const STATS_CACHE_TTL = 300; // 统计缓存 5 分钟
const TOKEN_CACHE_TTL = 82800; // Token 缓存 23 小时

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
		},
		body: JSON.stringify({ username, password }),
		redirect: "follow",
	});

	if (!resp.ok) {
		throw new Error(`Umami login failed: ${resp.status}`);
	}

	const { token } = await resp.json();
	if (!token) throw new Error("Umami login returned no token");

	// 缓存 token
	env.VISITOR_KV.put("umami:token", token, {
		expirationTtl: TOKEN_CACHE_TTL,
	}).catch(() => {});

	return token;
}

/**
 * 从 Umami API 获取全站 PV/UV
 * 官方文档: GET /api/websites/:websiteId/stats
 */
async function fetchUmamiStats(token) {
	const endAt = Date.now();
	const startAt = 0;
	const url = `${UMAMI_BASE_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;

	const resp = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		},
		redirect: "follow",
	});

	if (!resp.ok) {
		throw new Error(`Umami stats API error: ${resp.status}`);
	}

	const data = await resp.json();
	// 官方返回格式: { pageviews: 15171, visitors: 4415, visits: 5680, ... }
	return {
		pv: data.pageviews || 0,
		uv: data.visitors || 0,
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

		// 3. 写入缓存
		env.VISITOR_KV.put(CACHE_KEY, JSON.stringify(stats), {
			expirationTtl: STATS_CACHE_TTL,
		}).catch(() => {});

		return stats;
	} catch (err) {
		// 如果失败，清除 token 缓存后重试一次
		if (err.message.includes("login failed") || err.message.includes("Unauthorized")) {
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

		return Response.json({ pv: 0, uv: 0 }, { headers });
	}
}
