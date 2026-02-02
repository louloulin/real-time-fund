/**
 * Mastra 实例配置
 *
 * 这是真正的 Mastra 框架实现
 * 基于 Mastra 官方文档: https://mastra.ai/docs/getting-started/installation
 */

import { Mastra } from '@mastra/core';
import { fundAdvisorAgent } from './agents/fund-advisor';
import { fundSearchAgent } from './agents/fund-search';
import { fundRecommendationAgent } from './agents/fund-recommendation';
import { riskAnalysisAgent } from './agents/risk-analysis';
import { portfolioOptimizationAgent } from './agents/portfolio-optimization';
import { visionRecognitionAgent } from './agents/vision-recognition';

/**
 * 创建 Mastra 实例并注册所有 Agent
 *
 * 这是 Mastra 框架的核心入口点
 * 所有 Agent 都必须在这里注册才能被使用
 */
export const mastra = new Mastra({
  agents: {
    fundAdvisor: fundAdvisorAgent,
    fundSearch: fundSearchAgent,
    fundRecommendation: fundRecommendationAgent,
    riskAnalysis: riskAnalysisAgent,
    portfolioOptimization: portfolioOptimizationAgent,
    visionRecognition: visionRecognitionAgent,
  },
});

/**
 * 获取基金投资顾问 Agent 的便捷方法
 */
export function getFundAdvisor() {
  return mastra.getAgent('fundAdvisor');
}

/**
 * 获取基金搜索 Agent 的便捷方法
 */
export function getFundSearchAgent() {
  return mastra.getAgent('fundSearch');
}

/**
 * 获取基金推荐 Agent 的便捷方法
 */
export function getFundRecommendationAgent() {
  return mastra.getAgent('fundRecommendation');
}

/**
 * 获取风险分析 Agent 的便捷方法
 */
export function getRiskAnalysisAgent() {
  return mastra.getAgent('riskAnalysis');
}

/**
 * 获取组合优化 Agent 的便捷方法
 */
export function getPortfolioOptimizationAgent() {
  return mastra.getAgent('portfolioOptimization');
}

/**
 * 获取视觉识别 Agent 的便捷方法
 */
export function getVisionRecognitionAgent() {
  return mastra.getAgent('visionRecognition');
}
