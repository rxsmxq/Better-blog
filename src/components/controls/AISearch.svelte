<script lang="ts">
import { onMount, tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { aiSearchConfig } from "@/config";
import "@/styles/components/ai-search.css";

interface Message {
	role: "user" | "assistant";
	content: string;
	refs?: { title: string; path: string; published?: string; excerpt: string }[];
	streaming?: boolean;
}

interface SessionMeta {
	id: string;
	title: string;
	updatedAt: number;
}

const STORAGE_SESSIONS_KEY = "ai-chat:sessions";
const STORAGE_SESSION_PREFIX = "ai-chat:session:";
const STORAGE_VERSION = 1;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 20;

const SUGGESTIONS = ["博客的技术栈是什么？", "介绍一下自己"];
const FOLLOW_UP_SUGGESTIONS = ["说说最近的文章", "有什么推荐的项目？"];

let isOpen = $state(false);
let inputVal = $state("");
let messages = $state<Message[]>([]);
let isLoading = $state(false);
let messagesEl: HTMLDivElement;
let inputEl: HTMLTextAreaElement;
let abortCtrl: AbortController | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let sessionId = $state("");
let sessionList = $state<SessionMeta[]>([]);
let showSessionList = $state(false);
let scrollFrame: number | null = null;

interface StoredValue<T> {
	version: number;
	expiresAt: number;
	data: T;
}

const TEXTAREA_MIN_HEIGHT = 128;
const TEXTAREA_MAX_HEIGHT = 256;

function startResize(e: MouseEvent | TouchEvent) {
	e.preventDefault();
	const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
	const startHeight = inputEl.offsetHeight;

	function onMove(ev: MouseEvent | TouchEvent) {
		const currentY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
		// 往上拖 = 增高，往下拖 = 缩短
		const newHeight = Math.max(
			TEXTAREA_MIN_HEIGHT,
			Math.min(TEXTAREA_MAX_HEIGHT, startHeight - (currentY - startY)),
		);
		inputEl.style.height = `${newHeight}px`;
	}

	function onEnd() {
		document.removeEventListener("mousemove", onMove);
		document.removeEventListener("mouseup", onEnd);
		document.removeEventListener("touchmove", onMove);
		document.removeEventListener("touchend", onEnd);
	}

	document.addEventListener("mousemove", onMove);
	document.addEventListener("mouseup", onEnd);
	document.addEventListener("touchmove", onMove);
	document.addEventListener("touchend", onEnd);
}

function generateSessionId(): string {
	return `sess_${crypto.randomUUID()}`;
}

function getSessionTitle(msgs: Message[]): string {
	const firstUser = msgs.find((m) => m.role === "user");
	if (!firstUser) return "新对话";
	return firstUser.content.length > 20
		? `${firstUser.content.slice(0, 20)}...`
		: firstUser.content;
}

function loadSessionListFromStorage(): SessionMeta[] {
	const list = readStoredValue<SessionMeta[]>(STORAGE_SESSIONS_KEY);
	return Array.isArray(list)
		? list.filter(
				(item) =>
					item &&
					typeof item.id === "string" &&
					typeof item.title === "string" &&
					typeof item.updatedAt === "number",
			)
		: [];
}

function saveSessionListToStorage(list: SessionMeta[]) {
	writeStoredValue(STORAGE_SESSIONS_KEY, list);
}

function readStoredValue<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredValue<T>;
		if (
			parsed.version !== STORAGE_VERSION ||
			typeof parsed.expiresAt !== "number" ||
			parsed.expiresAt <= Date.now()
		) {
			localStorage.removeItem(key);
			return null;
		}
		return parsed.data;
	} catch {
		localStorage.removeItem(key);
		return null;
	}
}

