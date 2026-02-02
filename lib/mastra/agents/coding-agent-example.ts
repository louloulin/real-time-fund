/**
 * Coding Agent Example
 *
 * 展示如何使用 Zhipu AI Coding Plan
 * API 端点: https://open.bigmodel.cn/api/coding/paas/v4
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 工具: 生成基金分析代码
 */
export const generateFundAnalysisCodeTool = createTool({
  id: 'generate-fund-analysis-code',
  description: '生成基金分析的代码，包括数据获取、处理和可视化',
  inputSchema: z.object({
    fundCode: z.string().describe('基金代码'),
    analysisType: z.enum(['trend', 'risk', 'comparison']).describe('分析类型'),
  }),
  execute: async (inputData) => {
    const { fundCode, analysisType } = inputData;

    // 生成示例代码
    const codeExamples = {
      trend: `
# 基金趋势分析代码示例

import requests
import pandas as pd
import matplotlib.pyplot as plt

def fetch_fund_data(fund_code: str):
    """获取基金历史数据"""
    url = f"https://fund.eastmoney.com/js/{fund_code}.js"
    response = requests.get(url)
    # 解析数据...
    return data

def plot_trend(fund_code: str):
    """绘制趋势图"""
    data = fetch_fund_data(fund_code)
    plt.figure(figsize=(12, 6))
    plt.plot(data['date'], data['nav'])
    plt.title(f'基金 {fund_code} 净值趋势')
    plt.show()

# 使用示例
plot_trend('${fundCode}')
`,
      risk: `
# 基金风险评估代码

import numpy as np
from scipy import stats

def calculate_risk_metrics(returns):
    """计算风险指标"""
    metrics = {
        'volatility': np.std(returns) * np.sqrt(252),
        'sharpe_ratio': np.mean(returns) / np.std(returns) * np.sqrt(252),
        'max_drawdown': calculate_max_drawdown(returns),
        'var_95': np.percentile(returns, 5),
    }
    return metrics

# 分析基金 ${fundCode}
`,
      comparison: `
# 基金对比分析代码

def compare_funds(fund_codes: list):
    """对比多只基金"""
    comparison = {}
    for code in fund_codes:
        data = fetch_fund_data(code)
        comparison[code] = {
            'return': calculate_return(data),
            'risk': calculate_risk(data),
            'sharpe': calculate_sharpe(data),
        }
    return pd.DataFrame(comparison)

# 对比包含 ${fundCode} 的基金组合
`,
    };

    return {
      success: true,
      code: codeExamples[analysisType],
      language: 'python',
      fundCode,
      analysisType,
    };
  },
});

/**
 * 方式 1: 使用 Coding Plan 简单配置
 *
 * Mastra 会自动使用 zhipuai-coding-plan 提供商
 */
export const codingAgentSimple = new Agent({
  id: 'coding-agent-simple',
  name: 'Coding Assistant',
  instructions: `你是一个专业的编程助手，擅长：
1. 生成基金分析代码
2. 解释代码逻辑
3. 优化代码性能
4. 修复代码错误

请使用清晰的注释和最佳实践。`,
  model: 'zhipuai-coding-plan/glm-4.5-air', // ✅ 使用 Coding Plan
  tools: {
    generateFundAnalysisCode: generateFundAnalysisCodeTool,
  },
});

/**
 * 方式 2: 使用 Coding Plan 高级配置
 *
 * 指定编码 API 端点: https://open.bigmodel.cn/api/coding/paas/v4
 */
export const codingAgentAdvanced = new Agent({
  id: 'coding-agent-advanced',
  name: 'Advanced Coding Assistant',
  instructions: `你是一个高级编程助手，专注于：
1. 金融数据分析
2. 算法实现
3. 代码重构
4. 性能优化

使用专业的编程术语和设计模式。`,
  model: {
    // ✅ 指定编码 API 端点
    url: 'https://open.bigmodel.cn/api/coding/paas/v4',
    id: 'zhipuai-coding-plan/glm-4.7', // 使用最新的 GLM-4.7
    apiKey: process.env.ZHIPU_API_KEY,
  },
  tools: {
    generateFundAnalysisCode: generateFundAnalysisCodeTool,
  },
});

/**
 * 方式 3: 动态模型选择
 *
 * 根据任务复杂度选择不同的模型
 */
export const codingAgentDynamic = new Agent({
  id: 'coding-agent-dynamic',
  name: 'Dynamic Coding Assistant',
  instructions: `你是一个智能编程助手，可以根据任务难度调整回答深度。`,
  model: () => {
    // 可以根据环境变量或其他条件动态选择
    const useAdvanced = process.env.USE_ADVANCED_MODEL === 'true';

    return useAdvanced
      ? 'zhipuai-coding-plan/glm-4.7' // 最新最强
      : 'zhipuai-coding-plan/glm-4.5-air';
  },
  tools: {
    generateFundAnalysisCode: generateFundAnalysisCodeTool,
  },
});

/**
 * 导出所有 Coding Agent
 */
export const codingAgents = {
  simple: codingAgentSimple,
  advanced: codingAgentAdvanced,
  dynamic: codingAgentDynamic,
};
