# OpenClaw ExchangeRate

Exchange rate lookup and currency conversion plugin for [OpenClaw](https://github.com/openclaw/openclaw), powered by [ExchangeRate-API v6](https://www.exchangerate-api.com/).

## 功能

提供 `exchangerate_convert` 工具，支持：

- 查询任意两种货币之间的**实时汇率**
- 将指定金额从一种货币**换算**为另一种货币
- 支持 150+ 种 ISO 4217 标准货币

---

## 打包（开发者）

> 如果你只是想安装使用，跳过本节。

### 前置要求

- Node.js ≥ 18
- npm ≥ 9

### 步骤

```bash
# 1. 进入插件目录
cd /path/to/openclaw-exchangerate

# 2. 安装依赖
npm install

# 3. 预览打包内容（不生成文件）
npm pack --dry-run

# 4. 生成 tgz 包
npm pack
# → 生成 openclaw-openclaw-exchangerate-2026.3.23.tgz
```

---

## 安装

```bash
# 获取 tgz 文件后，运行：
openclaw plugins install ./openclaw-openclaw-exchangerate-2026.3.23.tgz
```

安装完成后会自动执行 `postinstall` 脚本，在插件目录下创建 `node_modules/openclaw` 符号链接，指向系统中已安装的 openclaw 主程序。

> **注意**：如果安装后 gateway 提示 `Cannot find module 'openclaw/plugin-sdk/...'`，
> 说明 postinstall 脚本没能自动找到 openclaw，请手动补救：
> ```bash
> ln -s "$(npm root -g)/openclaw" \
>   "$(openclaw plugins info openclaw-exchangerate --json | python3 -m json.tool | grep installPath | cut -d'"' -f4)/node_modules/openclaw"
> ```
> 或者更简单地，手动指定路径：
> ```bash
> # 把路径替换成 openclaw 实际安装目录
> ln -s /home/youruser/.npm-global/lib/node_modules/openclaw \
>   ~/.openclaw/extensions/openclaw-exchangerate/node_modules/openclaw
> ```


### 安装后验证

```bash
# 查看插件是否成功加载
openclaw plugins list

# 期望输出（Status 列显示 loaded）：
# │ OpenClaw ExchangeRate │ openclaw-exchangerate │ openclaw │ loaded │ ...
```

---

## 配置

安装完插件后，需要提供 ExchangeRate-API 的 API Key。

### 获取 API Key

前往 [https://www.exchangerate-api.com](https://www.exchangerate-api.com) 注册免费账号，免费套餐每月 1500 次请求。

### 方式一：写入配置文件（推荐）

编辑 `~/.openclaw/openclaw.json`，在 `plugins.entries` 下添加：

```json
{
  "plugins": {
    "entries": {
      "openclaw-exchangerate": {
        "enabled": true,
        "config": {
          "apiKey": "your-api-key-here"
        }
      }
    }
  }
}
```

### 方式二：环境变量

在启动 gateway 的 shell 环境中设置：

```bash
export EXCHANGERATE_API_KEY=your-api-key-here
openclaw gateway --port 18789
```

或者写入 `~/.profile` / `~/.bashrc``持久生效。

### 可选配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `apiKey` | string | ExchangeRate-API 密钥（必填） |
| `baseUrl` | string | 自定义 API 地址（默认 `https://v6.exchangerate-api.com/v6`） |

---

## 启用工具
	确认 `~/.openclaw/openclaw.json` 中 `tools.allow` 包含该工具（或允许全部）：

```json
{
  "tools": {
    "allow": ["*"]
  }
}
```

或者仅允许此工具：

```json
{
  "tools": {
    "allow": ["exchangerate_convert"]
  }
}
```

---

## 重启 Gateway

修改配置后，重启 gateway 使设置生效：

```bash
openclaw gateway stop
openclaw gateway --port 18789
```

验证工具已注册：

```bash
openclaw skills list
# 期望看到：
# │ ✓ ready │ 📦 exchange-rate │ Currency exchange rate conversion using exchangerate-api.com ...
```

---

## 使用示例

在 OpenClaw 聊天中直接提问：

- `帮我查一下 USD 兑 CNY 的汇率`
- `100 欧元等于多少日元？`
- `1000 美元换成英镑是多少`

工具将调用 ExchangeRate-API 返回实时汇率和换算结果。