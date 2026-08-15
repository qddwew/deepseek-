window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-api-stats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		/** Services required by this plugin. */
		const inject = ["slots"];

		/**
		* 圆环尺寸与设置按钮一致：
		* 展开态设置按钮为 34px 高胶囊，收起态为 36px 圆形。
		*/
		const RING_SIZE_WIDE = 34;
		const RING_SIZE_RAIL = 36;
		/** Arc stroke width in px. */
		const RING_STROKE = 3.5;
		/**
		* 圆环满环基准：动态取"配置 API 后查询到的余额"（总额度），
		* 持久化到 localStorage。弧长 = min(1, 当前余额/基准)。
		*/
		const FULL_BALANCE_KEY = "dsh.api-stats.fullBalance";
		/** 悬停卡片离圆环的间距。 */
		const CARD_GAP = 8;
		/** DeepSeek 开放平台充值页（点击圆环跳转）。 */
		const TOPUP_URL = "https://platform.deepseek.com/top_up";
		/** 离开后延迟隐藏，允许鼠标从圆环移向卡片。 */
		const HIDE_DELAY_MS = 200;

		/** 注入插件级样式（一次性）。 */
		const CSS_TAG_ID = "@deepseek-ai/dsh-client-api-stats/style.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-api-stats";
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = [
				".dsh-api-stats-card{position:fixed;z-index:2147483000;box-sizing:border-box;min-width:200px;max-width:280px;padding:10px 12px;border-radius:12px;background:var(--dsw-alias-bg-layer-2,#1f2430);color:var(--dsw-alias-label-primary,#e8eaf0);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,0.25));box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,0.35));font-size:12px;line-height:18px;pointer-events:auto}",
				".dsh-api-stats-card .dsh-api-stats-title{font-size:12px;font-weight:600;margin-bottom:6px;color:var(--dsw-alias-label-primary,#e8eaf0)}",
				".dsh-api-stats-card .dsh-api-stats-row{display:flex;justify-content:space-between;gap:16px}",
				".dsh-api-stats-card .dsh-api-stats-row b{font-weight:600;color:var(--dsw-alias-label-primary,#e8eaf0)}",
				".dsh-api-stats-card .dsh-api-stats-row span{color:var(--dsw-alias-label-secondary,#9aa1b0)}",
				".dsh-api-stats-card .dsh-api-stats-sep{height:1px;margin:6px 0;background:var(--dsw-alias-border-l2,rgba(127,127,127,0.18))}",
				".dsh-api-stats-card .dsh-api-stats-sub{color:var(--dsw-alias-label-secondary,#9aa1b0);font-size:11px;margin-top:6px;white-space:normal}"
			].join("");
			document.head.appendChild(tag);
		}

		/**
		* 紧凑余额圆环：弧长按余额比例绘制，与设置按钮同尺寸，中央显示剩余余额。
		* @param props.ratio - 进度 0..1。
		* @param props.color - 进度弧颜色。
		* @param props.size - 圆环直径。
		* @param props.label - 中央文字（剩余余额），为空则不显示。
		*/
		function BalanceRing({ ratio, color, size, label }) {
			const stroke = RING_STROKE;
			const r = (size - stroke) / 2;
			const c = 2 * Math.PI * r;
			const clamped = Math.max(0, Math.min(1, ratio));
			const offset = c * (1 - clamped);
			return react.createElement("span", {
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: size,
					height: size,
					borderRadius: "50%",
					cursor: "default",
					flex: "none"
				}
			},
				react.createElement("svg", {
					width: size,
					height: size,
					viewBox: `0 0 ${size} ${size}`,
					"aria-hidden": true
				},
					react.createElement("circle", {
						cx: size / 2,
						cy: size / 2,
						r,
						fill: "none",
						stroke: "rgba(127,127,127,0.22)",
						strokeWidth: stroke
					}),
					react.createElement("circle", {
						cx: size / 2,
						cy: size / 2,
						r,
						fill: "none",
						stroke: color,
						strokeWidth: stroke,
						strokeLinecap: "round",
						strokeDasharray: c,
						strokeDashoffset: offset,
						transform: `rotate(-90 ${size / 2} ${size / 2})`,
						style: { transition: "stroke-dashoffset 0.4s ease" }
					}),
					typeof label === "string" && label.length > 0 && react.createElement("text", {
						x: size / 2,
						y: size / 2 + 0.5,
						textAnchor: "middle",
						dominantBaseline: "central",
						fontSize: Math.max(6, size * 0.21),
						fontWeight: 600,
						fill: "var(--dsw-alias-label-primary, #e8eaf0)",
						style: { fontFamily: "inherit", userSelect: "none" }
					}, label)
				)
			);
		}

		/** 千分位格式化。 */
		function formatNumber(n) {
			return Number(n ?? 0).toLocaleString("en-US");
		}

		/** 金额格式化（¥ + 两位小数）。 */
		function formatBalance(n) {
			return `¥${Number(n ?? 0).toFixed(2)}`;
		}

		/** 圆环中央紧凑余额：金额大时取整/一位小数，避免溢出小圆环。 */
		function compactBalance(n) {
			const value = Number(n ?? 0);
			if (value >= 1000) return `¥${Math.round(value)}`;
			if (value >= 100) return `¥${value.toFixed(0)}`;
			if (value >= 10) return `¥${value.toFixed(1)}`;
			return `¥${value.toFixed(2)}`;
		}

		/** 时间格式化 HH:MM:SS。 */
		function formatTime(iso) {
			if (!iso) return "—";
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return "—";
			return d.toLocaleTimeString("zh-CN", { hour12: false });
		}

		/** 按余额水平取圆环颜色。 */
		function balanceColor(total) {
			if (total <= 1) return "#d5484f"; // ≤¥1：红
			if (total <= 5) return "#e0a13c"; // ≤¥5：橙
			return "#4d8df6"; // 充足：蓝
		}

		/**
		* 悬停明细卡片：余额 + token 用量。始终挂载以便测量尺寸，
		* 定位前以 visibility:hidden 隐藏。
		* @param props.payload - /api/dsh/api-stats 的响应。
		* @param props.anchor - 圆环锚点元素。
		* @param props.onEnter / props.onLeave - 与圆环共享的悬停状态。
		*/
		function HoverCard({ payload, anchor, onEnter, onLeave }) {
			const [pos, setPos] = react.useState(null);
			const cardRef = react.useRef(null);
			react.useLayoutEffect(() => {
				if (!anchor) return;
				const rect = anchor.getBoundingClientRect();
				const width = cardRef.current?.offsetWidth ?? 220;
				const height = cardRef.current?.offsetHeight ?? 190;
				let left = rect.right + CARD_GAP;
				if (left + width > window.innerWidth - 8) left = Math.max(8, rect.left - width - CARD_GAP);
				left = Math.max(8, left);
				let top = rect.top + rect.height / 2 - height / 2;
				top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
				setPos({ left, top });
			}, [anchor]);
			const { balance, usage, updatedAt } = payload;
			const rows = [];
			if (balance && typeof balance === "object" && !balance.error) {
				rows.push(react.createElement("div", { key: "total", className: "dsh-api-stats-row" },
					react.createElement("span", null, "账户余额"),
					react.createElement("b", null, formatBalance(balance.totalBalance))
				));
				rows.push(react.createElement("div", { key: "granted", className: "dsh-api-stats-row" },
					react.createElement("span", null, "赠送余额"),
					react.createElement("span", null, formatBalance(balance.grantedBalance))
				));
				rows.push(react.createElement("div", { key: "topped", className: "dsh-api-stats-row" },
					react.createElement("span", null, "充值余额"),
					react.createElement("span", null, formatBalance(balance.toppedUpBalance))
				));
				rows.push(react.createElement("div", { key: "available", className: "dsh-api-stats-row" },
					react.createElement("span", null, "可用状态"),
					react.createElement("b", { style: { color: balance.available ? "#3fb950" : "#d5484f" } }, balance.available ? "可用" : "不可用")
				));
				rows.push(react.createElement("div", { key: "sep1", className: "dsh-api-stats-sep" }));
			} else if (balance?.error === "no api key") {
				rows.push(react.createElement("div", { key: "hint", className: "dsh-api-stats-sub" }, "尚未在 DSH 中配置 DeepSeek API 密钥，配置后自动开始跟踪余额。"));
			} else if (balance?.error) {
				rows.push(react.createElement("div", { key: "err", className: "dsh-api-stats-sub", style: { color: "#d5484f" } }, `余额查询失败：${String(balance.error)}`));
			}
			if (usage && typeof usage === "object" && !usage.error) {
				rows.push(react.createElement("div", { key: "usage-title", className: "dsh-api-stats-title", style: { marginTop: rows.length ? 8 : 0 } }, "Token 用量（累计）"));
				rows.push(react.createElement("div", { key: "u-total", className: "dsh-api-stats-row" },
					react.createElement("span", null, "总 token"),
					react.createElement("b", null, formatNumber(usage.totalTokens))
				));
				rows.push(react.createElement("div", { key: "u-in", className: "dsh-api-stats-row" },
					react.createElement("span", null, "输入（未缓存）"),
					react.createElement("span", null, formatNumber(usage.uncachedInputTokens))
				));
				rows.push(react.createElement("div", { key: "u-out", className: "dsh-api-stats-row" },
					react.createElement("span", null, "输出"),
					react.createElement("span", null, formatNumber(usage.outputTokens))
				));
				rows.push(react.createElement("div", { key: "u-cr", className: "dsh-api-stats-row" },
					react.createElement("span", null, "缓存读取"),
					react.createElement("span", null, formatNumber(usage.cacheReadTokens))
				));
				rows.push(react.createElement("div", { key: "u-cw", className: "dsh-api-stats-row" },
					react.createElement("span", null, "缓存写入"),
					react.createElement("span", null, formatNumber(usage.cacheWriteTokens))
				));
				rows.push(react.createElement("div", { key: "u-s", className: "dsh-api-stats-row" },
					react.createElement("span", null, "会话数"),
					react.createElement("span", null, String(usage.sessionCount ?? 0))
				));
			}
			rows.push(react.createElement("div", { key: "updated", className: "dsh-api-stats-sub" }, `更新于 ${formatTime(updatedAt)}`));
			// 充值入口：点击跳转 DeepSeek 开放平台充值页
			rows.push(react.createElement("a", {
				key: "topup",
				href: TOPUP_URL,
				target: "_blank",
				rel: "noopener noreferrer",
				style: {
					display: "block",
					textAlign: "center",
					marginTop: 8,
					padding: "4px 0",
					borderRadius: 8,
					background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12))",
					color: "#4d8df6",
					fontSize: 12,
					fontWeight: 600,
					textDecoration: "none",
					cursor: "pointer"
				},
				onMouseEnter: onEnter,
				onMouseLeave: onLeave
			}, "去充值 →"));
			return react.createElement("div", {
				ref: cardRef,
				className: "dsh-api-stats-card",
				style: { left: pos?.left ?? -10000, top: pos?.top ?? -10000, visibility: pos === null ? "hidden" : "visible" },
				onMouseEnter: onEnter,
				onMouseLeave: onLeave
			},
				react.createElement("div", { className: "dsh-api-stats-title" }, "DeepSeek API 余额"),
				...rows
			);
		}

		/** 读取持久化的满环基准（总额度）。 */
		function readFullBalance() {
			try {
				const raw = globalThis.localStorage?.getItem(FULL_BALANCE_KEY);
				const value = Number.parseFloat(raw ?? "");
				return Number.isFinite(value) && value > 0 ? value : 0;
			} catch {
				return 0;
			}
		}

		/** 写入满环基准。 */
		function writeFullBalance(value) {
			try {
				globalThis.localStorage?.setItem(FULL_BALANCE_KEY, String(value));
			} catch {
				/* 无痕模式等场景静默失败 */
			}
		}

		/**
		* api-stats 挂件：设置按钮上方的余额圆环，定时实时刷新。
		* 悬停才展示具体余额与 token 用量明细。
		* @param props.wide - 侧边栏是否展开。
		*/
		function ApiStatsWidget({ wide }) {
			const [state, setState] = react.useState({ status: "loading" });
			const [hovered, setHovered] = react.useState(false);
			const [fullBalance, setFullBalance] = react.useState(() => readFullBalance());
			const anchorRef = react.useRef(null);
			const hideTimer = react.useRef(null);
			const show = () => {
				if (hideTimer.current !== null) {
					clearTimeout(hideTimer.current);
					hideTimer.current = null;
				}
				setHovered(true);
			};
			const scheduleHide = () => {
				if (hideTimer.current !== null) clearTimeout(hideTimer.current);
				hideTimer.current = setTimeout(() => {
					hideTimer.current = null;
					setHovered(false);
				}, HIDE_DELAY_MS);
			};
			react.useEffect(() => () => {
				if (hideTimer.current !== null) clearTimeout(hideTimer.current);
			}, []);
			const load = react.useCallback(() => {
				globalThis.fetch("/api/dsh/api-stats", { cache: "no-store" })
					.then((response) => {
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						return response.json();
					})
					.then((data) => {
						// 配置 API 后查询到的余额即视为"总额度"（满环基准）。
						// 取历史最大值：余额只会随使用下降，充值到账后基准自动抬升重新满环。
						const total = data?.balance?.totalBalance;
						if (typeof total === "number" && Number.isFinite(total) && total > 0) {
							setFullBalance((previous) => {
								const next = Math.max(previous, total);
								if (next !== previous) writeFullBalance(next);
								return next;
							});
						}
						setState({ status: "ready", data });
					})
					.catch((error) => {
						setState({ status: "error", error: String(error?.message ?? error) });
					});
			}, []);
			react.useEffect(() => {
				load();
				// 实时跟踪：30s 轮询 + 窗口重新可见/聚焦时立即刷新
				const timer = setInterval(load, 30000);
				const refresh = () => {
					if (document.visibilityState === "visible") load();
				};
				const onFocus = () => load();
				document.addEventListener("visibilitychange", refresh);
				window.addEventListener("focus", onFocus);
				return () => {
					clearInterval(timer);
					document.removeEventListener("visibilitychange", refresh);
					window.removeEventListener("focus", onFocus);
				};
			}, [load]);
			const size = wide ? RING_SIZE_WIDE : RING_SIZE_RAIL;
			let ring;
			if (state.status === "loading") {
				ring = react.createElement(BalanceRing, { ratio: 0, color: "rgba(127,127,127,0.35)", size, label: "…" });
			} else if (state.status === "error") {
				ring = react.createElement(BalanceRing, { ratio: 0, color: "#d5484f", size, label: "!" });
			} else {
				const { balance, configured } = state.data;
				const total = balance?.totalBalance ?? 0;
				if (!configured || balance?.error === "no api key") {
					ring = react.createElement(BalanceRing, { ratio: 0, color: "rgba(127,127,127,0.5)", size, label: "—" });
				} else if (balance?.error) {
					ring = react.createElement(BalanceRing, { ratio: 0, color: "#d5484f", size, label: "!" });
				} else {
					// 圆环弧长按余额占"总额度"（历史最高余额）的比例推进：余额消耗环变空，充值后环回满
					const ratio = total > 0 && fullBalance > 0 ? Math.min(1, total / fullBalance) : 0;
					ring = react.createElement(BalanceRing, { ratio, color: balanceColor(total), size, label: compactBalance(total) });
				}
			}
			return react.createElement("div", {
				ref: anchorRef,
				// 展开态：与设置按钮左对齐（设置胶囊 margin-left:-4px + padding-left:10px，图标左缘≈6px）
				style: wide ? { display: "flex", justifyContent: "flex-start", width: "100%", padding: "2px 0 2px 6px" } : { display: "flex", justifyContent: "center" },
				onMouseEnter: show,
				onMouseLeave: scheduleHide
			},
				// 点击圆环跳转 DeepSeek 充值页
				react.createElement("button", {
					type: "button",
					title: "点击前往 DeepSeek 平台充值",
					"aria-label": "DeepSeek API 余额，点击前往充值",
					onClick: () => {
						window.open(TOPUP_URL, "_blank", "noopener,noreferrer");
					},
					style: {
						background: "none",
						border: "none",
						padding: 0,
						margin: 0,
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: "50%",
						flex: "none"
					}
				}, ring),
				hovered && state.status === "ready" && react.createElement(HoverCard, {
					payload: state.data,
					anchor: anchorRef.current,
					onEnter: show,
					onLeave: scheduleHide
				})
			);
		}

		/**
		* 注册到侧边栏 footer 操作区（设置按钮上方）。
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			ctx.effect(() => slots.inject("sidebar.footer.action", () => slots.register({
				name: "sidebar.footer.action",
				id: "api-stats",
				order: 50,
				label: "API 余额与用量"
			}, (props) => react.createElement(ApiStatsWidget, props))), "api-stats: slot");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
