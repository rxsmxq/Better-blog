/**
 * Bilibili 音频代理 - Cloudflare Pages Function
 *
 * 功能：
 *   1. 代理 B站 playurl API（服务端调用，避免 CORS）
 *   2. 实现 WBI 签名
 *   3. 返回音频流给浏览器
 *
 * 路由：
 *   GET /api/bilibili-proxy/playurl?aid=X&cid=Y  → 返回音频流 URL (JSON)
 *   GET /api/bilibili-proxy/audio?aid=X&cid=Y     → 返回音频流 (推荐)
 */

// ── WBI 混排表 ──────────────────────────────────────
const MIXIN_KEY_ENC_TAB = [
	46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
	33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
	61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
	36, 20, 34, 44, 52,
];

function getMixinKey(orig) {
	let mixed = "";
	for (const n of MIXIN_KEY_ENC_TAB) {
		mixed += orig[n] || "";
	}
	return mixed.slice(0, 32);
}

function getWbiKeysFromUrl(url) {
	if (!url) return "";
	return url.slice(url.lastIndexOf("/") + 1, url.lastIndexOf("."));
}

async function getWbiKeys() {
	const res = await fetch("https://api.bilibili.com/x/web-interface/nav", {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Referer: "https://www.bilibili.com",
		},
	});
	if (!res.ok) return { img_key: "", sub_key: "" };

	const body = await res.json();
	if (body.code !== 0 || !body.data?.wbi_img) {
		return { img_key: "", sub_key: "" };
	}

	const { img_url, sub_url } = body.data.wbi_img;
	return {
		img_key: getWbiKeysFromUrl(img_url),
		sub_key: getWbiKeysFromUrl(sub_url),
	};
}

// ── 轻量 MD5 实现（公共领域算法）──────────────────────
function md5(s) {
	function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }
	function toHex(x) {
		let h = "";
		for (let i = 0; i < 4; i++) {
			h += ("0" + ((x >>> (i * 8)) & 0xff).toString(16)).slice(-2);
		}
		return h;
	}

	function strToBytes(str) {
		const bytes = [];
		for (let i = 0; i < str.length; i++) {
			let c = str.charCodeAt(i);
			if (c < 0x80) bytes.push(c);
			else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
			else { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
		}
		return bytes;
	}

	const bytes = strToBytes(s);
	const origLen = bytes.length * 8;
	bytes.push(0x80);
	while (bytes.length % 64 !== 56) bytes.push(0);
	for (let i = 0; i < 8; i++) bytes.push((origLen >>> (i * 8)) & 0xff);

	let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
	const K = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
		0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
		0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
		0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
		0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
		0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
		0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
		0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391];
	const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
		5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
		4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
		6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

	for (let i = 0; i < bytes.length; i += 64) {
		const w = [];
		for (let j = 0; j < 64; j++) {
			w.push(bytes[i + j]);
		}
		const M = [];
		for (let j = 0; j < 16; j++) {
			M[j] = w[j * 4] | (w[j * 4 + 1] << 8) | (w[j * 4 + 2] << 16) | (w[j * 4 + 3] << 24);
		}
		let A = a, B = b, C = c, D = d;
		for (let j = 0; j < 64; j++) {
			let F, g;
			if (j < 16) { F = (B & C) | (~B & D); g = j; }
			else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
			else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
			else { F = C ^ (B | ~D); g = (7 * j) % 16; }
			const tmp = D;
			D = C;
			C = B;
			B = B + rotl(A + F + K[j] + M[g], S[j]);
			A = tmp;
		}
		a = (a + A) | 0;
		b = (b + B) | 0;
		c = (c + C) | 0;
		d = (d + D) | 0;
	}
	return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

