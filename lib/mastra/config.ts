/**
 * Mastra AI Configuration
 *
 * 使用 Zhipu AI (智谱AI) 作为主要 LLM 提供商
 * OpenAI API 兼容接口，成本仅为 OpenAI 的 5%
 *
 * 模型选择：
 * - GLM-4.5-Air: 主力模型，性价比最高 (¥0.8/百万tokens)
 * - GLM-4-Plus: 高质量分析模型 (¥5/百万tokens)
 * - GLM-4V-Flash: 免费多模态视觉模型
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Zhipu AI (智谱AI) OpenAI 兼容接口
const zhipu = createOpenAICompatible({
  name: 'zhipu',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  apiKey: process.env.ZHIPU_API_KEY || '',
});

// 备用：OpenAI 兼容接口
const openaiFallback = createOpenAICompatible({
  name: 'openai',
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * 模型选择策略
 * 优先使用 Zhipu，降级到 OpenAI
 */
export const selectModel = (type: 'fast' | 'quality' | 'vision') => {
  const hasZhipuKey = Boolean(process.env.ZHIPU_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  if (!hasZhipuKey && !hasOpenAIKey) {
    console.warn('No API key configured for Zhipu or OpenAI');
    return null;
  }

  const modelMap = {
    fast: hasZhipuKey ? 'glm-4.5-air' : 'gpt-4o-mini',
    quality: hasZhipuKey ? 'glm-4-plus' : 'gpt-4o',
    vision: hasZhipuKey ? 'glm-4v-flash' : 'gpt-4-vision-preview',
  };

  return modelMap[type];
};

/**
 * Mastra 配置导出
 */
export const mastraConfig = {
  adapters: {
    // Zhipu AI 模型 (推荐)
    zhipu45air: zhipu('glm-4.5-air'),
    zhipu4plus: zhipu('glm-4-plus'),
    zhipu4vflash: zhipu('glm-4v-flash'),

    // OpenAI 备用
    openai: openaiFallback('gpt-4o'),
    openaiMini: openaiFallback('gpt-4o-mini'),
  },
  // 默认模型
  defaultModel: selectModel('fast') || 'gpt-4o-mini',
  visionModel: selectModel('vision') || 'gpt-4-vision-preview',
  qualityModel: selectModel('quality') || 'gpt-4o',
};

export default mastraConfig;
