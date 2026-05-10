<script lang="ts">
import { postGuestbookMessage } from "@/utils/guestbook-api";

let modalOpen = $state(false);
let author = $state("");
let content = $state("");
let isSubmitting = $state(false);

function openModal() {
	modalOpen = true;
}

function closeModal() {
	modalOpen = false;
}

async function handleSubmit() {
	if (!author.trim() || !content.trim()) return;
	isSubmitting = true;
	try {
		const message = await postGuestbookMessage(author.trim(), content.trim());
		// 通知卡片堆叠组件添加新消息
		window.dispatchEvent(new CustomEvent("guestbooknew", { detail: message }));
		author = "";
		content = "";
		closeModal();
	} catch (err) {
		console.error("Failed to post message:", err);
	} finally {
		isSubmitting = false;
	}
}

function handleOverlayClick(e: MouseEvent) {
	if ((e.target as HTMLElement).classList.contains("compose-overlay")) {
		closeModal();
	}
}

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === "Escape" && modalOpen) {
		closeModal();
	}
}
</script>

<svelte:window onkeydown={handleKeyDown} />

<button class="compose-btn" onclick={openModal}>
	<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
	发表留言
</button>

{#if modalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="compose-overlay" onclick={handleOverlayClick}>
		<div class="compose-modal" role="dialog" aria-label="发表留言" onclick={(e) => e.stopPropagation()}>
			<!-- 角标装饰 -->
			<div class="corner-mark top-left"></div>
			<div class="corner-mark top-right"></div>
			<div class="corner-mark bottom-left"></div>
			<div class="corner-mark bottom-right"></div>

			<!-- 头部 -->
			<div class="compose-header">
				<div class="header-bg"></div>
				<div class="header-content">
					<div class="author-info">
						<div class="author-avatar"></div>
						<span class="header-title">NEW MESSAGE</span>
					</div>
					<span class="header-tag">COMPOSE</span>
				</div>
			</div>

			<!-- 表单主体 -->
			<div class="compose-body">
				<div class="body-line"></div>
				<div class="body-content">
					<div class="source-tag">
						<span>SOURCE :: Guestbook</span>
					</div>
					<h3 class="form-title">发表留言</h3>
					<div class="title-underline"></div>

					<div class="form-fields">
						<div class="field-group">
							<label class="field-label" for="gb-author">
								<span class="label-marker">01</span>
								昵称 / ALIAS
							</label>
							<input
								id="gb-author"
								type="text"
								class="field-input"
								placeholder="输入你的昵称..."
								bind:value={author}
								maxlength={30}
							/>
						</div>

						<div class="field-group">
							<label class="field-label" for="gb-content">
								<span class="label-marker">02</span>
								留言内容 / CONTENT
							</label>
							<textarea
								id="gb-content"
								class="field-textarea"
								placeholder="写下你想说的话..."
								rows="5"
								bind:value={content}
								maxlength={500}
							></textarea>
							<div class="char-count">{content.length}/500</div>
						</div>
					</div>
				</div>
			</div>

			<!-- 底部操作 -->
			<div class="compose-footer">
				<div class="footer-bars">
					<div class="bar"></div>
					<div class="bar"></div>
					<div class="bar"></div>
					<div class="bar"></div>
					<div class="bar"></div>
				</div>
				<div class="footer-actions">
					<button class="btn-cancel" onclick={closeModal}>
						ESC 取消
					</button>
					<button
						class="btn-submit"
						onclick={handleSubmit}
						disabled={!author.trim() || !content.trim() || isSubmitting}
					>
						{isSubmitting ? "发送中..." : "发送留言 >>"}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.compose-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		background: var(--primary, #18181b);
		color: #fff;
		border: none;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s, transform 0.15s;
	}

	:root.dark .compose-btn {
		color: rgba(0, 0, 0, 0.7);
	}

	.compose-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.compose-btn:active {
		transform: translateY(0);
	}

	/* 弹窗遮罩 */
	.compose-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
		animation: fadeIn 0.2s ease;
	}

	:root.dark .compose-overlay {
		background: rgba(0, 0, 0, 0.75);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* 弹窗主体 */
	.compose-modal {
		position: relative;
		width: 90%;
		max-width: 520px;
		background: #ffffff;
		border: 2px solid #18181b;
		border-radius: 0.5rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		animation: modalIn 0.25s cubic-bezier(0.22, 0.68, 0.25, 1);
	}

	:root.dark .compose-modal {
		background: #18181b;
		border-color: #52525b;
	}

	@keyframes modalIn {
		from {
			opacity: 0;
			transform: scale(0.92) translateY(12px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* 角标 */
	.corner-mark {
		position: absolute;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		border: 1px solid #18181b;
		background: #f4f4f5;
		z-index: 20;
	}

	:root.dark .corner-mark {
		border-color: #52525b;
		background: #27272a;
	}

	.corner-mark::after {
		content: "";
		position: absolute;
		inset: 0;
		margin: auto;
		width: 60%;
		height: 1px;
		background: #18181b;
		transform: rotate(45deg);
	}

	:root.dark .corner-mark::after {
		background: #52525b;
	}

	.corner-mark.top-left { top: 0.5rem; left: 0.5rem; }
	.corner-mark.top-right { top: 0.5rem; right: 0.5rem; }
	.corner-mark.bottom-left { bottom: 0.5rem; left: 0.5rem; }
	.corner-mark.bottom-right { bottom: 0.5rem; right: 0.5rem; }

	/* 头部 */
	.compose-header {
		position: relative;
		height: 3.5rem;
		border-bottom: 2px solid #18181b;
		padding: 0 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		overflow: hidden;
	}

	:root.dark .compose-header {
		border-color: #52525b;
	}

	.header-bg {
		position: absolute;
		inset: 0;
		opacity: 0.06;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 5px,
			#18181b 5px,
			#18181b 10px
		);
	}

	:root.dark .header-bg {
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 5px,
			#fafafa 5px,
			#fafafa 10px
		);
	}

	.header-content {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.author-avatar {
		width: 0.75rem;
		height: 0.75rem;
		background: #18181b;
		border-radius: 0.125rem;
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	:root.dark .author-avatar {
		background: #fafafa;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.header-title {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #18181b;
	}

	:root.dark .header-title {
		color: #fafafa;
	}

	.header-tag {
		font-size: 0.6rem;
		font-family: ui-monospace, monospace;
		opacity: 0.6;
		color: #52525b;
		letter-spacing: 0.1em;
	}

	:root.dark .header-tag {
		color: #a1a1aa;
	}

	/* 表单主体 */
	.compose-body {
		position: relative;
		padding: 1.5rem;
		display: flex;
		overflow: hidden;
	}

	.body-line {
		position: absolute;
		left: 1rem;
		top: 1.5rem;
		bottom: 1.5rem;
		width: 1px;
		background: #d4d4d8;
	}

	:root.dark .body-line {
		background: #27272a;
	}

	.body-content {
		padding-left: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.source-tag {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		border: 1px solid #06b6d4;
		color: #06b6d4;
		width: fit-content;
		margin-bottom: 0.75rem;
	}

	.form-title {
		font-size: 1.125rem;
		font-weight: 700;
		line-height: 1.3;
		margin-bottom: 0.75rem;
		color: #18181b;
		text-transform: uppercase;
		letter-spacing: -0.02em;
	}

	:root.dark .form-title {
		color: #fafafa;
	}

	.title-underline {
		width: 3rem;
		height: 1px;
		background: #18181b;
		margin-bottom: 1.25rem;
	}

	:root.dark .title-underline {
		background: #fafafa;
	}

	/* 表单字段 */
	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #52525b;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:root.dark .field-label {
		color: #a1a1aa;
	}

	.label-marker {
		font-family: ui-monospace, monospace;
		font-size: 0.6rem;
		color: #06b6d4;
		opacity: 0.8;
	}

	.field-input,
	.field-textarea {
		width: 100%;
		background: transparent;
		border: 1px solid #d4d4d8;
		border-radius: 0.25rem;
		padding: 0.625rem 0.75rem;
		font-size: 0.85rem;
		font-family: ui-monospace, monospace;
		color: #18181b;
		outline: none;
		transition: border-color 0.2s;
		resize: none;
	}

	:root.dark .field-input,
	:root.dark .field-textarea {
		border-color: #27272a;
		color: #fafafa;
	}

	.field-input:focus,
	.field-textarea:focus {
		border-color: #06b6d4;
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: #52525b;
		opacity: 0.5;
	}

	:root.dark .field-input::placeholder,
	:root.dark .field-textarea::placeholder {
		color: #a1a1aa;
	}

	.char-count {
		font-size: 0.6rem;
		font-family: ui-monospace, monospace;
		color: #52525b;
		opacity: 0.6;
		text-align: right;
	}

	:root.dark .char-count {
		color: #a1a1aa;
	}

	/* 底部 */
	.compose-footer {
		height: 2.5rem;
		border-top: 2px solid #18181b;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		background: #18181b;
	}

	:root.dark .compose-footer {
		border-color: #52525b;
		background: #fafafa;
	}

	.footer-bars {
		display: flex;
		gap: 0.25rem;
	}

	.bar {
		width: 0.25rem;
		height: 1rem;
		background: #ffffff;
		opacity: 0.4;
	}

	:root.dark .bar {
		background: #000000;
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-cancel,
	.btn-submit {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: opacity 0.2s, filter 0.2s;
		background: transparent;
	}

	.btn-cancel {
		color: #ffffff;
		opacity: 0.5;
	}

	:root.dark .btn-cancel {
		color: #000000;
	}

	.btn-cancel:hover {
		opacity: 0.8;
	}

	.btn-submit {
		color: #06b6d4;
		font-family: ui-monospace, monospace;
	}

	.btn-submit:hover:not(:disabled) {
		filter: brightness(1.2);
	}

	.btn-submit:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* 响应式 */
	@media (max-width: 640px) {
		.compose-modal {
			max-width: 100%;
			width: 95%;
		}

		.compose-body {
			padding: 1.25rem;
		}

		.compose-header {
			padding: 0 1.25rem;
		}
	}
</style>