function writeStoredValue<T>(key: string, data: T): void {
	try {
		const value: StoredValue<T> = {
			version: STORAGE_VERSION,
			expiresAt: Date.now() + SESSION_TTL_MS,
			data,
		};
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

function saveCurrentSession() {
	if (!sessionId || messages.length === 0) return;
	if (messages.some((m) => m.streaming)) return;
	try {
		writeStoredValue(STORAGE_SESSION_PREFIX + sessionId, messages);
		const existing = sessionList.find((s) => s.id === sessionId);
		if (existing) {
			existing.title = getSessionTitle(messages);
			existing.updatedAt = Date.now();
		} else {
			sessionList.unshift({
				id: sessionId,
				title: getSessionTitle(messages),
				updatedAt: Date.now(),
			});
		}
		if (sessionList.length > MAX_SESSIONS) {
			const removed = sessionList.splice(MAX_SESSIONS);
			for (const s of removed) {
				try {
					localStorage.removeItem(STORAGE_SESSION_PREFIX + s.id);
				} catch {}
			}
		}
		sessionList = [...sessionList];
		saveSessionListToStorage(sessionList);
	} catch {}
}

function loadSessionMessages(id: string): Message[] {
	const stored = readStoredValue<Message[]>(STORAGE_SESSION_PREFIX + id);
	return Array.isArray(stored)
		? stored.filter(
				(message) =>
					message &&
					(message.role === "user" || message.role === "assistant") &&
					typeof message.content === "string",
			)
		: [];
}

function deleteSession(id: string) {
	try {
		localStorage.removeItem(STORAGE_SESSION_PREFIX + id);
	} catch {}
	sessionList = sessionList.filter((s) => s.id !== id);
	saveSessionListToStorage(sessionList);
	if (id === sessionId) {
		sessionId = generateSessionId();
		messages = [];
		showSessionList = false;
		scrollToBottom();
	}
}

function startNewSession() {
	saveCurrentSession();
	sessionId = generateSessionId();
	messages = [];
	showSessionList = false;
}

function clearAllSessions() {
	stop();
	try {
		for (let index = localStorage.length - 1; index >= 0; index -= 1) {
			const key = localStorage.key(index);
			if (
				key === STORAGE_SESSIONS_KEY ||
				key?.startsWith(STORAGE_SESSION_PREFIX)
			) {
				localStorage.removeItem(key);
			}
		}
	} catch {}
	sessionList = [];
	sessionId = generateSessionId();
	messages = [];
	showSessionList = false;
}

function switchSession(id: string) {
	if (id === sessionId) {
		showSessionList = false;
		return;
	}
	saveCurrentSession();
	sessionId = id;
	messages = loadSessionMessages(id);
	showSessionList = false;
	scrollToBottom();
}

function formatTime(ts: number): string {
	const diff = Date.now() - ts;
	if (diff < 60000) return "刚刚";
	if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
	return `${Math.floor(diff / 86400000)} 天前`;
}

export function toggle() {
	isOpen = !isOpen;
	window.__aiSearchOpen = isOpen;
	if (isOpen) {
		tick().then(() => {
			inputEl?.focus();
		});
	}
}

function close() {
	isOpen = false;
	window.__aiSearchOpen = false;
}

function scrollToBottom() {
	tick().then(() => {
		if (!messagesEl || scrollFrame !== null) return;
		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = null;
			messagesEl.scrollTo({
				top: messagesEl.scrollHeight,
				left: 0,
				behavior: "auto",
			});
		});
	});
}

function isSafeUrl(value: string): boolean {
	return /^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/|\?)/i.test(value.trim());
}

function renderSimpleMd(text: string): string {
	let html = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

	html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
	html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
	html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, "<em>$1</em>");
	html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
		if (!isSafeUrl(url)) return `[${label}](${url})`;
		return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
	});
	html = html.replace(/\n/g, "<br>");

	return html;
}

