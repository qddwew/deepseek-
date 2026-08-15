// DeepSeek API 余额/用量监控插件 — Host 端
// 注册 /api/dsh/api-stats 路由：查询 DeepSeek 官方余额 API，并汇总本地 token 用量
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/** Stable Cordis plugin name. */
const name = "api-stats";

/** Services required before routes can be registered. */
const inject = ["webServer"];

/** Response helper: write JSON and end the response. */
function writeJson(res, status, payload) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(payload));
}

/** Resolve the harness home (DSH_HOME env or ~/.dsh). */
function dshHome() {
	return process.env.DSH_HOME ?? join(homedir(), ".dsh");
}

/** Read the DeepSeek API key from the credentials document. */
async function readApiKey() {
	const home = dshHome();
	try {
		const text = await readFile(join(home, ".credentials.yaml"), "utf8");
		const match = text.match(/DEEPSEEK_API_KEY\s*:\s*["']?([^"'\s]+)/);
		if (!match) return void 0;
		return match[1];
	} catch {
		return void 0;
	}
}

/** Query the official DeepSeek balance endpoint. */
async function fetchBalance(apiKey) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10000);
	try {
		const response = await fetch("https://api.deepseek.com/user/balance", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: "application/json"
			},
			signal: controller.signal
		});
		if (!response.ok) {
			return { error: `balance HTTP ${response.status}` };
		}
		const data = await response.json();
		const infos = Array.isArray(data.balance_infos) ? data.balance_infos : [];
		const cny = infos.find((info) => info.currency === "CNY") ?? infos[0];
		if (!cny) {
			return { error: "no balance info", raw: data };
		}
		return {
			currency: cny.currency,
			totalBalance: Number.parseFloat(cny.total_balance ?? "0"),
			grantedBalance: Number.parseFloat(cny.granted_balance ?? "0"),
			toppedUpBalance: Number.parseFloat(cny.topped_up_balance ?? "0"),
			available: data.is_available === true
		};
	} catch (error) {
		return { error: error?.name === "AbortError" ? "timeout" : String(error?.message ?? error) };
	} finally {
		clearTimeout(timer);
	}
}

/** Aggregate token usage from the session projection cache. */
async function aggregateUsage() {
	const home = dshHome();
	try {
		const text = await readFile(join(home, "storages", "session_projcache.json"), "utf8");
		const cache = JSON.parse(text);
		const sessions = cache?.tables?.sessions ?? {};
		let uncachedInputTokens = 0;
		let outputTokens = 0;
		let cacheReadTokens = 0;
		let cacheWriteTokens = 0;
		let sessionCount = 0;
		for (const key of Object.keys(sessions)) {
			const record = sessions[key];
			const totals = record?.rows?.tokenUsage?.val?.totals;
			if (!totals) continue;
			sessionCount += 1;
			uncachedInputTokens += totals.uncachedInputTokens ?? 0;
			outputTokens += totals.outputTokens ?? 0;
			cacheReadTokens += totals.cacheReadTokens ?? 0;
			cacheWriteTokens += totals.cacheWriteTokens ?? 0;
		}
		return {
			sessionCount,
			uncachedInputTokens,
			outputTokens,
			cacheReadTokens,
			cacheWriteTokens,
			totalTokens: uncachedInputTokens + outputTokens + cacheReadTokens + cacheWriteTokens
		};
	} catch (error) {
		return {
			error: String(error?.message ?? error),
			sessionCount: 0,
			uncachedInputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
			totalTokens: 0
		};
	}
}

/**
* Host plugin entry. Registers the stats route on the web server.
* @param ctx - the composed host context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/dsh/api-stats",
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				writeJson(res, 405, { error: "method not allowed" });
				return;
			}
			const apiKey = await readApiKey();
			const [balance, usage] = await Promise.all([
				apiKey === void 0 ? Promise.resolve({ error: "no api key" }) : fetchBalance(apiKey),
				aggregateUsage()
			]);
			writeJson(res, 200, {
				updatedAt: new Date().toISOString(),
				configured: apiKey !== void 0,
				balance,
				usage
			});
		}
	}), "api-stats: route");
}

export { apply, inject, name };
