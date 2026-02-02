# Mastra AI 框架修复指南

## 问题分析

基于对 Mastra 1.1.0 官方文档的深入研究，发现当前实现存在以下问题：

### 1. 缺少关键依赖包
- 缺少 `@mastra/ai-sdk` 包
- 该包提供了 `handleChatStream` 和 `createUIMessageStreamResponse` 等关键函数

### 2. Agent Model 配置格式不正确
- **当前**: 使用对象格式 `{ providerId, modelId, url, apiKey }`
- **正确**: 使用字符串格式 `"openai-compatible/glm-4.5-air"`

### 3. Tool execute 参数格式不正确
- **当前**: `execute: async ({ keyword }) =>`
- **正确**: `execute: async (inputData) =>` 然后 `inputData.keyword`

### 4. API 路由实现方式不正确
- **当前**: 手动处理流式响应
- **正确**: 使用 `handleChatStream` 函数

## 修复步骤

### 步骤 1: 安装缺失的依赖

```bash
# 如果有代理问题，先取消代理
npm config set proxy null
npm config set https-proxy null

# 安装 @mastra/ai-sdk
npm install @mastra/ai-sdk@latest

# 或者使用 yarn/pnpm
yarn add @mastra/ai-sdk@latest
# 或
pnpm add @mastra/ai-sdk@latest
```

### 步骤 2: 配置环境变量

创建或更新 `.env.local` 文件：

```bash
# Zhipu AI API Key
ZHIPU_API_KEY=your_actual_api_key_here

# Mastra OpenAI 兼容提供商配置
OPENAI_COMPATIBLE_API_KEY=your_actual_api_key_here
OPENAI_COMPATIBLE_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

**重要**: 将 `your_actual_api_key_here` 替换为你的实际 Zhipu API Key。

### 步骤 3: 修复 Agent 文件

所有 Agent 文件需要修复以下内容：

#### 3.1 Model 配置

**修复前**:
```typescript
model: {
  providerId: 'openai-compatible',
  modelId: 'glm-4.5-air',
  url: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: process.env.ZHIPU_API_KEY || '',
}
```

**修复后**:
```typescript
model: process.env.ZHIPU_API_KEY
  ? 'openai-compatible/glm-4.5-air'
  : 'openai/gpt-4.1-mini'
```

#### 3.2 Tool execute 参数

**修复前**:
```typescript
execute: async ({ keyword }) => {
  const result = await searchFunds(keyword);
  return result;
}
```

**修复后**:
```typescript
execute: async (inputData) => {
  const { keyword } = inputData;
  const result = await searchFunds(keyword);
  return result;
}
```

### 步骤 4: 使用正确的 API 路由

创建新的 API 路由文件 `app/api/mastra-chat/route.ts`:

```typescript
import { handleChatStream } from '@mastra/ai-sdk';
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/lib/mastra';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const THREAD_ID = 'fund-advisor-user';
const RESOURCE_ID = 'fund-chat';

export async function POST(req: Request) {
  const params = await req.json();

  const stream = await handleChatStream({
    mastra,
    agentId: 'fundAdvisor',
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: THREAD_ID,
        resource: RESOURCE_ID,
      },
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function GET() {
  const agent = mastra.getAgentById('fundAdvisor');
  const memory = await agent.getMemory();

  let response = null;
  try {
    response = await memory?.recall({
      threadId: THREAD_ID,
      resourceId: RESOURCE_ID,
    });
  } catch {
    console.log('No previous messages found.');
  }

  const uiMessages = toAISdkV5Messages(response?.messages || []);
  return NextResponse.json(uiMessages);
}
```

### 步骤 5: 更新前端组件

使用 `@ai-sdk/react` 的 `useChat` hook:

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export function MastraChat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/mastra-chat',
  });

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? '用户' : 'AI'}: {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

## 需要修复的文件清单

1. **lib/mastra/agents/fund-advisor.ts** ✅ 已修复
2. **lib/mastra/agents/fund-search.ts** ⚠️ 需要修复
3. **lib/mastra/agents/fund-recommendation.ts** ⚠️ 需要修复
4. **lib/mastra/agents/risk-analysis.ts** ⚠️ 需要修复
5. **lib/mastra/agents/portfolio-optimization.ts** ⚠️ 需要修复
6. **lib/mastra/agents/vision-recognition.ts** ⚠️ 需要修复

7. **package.json** - 需要添加 `@mastra/ai-sdk`
8. **app/api/mastra-chat/route.ts** - ✅ 已创建

## 验证修复

修复完成后，运行以下命令验证：

```bash
# 构建项目
npm run build

# 如果构建成功，启动开发服务器
npm run dev
```

访问 http://localhost:5600 并测试聊天功能。

## 常见问题

### Q: npm install 失败，提示 ECONNREFUSED
**A**: 这可能是代理问题，尝试：
```bash
npm config set proxy null
npm config set https-proxy null
npm config set registry https://registry.npmmirror.com
```

### Q: 找不到 @mastra/ai-sdk 模块
**A**: 确保已安装 `@mastra/ai-sdk` 包：
```bash
npm list @mastra/ai-sdk
```

### Q: Agent 返回错误 "Model not found"
**A**: 检查环境变量是否正确配置：
```bash
echo $ZHIPU_API_KEY
echo $OPENAI_COMPATIBLE_API_KEY
```

## 参考资料

- [Mastra 官方文档 - Next.js 集成](https://mastra.ai/guides/getting-started/next-js)
- [Mastra 官方文档 - Agents](https://mastra.ai/docs/agents/overview)
- [Mastra 官方文档 - Tools](https://mastra.ai/docs/tools-mcp/overview)
- [AI SDK React 文档](https://sdk.vercel.ai/docs/ai-sdk-core/getting-started)

## 下一步

1. 修复所有剩余的 Agent 文件
2. 更新前端组件以使用新的 API 路由
3. 测试所有功能
4. 更新 plan1.1.md 标记修复完成
