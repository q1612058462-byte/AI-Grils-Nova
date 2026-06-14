# Nora - AI Digital Human MVP

一个基于 Next.js + TypeScript + Tailwind CSS 的数字人 MVP。

## 运行方式

1. 安装依赖

```bash
npm install
```

2. 启动开发环境

```bash
npm run dev
```

3. 打开浏览器访问本地开发地址

## 环境变量

- `OPENAI_API_KEY`
- `OPENAI_REALTIME_MODEL`
- `NEXT_PUBLIC_USE_MOCK_AVATAR`
- `NEXT_PUBLIC_VRM_MODEL_URL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_MODEL`

示例：

```bash
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime
NEXT_PUBLIC_USE_MOCK_AVATAR=true
NEXT_PUBLIC_VRM_MODEL_URL=/models/nora.vrm
OPENAI_COMPATIBLE_API_KEY=sk-your-api-key
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_MODEL=deepseek-v4-flash
```

## OpenAI-compatible 文本对话

将服务商的密钥、Base URL 和模型名写入项目根目录的 `.env.local`。重启开发服务器后，
页面中的模型测试会通过服务端 `/api/chat` 调用兼容 OpenAI Chat Completions 的流式接口。
密钥只在服务端读取，不会发送到浏览器。

DeepSeek 示例：

```env
OPENAI_COMPATIBLE_API_KEY=sk-...
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_MODEL=deepseek-v4-flash
```

其他服务商只需替换对应的 Base URL 和模型名。为兼容现有配置，代码仍会回退读取
`DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL`。

## Mock 模式如何工作

如果 `OPENAI_API_KEY` 缺失，或者显式设置了 `NEXT_PUBLIC_USE_MOCK_AVATAR=true`，页面会默认进入 mock 模式。

点击麦克风后会自动模拟：

1. `listening` 持续约 2 秒
2. 注入一条用户转写
3. 进入 `thinking`
4. 注入 Nora 的回复
5. 进入 `speaking`
6. 播放假口型
7. 回到 `idle`

## OpenAI Realtime 接入点

### 服务端会话

文件：

- `app/api/realtime/session/route.ts`

这个路由会使用服务端 `OPENAI_API_KEY` 创建 ephemeral client secret，不会把密钥暴露给浏览器。

### 浏览器连接层

文件：

- `lib/realtime/createRealtimeConnection.ts`

这里实现了一个可替换的连接管理器：

- mock 模式完全可用
- real 模式是一个尽量完整的 WebRTC 骨架
- 连接失败会自动回落到 mock

## 3D 角色与后续替换点

当前角色层使用 Three.js + VRM，已经具备：

- 面向镜头的自然上半身姿态
- 聆听、思考和说话时的头部与手臂反馈
- `Aa / Ih / Ou` 混合口型
- 表情变化和随机眨眼
- 带窗户、书架和暖光灯的室内场景

默认模型位于 `public/models/nora.vrm`，也可以通过 `NEXT_PUBLIC_VRM_MODEL_URL` 指向自己的 VRM 文件。

默认资产使用 VRoid Studio 的 `AvatarSample_A`：

- 模型整理来源：https://github.com/madjin/vrm-samples
- 官方使用条款：https://vroid.pixiv.help/hc/en-us/articles/4402394424089

替换模型时建议保留完整的 VRM 表情预设，尤其是 `neutral`、`blink`、`aa`、`ih` 和 `ou`，否则表情或口型可能无法完整驱动。

如果以后要替换成真实资产，建议从下面两个文件开始：

- `components/AvatarStage.tsx`
- `components/AvatarFace.tsx`

### 替换成 Live2D

保留 `AvatarStage` 的状态输入，把 `AvatarFace` 内部的 Three.js 场景换成 Live2D 渲染层即可。

### 替换 VRM 模型

将新模型放入 `public/models/`，并修改 `NEXT_PUBLIC_VRM_MODEL_URL` 即可。角色加载、骨骼动作和口型驱动集中在 `AvatarFace` 中。

### 优化口型

当前口型逻辑在：

- `lib/avatar/lipSync.ts`

现在是 requestAnimationFrame 驱动的假口型。后续可以：

- 接入 `AnalyserNode`
- 从音频流读取振幅
- 按音素或能量曲线驱动嘴型

### 接真实 OpenAI Realtime WebRTC

当前骨架在：

- `lib/realtime/createRealtimeConnection.ts`

后续可以继续完善：

- `RTCPeerConnection` 事件处理
- `data channel` 消息映射
- 更细粒度的文本和音频状态切换

## 目录说明

- `app/` 页面、布局和 API 路由
- `components/` 头像、按钮、状态、转写面板
- `lib/` 表达式、口型、提示词和 Realtime 连接层
- `types/` 共享类型
- `styles/` 全局样式