async function send(text?: string) {
	const q = (text || inputVal).trim();
	if (!q || isLoading) return;

	const MAX_INPUT_LEN = 1000;
	if (q.length > MAX_INPUT_LEN) {
		messages = [
			...messages,
			{
				role: "assistant",
				content: `输入太长了喵，最多支持 ${MAX_INPUT_LEN} 个字符~`,
			},
		];
		scrollToBottom();
		return;
	}

	inputVal = "";
	messages = [...messages, { role: "user", content: q }];
	scrollToBottom();

	isLoading = true;
	abortCtrl = new AbortController();

	const aiIdx = messages.length;
	messages = [
		...messages,
		{ role: "assistant", content: "", streaming: true, refs: [] },
	];
	scrollToBottom();
	let pendingText = "";
	let pendingRefs: Message["refs"] | null = null;
	let flushTimer: ReturnType<typeof setTimeout> | null = null;
	const flushStreamUpdate = () => {
		if (flushTimer) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		if (!pendingText && !pendingRefs) return;
		if (pendingText) {
			messages[aiIdx].content += pendingText;
			pendingText = "";
		}
		if (pendingRefs) {
			messages[aiIdx].refs = pendingRefs;
			pendingRefs = null;
		}
		messages = [...messages];
		scrollToBottom();
	};
	const scheduleStreamUpdate = () => {
		if (!flushTimer) flushTimer = setTimeout(flushStreamUpdate, 80);
	};

	try {
		const history = messages
			.slice(0, -2)
			.slice(-6)
			.map((m) => ({ role: m.role, content: m.content }));
		const res = await fetch("/api/ai-chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ question: q, history, sessionId }),
			signal: abortCtrl.signal,
		});

		if (!res.ok) {
			let errMsg = `请求失败 (${res.status})`;
			try {
				const errBody = await res.json();
				if (errBody.error) errMsg = errBody.error;
			} catch {}
			throw new Error(errMsg);
		}

		reader = res.body?.getReader() ?? null;
		if (!reader) throw new Error("无法读取响应流");

		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const json = line.slice(6);
				try {
					const data: unknown = JSON.parse(json);
					if (!data || typeof data !== "object") continue;
					const type = Reflect.get(data, "type");

					if (type === "chunk") {
						const chunk = Reflect.get(data, "text");
						if (typeof chunk === "string") {
							pendingText += chunk;
							scheduleStreamUpdate();
						}
					} else if (type === "refs") {
						const refs = Reflect.get(data, "articles");
						if (Array.isArray(refs)) {
							pendingRefs = refs as Message["refs"];
							scheduleStreamUpdate();
						}
					} else if (type === "error") {
						const errorText = Reflect.get(data, "error");
						pendingText += `\n\n> 错误：${typeof errorText === "string" ? errorText : "响应中断"}`;
						flushStreamUpdate();
					} else if (type === "done") {
						flushStreamUpdate();
					}
				} catch {
					// 忽略解析错误
				}
			}
		}
		flushStreamUpdate();
	} catch (err: unknown) {
		const e = err instanceof Error ? err : new Error(String(err));
		if (e.name === "AbortError") {
			flushStreamUpdate();
			messages[aiIdx].content += "\n\n> *(已取消)*";
		} else {
			if (flushTimer) clearTimeout(flushTimer);
			flushTimer = null;
			pendingText = "";
			pendingRefs = null;
			console.error("AI chat error:", e);
			if (/429|insufficient_quota|quota/i.test(e.message)) {
				messages[aiIdx].content =
					"抱歉喵~喵墩今天收藏的 token 被爸爸偷偷用光了，请明天再来~";
			} else {
				messages[aiIdx].content = "抱歉，请求出错了，请稍后再试喵~";
			}
		}
		messages = [...messages];
	} finally {
		flushStreamUpdate();
		messages[aiIdx].streaming = false;
		messages = [...messages];
		isLoading = false;
		abortCtrl = null;
		reader = null;
		scrollToBottom();
		saveCurrentSession();
	}
}

function stop() {
	abortCtrl?.abort();
	reader?.cancel().catch(() => {});
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		send();
	}
	if (e.key === "Escape") {
		if (showSessionList) {
			showSessionList = false;
		} else {
			close();
		}
	}
}

