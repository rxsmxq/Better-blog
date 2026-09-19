import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
		author: z.string().optional().default(""),
		sourceLink: z.string().optional().default(""),
		licenseName: z.string().optional().default(""),
		licenseUrl: z.string().optional().default(""),
		comment: z.boolean().optional().default(true),
		password: z.string().optional().default(""),
		passwordHint: z.string().optional().default(""),
		// 仅从公开机器知识入口排除，文章页面仍然保留。
		wikiExclude: z.boolean().optional().default(false),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/spec" }),
	schema: z.object({}),
});

// 说说 / 动态：正文即内容，通常没有标题
const momentsCollection = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/moments" }),
	schema: z.object({
		// 发布时间，支持 `2026-09-19` 或带引号的 `2026-09-19 17:30`
		date: z.date(),
		draft: z.boolean().optional().default(false),
		tags: z.array(z.string()).optional().default([]),
		// 图片地址数组：站内绝对路径（/assets/...）或完整外链
		images: z.array(z.string()).optional().default([]),
		location: z.string().optional().default(""),
		mood: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),
	}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
	moments: momentsCollection,
};