// ── WBI 签名 ──────────────────────────────────────────
async function signParams(params) {
	const { img_key, sub_key } = await getWbiKeys();
	if (!img_key || !sub_key) return params;

	const mixinKey = getMixinKey(img_key + sub_key);
	const currTime = Math.round(Date.now() / 1000);
	params.wts = currTime;

	const sortedKeys = Object.keys(params)
		.filter((k) => params[k] !== null && params[k] !== undefined)
		.sort();
	const parts = [];
	for (const key of sortedKeys) {
		const value = String(params[key]).replace(/[!'()*]/g, "");
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
	}
	const query = parts.join("&");
	const wbiSign = md5(query + mixinKey);

	return { ...params, w_rid: wbiSign };
}

// ── 获取音频播放 URL ──────────────────────────────────
async function getPlayUrl(aid, cid) {
	const params = await signParams({
		avid: aid,
		cid: cid,
		qn: 16,
		fnval: 4048,
		fourk: 0,
		platform: "web",
	});

	const qs = new URLSearchParams(params).toString();
	const url = `https://api.bilibili.com/x/player/wbi/playurl?${qs}`;

	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			Referer: "https://www.bilibili.com",
		},
	});

	if (!res.ok) throw new Error(`Bilibili playurl API: HTTP ${res.status}`);

	const body = await res.json();
	if (body.code !== 0)
		throw new Error(`Bilibili playurl API: ${body.code} ${body.message}`);

	const data = body.data;
	if (!data) throw new Error("Bilibili playurl API: 无返回数据");

	if (data.dash?.audio?.length > 0) {
		for (const audio of data.dash.audio) {
			if (audio.baseUrl) {
				return {
					url: audio.baseUrl,
					backupUrl: audio.backupUrl || [],
					bandwidth: audio.bandwidth,
					mimeType: audio.mimeType,
					codecs: audio.codecs,
					duration: data.duration,
				};
			}
		}
	}

	if (data.durl?.length > 0) {
		return {
			url: data.durl[0].url,
			backupUrl: data.durl[0].backup_url || [],
			mimeType: "audio/mp4",
			duration: data.timelength,
		};
	}

	throw new Error("Bilibili playurl API: 未找到可用的音频流");
}

// ── 路由处理 ───────────────────────────────────────────
async function handlePlayUrl(request) {
	const url = new URL(request.url);
	const aid = url.searchParams.get("aid");
	const cid = url.searchParams.get("cid");

	if (!aid || !cid) {
		return new Response(JSON.stringify({ error: "缺少 aid 或 cid 参数" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const info = await getPlayUrl(aid, cid);
		return new Response(JSON.stringify(info), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), {
			status: 502,
			headers: { "Content-Type": "application/json" },
		});
	}
}

async function handleAudio(request) {
	const url = new URL(request.url);
	const aid = url.searchParams.get("aid");
	const cid = url.searchParams.get("cid");

	if (!aid || !cid) {
		return new Response("缺少 aid 或 cid 参数", { status: 400 });
	}

	try {
		const info = await getPlayUrl(aid, cid);
		let audioUrl = info.url;

		const audioRes = await fetch(audioUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.bilibili.com",
			},
		});

		if (!audioRes.ok && info.backupUrl?.length > 0) {
			for (const backup of info.backupUrl) {
				const br = await fetch(backup, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Referer: "https://www.bilibili.com",
					},
				});
				if (br.ok) {
					const h = new Headers(br.headers);
					h.set("Content-Type", info.mimeType || "audio/mp4");
					h.set("Cache-Control", "public, max-age=3600");
					h.set("Access-Control-Allow-Origin", "*");
					return new Response(br.body, { status: br.status, headers: h });
				}
			}
			throw new Error("所有音频源均不可用");
		}

		const headers = new Headers(audioRes.headers);
		headers.set("Content-Type", info.mimeType || "audio/mp4");
		headers.set("Cache-Control", "public, max-age=3600");
		headers.set("Access-Control-Allow-Origin", "*");

		return new Response(audioRes.body, {
			status: audioRes.status,
			headers,
		});
	} catch (err) {
		return new Response(err.message, { status: 502 });
	}
}

// ── 入口 ──────────────────────────────────────────────
export async function onRequest(context) {
	const { request } = context;
	const url = new URL(request.url);

	if (request.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "*",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	if (url.pathname.endsWith("/playurl")) return handlePlayUrl(request);
	if (url.pathname.endsWith("/audio")) return handleAudio(request);

	return new Response("Bilibili proxy: 未知路由", { status: 404 });
}