onMount(() => {
	sessionList = loadSessionListFromStorage();
	if (sessionList.length > 0) {
		const latest = sessionList[0];
		sessionId = latest.id;
		messages = loadSessionMessages(latest.id);
	} else {
		sessionId = generateSessionId();
	}

	const toggleHandler = () => toggle();
	window.addEventListener("toggle-ai-search", toggleHandler);

	return () => {
		saveCurrentSession();
		window.removeEventListener("toggle-ai-search", toggleHandler);
		if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
	};
});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ai-overlay">
		<div class="ai-panel">
			<!-- 标题栏 -->
			<div class="ai-header">
				<div class="ai-header__left">
					<img
						src="/assets/images/aut.webp"
						alt="喵墩"
						class="ai-header__avatar"
					/>
					<span class="ai-header__name">喵墩</span>
					<span class="ai-header__model">{aiSearchConfig.modelName}</span>
				</div>
				<div class="ai-header__actions">
					{#if sessionList.length > 0}
						<button
							class="ai-icon-btn"
							class:ai-icon-btn--active={showSessionList}
							onclick={() => (showSessionList = !showSessionList)}
							title="历史会话"
						>
							<Icon icon="material-symbols:history" />
						</button>
					{/if}
					{#if sessionList.length > 0 || messages.length > 0}
						<button class="ai-icon-btn" onclick={clearAllSessions} title="清空全部会话">
							<Icon icon="material-symbols:delete-sweep-outline" />
						</button>
					{/if}
					<button class="ai-icon-btn" onclick={startNewSession} title="新建会话">
						<Icon icon="material-symbols:add-circle-outline" />
					</button>
					<button class="ai-icon-btn" onclick={close} title="关闭">
						<Icon icon="material-symbols:close" />
					</button>
				</div>
			</div>

			<!-- 历史会话列表 -->
			{#if showSessionList}
				<div class="ai-session-list">
					{#each sessionList as sess}
						<button
							class="ai-session-item"
							class:ai-session-item--active={sess.id === sessionId}
							onclick={() => switchSession(sess.id)}
						>
							<div class="ai-session-info">
								<span class="ai-session-title">{sess.title}</span>
								<span class="ai-session-time">{formatTime(sess.updatedAt)}</span>
							</div>
							<span
								class="ai-session-delete"
								onclick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
								title="删除会话"
							>
								<Icon icon="material-symbols:close" size="sm" />
							</span>
						</button>
					{/each}
					{#if sessionList.length === 0}
						<div class="ai-session-empty">暂无历史会话</div>
					{/if}
				</div>
			{/if}

			<!-- 消息列表 -->
			<div class="ai-messages" bind:this={messagesEl}>
				{#if messages.length === 0}
					<div class="ai-empty">
						<div class="ai-empty__icon-wrapper">
							<img
								src="/assets/images/aut.webp"
								alt="喵墩"
								class="ai-empty__avatar"
							/>
						</div>
						<h2 class="ai-empty__title">有什么想问的？</h2>
						<div class="ai-empty__suggestions-box">
							{#each SUGGESTIONS as suggestion}
								<button class="ai-empty__suggestion" onclick={() => send(suggestion)}>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#each messages as msg, i}
					<div
						class="ai-msg ai-msg--{msg.role}"
						class:ai-msg--turn-start={msg.role === "user" && i > 0}
					>
						{#if msg.role === "assistant"}
							<div class="ai-msg__avatar">
								<img src="/assets/images/aut.webp" alt="喵墩" class="ai-msg__avatar-img" />
							</div>
						{/if}
						<div class="ai-msg__body">
							<div class="ai-msg__content">
								{#if msg.role === "user"}
									<span class="ai-msg__text">{msg.content}</span>
									<span class="ai-msg__bubble"></span>
									<span class="ai-msg__bubble ai-msg__bubble--small"></span>
								{:else if msg.streaming && !msg.content.trim()}
									<svg class="ai-loader" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path class="ai-loader__line" d="m4.9 4.9 2.9 2.9" />
										<path class="ai-loader__line" d="M2 12h4" />
										<path class="ai-loader__line" d="m4.9 19.1 2.9-2.9" />
										<path class="ai-loader__line" d="M12 18v4" />
										<path class="ai-loader__line" d="m16.2 16.2 2.9 2.9" />
										<path class="ai-loader__line" d="M18 12h4" />
										<path class="ai-loader__line" d="m16.2 7.8 2.9-2.9" />
										<path class="ai-loader__line" d="M12 2v4" />
									</svg>
								{:else if msg.streaming}
									<span class="ai-msg__text ai-msg__text--streaming">{msg.content}</span>
									<span class="ai-cursor"></span>
								{:else}
									<span class="ai-msg__text">{@html renderSimpleMd(msg.content)}</span>
								{/if}
								{#if msg.role === "assistant" && msg.refs && msg.refs.length > 0}
									<div class="ai-refs">
										<div class="ai-refs__title">参考文章</div>
										{#each msg.refs as ref}
											<a href={isSafeUrl(ref.path) ? ref.path : '#'} class="ai-refs__link" onclick={() => (isOpen = false)}>
												<Icon icon="material-symbols:article-outline" size="sm" />
												<span>{ref.title}</span>
												{#if ref.published}
													<span class="ai-refs__date">{ref.published}</span>
												{/if}
											</a>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- 输入区域 -->
			<div class="ai-input-area">
				<div class="ai-input-area__box">
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="ai-input-area__resize-handle"
						onmousedown={startResize}
						ontouchstart={startResize}
						title="拖拽调整高度"
					>
						<span class="ai-input-area__resize-grip"></span>
					</div>
					{#if messages.length > 0 && !isLoading}
						<div class="ai-input-area__tags">
							{#each FOLLOW_UP_SUGGESTIONS as suggestion}
								<button
									class="ai-input-area__tag"
									type="button"
									disabled={isLoading}
									onclick={() => send(suggestion)}
								>
									{suggestion}
								</button>
							{/each}
						</div>
					{/if}
					<label class="ai-input-area__label" for="ai-chat-input">Ask</label>
					<div class="ai-input-area__textarea-wrapper">
						<textarea
							id="ai-chat-input"
							bind:this={inputEl}
							bind:value={inputVal}
							onkeydown={handleKeydown}
							placeholder="输入你的问题..."
							disabled={isLoading}
							class="ai-input-area__textarea"
							rows="5"
							aria-label="AI 搜索问题"
						></textarea>
						{#if isLoading}
							<button
								type="button"
								class="ai-input-area__submit ai-input-area__submit--stop"
								onclick={stop}
								title="停止生成"
								aria-label="停止生成"
							>
								<Icon icon="material-symbols:stop-circle-outline" size="lg" />
							</button>
						{:else}
							<button
								type="button"
								class="ai-input-area__submit"
								onclick={() => send()}
								disabled={!inputVal.trim()}
								title="发送"
								aria-label="发送"
							>
								<Icon icon="material-symbols:arrow-outward-rounded" size="lg" />
							</button>
						{/if}
					</div>
					<p class="ai-input-area__privacy">
						问题和最近 6 条对话会发送至 ModelScope 或 Cloudflare Workers AI；请勿提交密码、Token 或个人敏感信息。本机会话保存 7 天。
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}
