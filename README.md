# DeepSeek API 余额监控圆环插件 (dsh-client-api-stats)

一个用于 **DeepSeek Harness (DSH)** Web 界面的客户端插件：在侧边栏**设置按钮上方**显示一个与设置按钮同尺寸的**余额圆环**，圆环中央实时显示剩余余额，进度弧随余额消耗/充值动态变化；**鼠标悬停**时才展开详情卡片，展示余额明细与 token 用量。

## 功能

- 🎯 余额圆环：与设置按钮同尺寸、同位置（设置按钮正上方），展开/收起侧边栏均对齐
- 💰 圆环中央显示剩余余额（紧凑格式，小额两位小数、大额取整）
- 🔄 进度弧动态推进：满环基准 = 配置 API 后查询到的余额（总额度），余额消耗弧变短、充值后回满，自动持久化
- 🖱️ 悬停显示详情：账户余额 / 赠送余额 / 充值余额 / 可用状态 + 累计 token 用量（输入/输出/缓存读写/会话数）+ 更新时间
- ⏱️ 实时跟踪：30 秒自动轮询 + 窗口重新可见/聚焦时立即刷新，无需手动操作
- 🚦 状态色：余额 ≤¥1 红、≤¥5 橙、充足蓝；未配置密钥 / 加载中 / 出错均有对应占位

## 前置要求

- 已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` CLI，`dsh web` 可正常启动）
- Node.js ≥ 20（DSH 自身要求的版本即可）

---

## 安装

### 方式一：一键脚本（推荐）

在插件源码根目录执行安装脚本（脚本会**自动检测 DSH 主目录**并完成复制 + 注册）：

**Windows（PowerShell）：**
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**Windows（命令提示符）：**
```bat
install.bat
```

**macOS / Linux：**
```bash
chmod +x install.sh && ./install.sh
```

脚本会自动：
1. 定位 DSH 主目录（`$DSH_HOME` 环境变量 > 默认 `~/.dsh`）；
2. 将插件复制到 `profiles/node_modules/@deepseek-ai/dsh-client-api-stats`；
3. 在 `profiles/web/cordis.patch.yml` 中注册插件条目（已存在则跳过）。

### 方式二：手动复制

1. 把整个 `dsh-client-api-stats` 目录复制到 DSH 主目录的插件目录：

   ```
   <DSH_HOME>/profiles/node_modules/@deepseek-ai/dsh-client-api-stats/
   ```
   （Windows 默认 `<DSH_HOME>` 为 `C:\Users\你的用户名\.dsh`；可用 `dsh plugin --profile web ...` 定位，或查看 `$DSH_HOME` 环境变量）

2. 打开 `<DSH_HOME>/profiles/web/cordis.patch.yml`，在文件末尾追加：

   ```yaml
   # DeepSeek API 余额与用量监控圆环插件（设置按钮上方）
   - insert:
       - id: api-stats
         name: '@deepseek-ai/dsh-client-api-stats'
   ```

### 方式三：git 依赖安装（需 pnpm）

```bash
dsh plugin --profile web add <git-url>
```
> 注意：该方式通过 pnpm 拉取，需要 pnpm 已安装；`dsh plugin` 只负责把包装进 profile 依赖，**仍需要**按方式二第 2 步在 `cordis.patch.yml` 中注册插件条目（git 托管的 prepare 脚本若被 pnpm 拦截，需按提示在 `pnpm-workspace.yaml` 的 `allowBuilds` 中放行）。

### 完成安装

- 重启 DSH Web 服务（关闭后重新运行 `dsh web`），或直接刷新浏览器页面
- 首次加载时插件自动生效：侧边栏设置按钮上方出现圆环

---

## 配置 API 密钥

插件通过 DSH 主目录下的 `.credentials.yaml` 读取 DeepSeek API 密钥，无需单独配置：

```yaml
# <DSH_HOME>/.credentials.yaml
DEEPSEEK_API_KEY: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

配置好密钥并刷新页面后，圆环即开始实时显示余额（未配置时圆环显示灰色 `—`，悬停有提示）。

---

## 使用说明

| 状态 | 圆环 | 说明 |
| --- | --- | --- |
| 未配置密钥 | 灰色空环 `—` | 悬停提示"尚未配置 DeepSeek API 密钥" |
| 加载中 | 灰色 `…` | 首次请求 |
| 出错 | 红色 `!` | 余额接口不可用 |
| 正常 | 彩色弧 + 余额 | 弧长 = 当前余额 / 总额度，颜色按余额档位 |

- **悬停圆环**：显示余额明细 + token 用量卡片；移开即隐藏
- **余额消耗**：进度弧按比例变短；**充值到账**：基准自动抬升、弧回满

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1    # Windows
./uninstall.sh                                              # macOS / Linux
```
或手动：删除 `<DSH_HOME>/profiles/node_modules/@deepseek-ai/dsh-client-api-stats`，并从 `cordis.patch.yml` 移除对应条目。

---

## 常见问题

**Q：刷新后看不到圆环？**
检查 `<DSH_HOME>/profiles/web/cordis.patch.yml` 是否已含 `api-stats` 条目；确认插件目录存在于 `profiles/node_modules/@deepseek-ai/dsh-client-api-stats`（文件名/目录名不能改）。

**Q：圆环显示 `—` / 灰色？**
说明未检测到 API 密钥，请确认 `<DSH_HOME>/.credentials.yaml` 中存在 `DEEPSEEK_API_KEY`，然后刷新页面。

**Q：余额不实时更新？**
插件每 30 秒自动轮询，窗口聚焦/重新可见也会立即刷新；请确认 DSH Web 服务未休眠。

**Q：圆环位置/大小不对？**
插件固定注册在"设置按钮上方"插槽，展开态 34px（与设置胶囊同高）、收起态 36px（与设置圆形按钮同径）。若与设置按钮错位，请确认 DSH 版本为 rc.6 系列。

## 开发调试

- 插件代码：`lib/index.js`（Host 端，注册 `/api/dsh/api-stats` 路由）、`lib/client.js`（浏览器端）
- 修改后重新执行安装脚本覆盖复制即可；客户端 bundle 由 DSH 的 HMR 热替换，通常无需重启（保险起见刷新页面）
- 数据接口：`GET /api/dsh/api-stats` 返回 `{ updatedAt, configured, balance, usage }`

## License

MIT
