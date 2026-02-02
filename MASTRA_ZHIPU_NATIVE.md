# Mastra 原生 Zhipu AI 集成指南

## 概述

本项目已更新为使用 **Mastra 框架的原生 Zhipu AI (智谱AI) 支持**，无需再使用 OpenAI 兼容模式。

## 官方文档

- [Mastra Zhipu AI 提供商文档](https://mastra.ai/models/providers/zhipuai)
- [Mastra Models 文档](https://mastra.ai/models)

## 为什么使用原生集成？

### ✅ 优势

1. **官方支持** - Mastra 框架内置了对 Zhipu AI 的原生支持
2. **配置简化** - 只需设置 `ZHIPU_API_KEY` 环境变量
3. **自动认证** - Mastra 自动处理 API 认证
4. **完整功能** - 支持所有 GLM 模型的特性
5. **更好的性能** - 直接使用 Zhipu AI API，无需兼容层

### ❌ 不再需要

- ~~手动创建 OpenAI 兼容 provider~~
- ~~设置 `OPENAI_COMPATIBLE_API_KEY`~~
- ~~设置 `OPENAI_COMPATIBLE_BASE_URL`~~
- ~~使用 `openai-compatible/` 前缀~~

## 环境变量配置

创建 `.env.local` 文件：

```bash
# Zhipu AI API Key
ZHIPU_API_KEY=your_actual_api_key_here
```

**获取 API Key**：
1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 创建新的 API Key
4. 复制到 `.env.local` 文件

## 可用模型

Mastra 原生支持以下 Zhipu AI 模型：

### 文本模型

| Model ID | 上下文 | 输入价格 | 输出价格 | 推荐场景 |
|----------|--------|----------|----------|----------|
| `zhipuai/glm-4.5` | 131K | $0.60/百万 | $2/百万 | 通用 |
| `zhipuai/glm-4.5-air` | 131K | $0.20/百万 | $1/百万 | ⭐ **性价比最高** |
| `zhipuai/glm-4.5-flash` | 131K | **免费** | **免费** | ⭐⭐ **免费** |
| `zhipuai/glm-4.6` | 205K | $0.60/百万 | $2/百万 | 长上下文 |
| `zhipuai/glm-4.7` | 205K | $0.60/百万 | $2/百万 | 最新旗舰 |
| `zhipuai/glm-4.7-flash` | 200K | **免费** | **免费** | ⭐⭐ **最新免费版** |

### 视觉模型

| Model ID | 上下文 | 输入价格 | 输出价格 | 推荐场景 |
|----------|--------|----------|----------|----------|
| `zhipuai/glm-4.5v` | 64K | $0.60/百万 | $2/百万 | 图片识别 |
| `zhipuai/glm-4.6v` | 128K | $0.30/百万 | $0.90/百万 | 高精度视觉 |

## 使用方式

### Agent 配置

```typescript
import { Agent } from '@mastra/core/agent';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: 'You are a helpful assistant',
  // ✅ 使用原生 zhipuai 提供商
  model: 'zhipuai/glm-4.5-air',
});
```

### 推荐模型选择

**日常使用** (性价比最高):
```typescript
model: 'zhipuai/glm-4.5-air'
```

**免费方案**:
```typescript
model: 'zhipuai/glm-4.5-flash'  // 或 'zhipuai/glm-4.7-flash'
```

**长上下文需求**:
```typescript
model: 'zhipuai/glm-4.6'  // 205K 上下文
```

**视觉识别**:
```typescript
model: 'zhipuai/glm-4.5v'  // 或 'zhipuai/glm-4.6v'
```

### 高级配置

如果需要自定义 API 配置：

```typescript
export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  model: {
    id: 'zhipuai/glm-4.5',
    apiKey: process.env.ZHIPU_API_KEY,
    url: 'https://open.bigmodel.cn/api/paas/v4',
  },
});
```

### 动态模型选择

```typescript
export const dynamicAgent = new Agent({
  id: 'dynamic-agent',
  name: 'Dynamic Agent',
  model: ({ requestContext }) => {
    const useAdvanced = requestContext.task === 'complex';
    return useAdvanced
      ? 'zhipuai/glm-4.7-flash'
      : 'zhipuai/glm-4.5-air';
  },
});
```

## 成本对比

使用 Zhipu AI 相比 OpenAI 的成本优势：

| 场景 | OpenAI GPT-4o | Zhipu GLM-4.5-Air | 节省 |
|------|---------------|-------------------|------|
| 100万 tokens | $20 | ~¥1.5 ($0.21) | **99%** |
| 图片识别 | $5/图片 | **免费** (GLM-4V) | **100%** |

## 项目中的使用

本项目已配置以下 Agent 使用原生 Zhipu AI：

### Agent 模型配置

1. **fundAdvisorAgent** - `zhipuai/glm-4.5-air`
2. **fundSearchAgent** - `zhipuai/glm-4.5-air`
3. **fundRecommendationAgent** - `zhipuai/glm-4.5-air`
4. **riskAnalysisAgent** - `zhipuai/glm-4.5-air`
5. **portfolioOptimizationAgent** - `zhipuai/glm-4.5-air`
6. **visionRecognitionAgent** - `zhipuai/glm-4.5v` (视觉模型)

## 迁移指南

### 从 OpenAI 兼容模式迁移

**之前** (OpenAI 兼容):
```typescript
// .env.local
OPENAI_COMPATIBLE_API_KEY=xxx
OPENAI_COMPATIBLE_BASE_URL=https://open.bigmodel.cn/api/paas/v4

// Agent 配置
model: 'openai-compatible/glm-4.5-air'
```

**现在** (原生 Zhipu AI):
```typescript
// .env.local
ZHIPU_API_KEY=xxx

// Agent 配置
model: 'zhipuai/glm-4.5-air'
```

## 常见问题

### Q: 如何验证 Zhipu AI 配置正确？

```bash
# 检查环境变量
echo $ZHIPU_API_KEY

# 构建项目
npm run build

# 如果构建成功，说明配置正确
```

### Q: 如何切换回 OpenAI？

```typescript
// Agent 配置
model: process.env.OPENAI_API_KEY
  ? 'openai/gpt-4.1-mini'
  : 'zhipuai/glm-4.5-air'
```

### Q: 免费模型有什么限制？

- GLM-4.5-Flash 和 GLM-4.7-Flash 完全免费
- 无调用次数限制
- 支持 131K-200K 上下文
- 性能与付费版本接近

## 参考资料

- [智谱AI开放平台](https://open.bigmodel.cn/)
- [Zhipu AI 文档](https://github.com/MastraLabs/mastra)
- [GLM-4.5 技术博客](https://hub.baai.ac.cn/view/47726)
