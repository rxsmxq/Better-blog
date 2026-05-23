#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
	const configPath = path.resolve(ROOT, "src/config/musicConfig.ts");
	const configContent = fs.readFileSync(configPath, "utf-8");
	let match = configContent.match(
		/export\s+const\s+musicPlayerConfig[^=]*=\s*(\{[\s\S]*}\s*;)/,
	);
	if (!match) {
		console.warn("⚠️  [bilibili] 无法解析 musicConfig.ts");
		return;
	}

	let config;
	try {
		config = new Function(`return ${match[1]}`)();
	} catch (err) {
		console.warn("⚠️  [bilibili] 解析 musicConfig.ts 失败:", err.message);
		return;
	}

	if (config.mode !== "bilibili" || !config.bilibili) {
		console.log("ℹ️  [bilibili]  mode 不为 bilibili，跳过收藏抓取");
		return;
	}

	const { mediaId, playlistJsonPath } = config.bilibili;
	if (!mediaId) {
		console.warn("⚠️  [bilibili]  mediaId 未配置");
		return;
	}

	const MID_LIKE = mediaId.replace(/^ml/, "");
	const OUTPUT_PATH = path.join(
		ROOT,
		"public",
		(playlistJsonPath || "/assets/music/bilibili-playlist.json").replace(/^\//, ""),
	);
	const API_BASE = "https://api.bilibili.com";

	console.log(`📦 [bilibili] 开始抓取收藏夹: ${mediaId}`);

	const playlist = [];
	let pn = 1;
	let hasMore = true;

	while (hasMore) {
		const url = `${API_BASE}/x/v3/fav/resource/list?media_id=${MID_LIKE}&ps=20&pn=${pn}&platform=web`;
		const res = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.bilibili.com",
			},
		});

		if (!res.ok) {
			console.warn(
				`⚠️  [bilibili] API 请求失败 (第 ${pn} 页): HTTP ${res.status}`,
			);
			break;
		}

		const body = await res.json();
		if (body.code !== 0) {
			console.warn(
				`⚠️  [bilibili] API 返回错误: ${body.code} ${body.message}`,
			);
			break;
		}

		const { medias, has_more } = body.data;
		if (!medias || medias.length === 0) break;

		for (const media of medias) {
			if (media.type !== 2) continue;

			const aid = media.id;
			const bvid = media.bvid || media.bv_id;

			let cid = 0;
			try {
				const infoUrl = `${API_BASE}/x/web-interface/view?aid=${aid}`;
				const infoRes = await fetch(infoUrl, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Referer: "https://www.bilibili.com",
					},
				});
				if (infoRes.ok) {
					const infoBody = await infoRes.json();
					if (infoBody.code === 0 && infoBody.data) {
						cid = infoBody.data.cid || 0;
					}
				}
			} catch {
				// cid 获取失败时跳过 cid 字段
			}

			playlist.push({
				name: media.title || "未知标题",
				artist: media.upper?.name || "未知UP主",
				url: cid
					? `${config.bilibili.proxyBase || "/api/bilibili-proxy"}/audio?aid=${aid}&cid=${cid}`
					: "",
				pic: media.cover || "",
				bvid: bvid || "",
				aid: aid,
				cid: cid,
			});
		}

		hasMore = !!has_more;
		pn++;
	}

	// 过滤掉已失效或无 cid 的视频
	const validPlaylist = playlist.filter((item) => item.cid > 0 && item.url);
	if (validPlaylist.length === 0) {
		console.warn("⚠️  [bilibili] 未获取到任何有效视频");
		return;
	}

	if (validPlaylist.length < playlist.length) {
		console.log(
			`ℹ️  [bilibili] 已过滤 ${playlist.length - validPlaylist.length} 个失效条目`,
		);
	}

	const outDir = path.dirname(OUTPUT_PATH);
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(validPlaylist, null, 2), "utf-8");
	console.log(`✅ [bilibili] 已生成 ${validPlaylist.length} 条收藏 → ${OUTPUT_PATH}`);
}

main().catch((err) => {
	console.warn("⚠️  [bilibili] 脚本执行失败:", err.message);
});
