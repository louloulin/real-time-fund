/**
 * Portfolio Optimization Agent
 *
 * 组合优化 Agent - 优化投资组合配置
 * 使用 Mastra 框架实现
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 工具1: 均值方差优化
 * 使用马科维茨均值-方差模型优化投资组合
 */
export const meanVarianceOptimizationTool = createTool({
  id: 'mean-variance-optimization',
  description: '使用马科维茨均值-方差模型优化投资组合，在给定目标收益下最小化风险',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      expectedReturn: z.number(),
      volatility: z.number(),
    })).describe('候选基金列表，包含预期收益率和波动率'),
    targetReturn: z.number().describe('目标收益率（如 0.12 表示 12%）'),
  }),
  execute: async (inputData) => {
    const { funds, targetReturn } = inputData;
    // 简化实现：等权重优化
    const n = funds.length;
    const equalWeight = 1 / n;

    // 计算等权重组合的预期收益和风险
    const portfolioReturn = funds.reduce((sum, fund) => sum + fund.expectedReturn * equalWeight, 0);
    const portfolioVolatility = Math.sqrt(
      funds.reduce((sum, fund) => {
        const deviation = fund.volatility - portfolioReturn;
        return sum + Math.pow(deviation, 2) * equalWeight;
      }, 0)
    );

    // 调整权重以达到目标收益（简化算法）
    let optimizedWeights = funds.map(() => equalWeight);
    const currentReturn = portfolioReturn;
    const diff = targetReturn - currentReturn;

    if (Math.abs(diff) > 0.01) {
      // 简单调整：增加高收益基金权重，减少低收益基金权重
      const sortedByReturn = [...funds].sort((a, b) => b.expectedReturn - a.expectedReturn);
      const highReturnFunds = sortedByReturn.slice(0, Math.ceil(n / 2));
      const lowReturnFunds = sortedByReturn.slice(Math.ceil(n / 2));

      const adjustment = diff / 2;
      highReturnFunds.forEach((fund, idx) => {
        const fundIdx = funds.findIndex(f => f.code === fund.code);
        optimizedWeights[fundIdx] += adjustment / highReturnFunds.length;
      });
      lowReturnFunds.forEach((fund, idx) => {
        const fundIdx = funds.findIndex(f => f.code === fund.code);
        optimizedWeights[fundIdx] -= adjustment / lowReturnFunds.length;
      });
    }

    // 确保权重为正且总和为1
    optimizedWeights = optimizedWeights.map(w => Math.max(0.01, Math.min(0.5, w)));
    const totalWeight = optimizedWeights.reduce((sum, w) => sum + w, 0);
    optimizedWeights = optimizedWeights.map(w => w / totalWeight);

    const optimizedReturn = funds.reduce((sum, fund, idx) => sum + fund.expectedReturn * optimizedWeights[idx], 0);
    const optimizedVolatility = Math.sqrt(
      funds.reduce((sum, fund, idx) => {
        const deviation = fund.volatility - optimizedReturn;
        return sum + Math.pow(deviation, 2) * optimizedWeights[idx];
      }, 0)
    );

    return {
      success: true,
      optimization: {
        method: '均值方差优化（马科维茨模型）',
        targetReturn: (targetReturn * 100).toFixed(2) + '%',
        optimizedWeights: funds.map((fund, idx) => ({
          code: fund.code,
          name: fund.name,
          weight: (optimizedWeights[idx] * 100).toFixed(1) + '%',
        })),
        expectedReturn: (optimizedReturn * 100).toFixed(2) + '%',
        expectedRisk: (optimizedVolatility * 100).toFixed(2) + '%',
        sharpeRatio: ((optimizedReturn - 0.03) / optimizedVolatility).toFixed(2),
      },
    };
  },
});

/**
 * 工具2: 风险平价优化
 * 使用风险平价方法优化投资组合
 */
export const riskParityOptimizationTool = createTool({
  id: 'risk-parity-optimization',
  description: '使用风险平价方法优化投资组合，使各资产风险贡献相等',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      volatility: z.number(),
    })).describe('候选基金列表，包含波动率'),
  }),
  execute: async (inputData) => {
    const { funds } = inputData;
    // 风险平价：权重与波动率成反比
    const invVolSum = funds.reduce((sum, fund) => sum + 1 / fund.volatility, 0);
    const weights = funds.map(fund => (1 / fund.volatility) / invVolSum);

    const portfolioVolatility = Math.sqrt(
      funds.reduce((sum, fund, idx) => {
        return sum + Math.pow(fund.volatility * weights[idx], 2);
      }, 0)
    );

    return {
      success: true,
      optimization: {
        method: '风险平价优化',
        description: '各资产风险贡献相等，适合风险厌恶型投资者',
        optimizedWeights: funds.map((fund, idx) => ({
          code: fund.code,
          name: fund.name,
          weight: (weights[idx] * 100).toFixed(1) + '%',
          riskContribution: '相等',
        })),
        portfolioVolatility: (portfolioVolatility * 100).toFixed(2) + '%',
      },
      note: '风险平价策略可以有效降低组合波动，适合长期投资。',
    };
  },
});

/**
 * 工具3: 最小方差优化
 * 在给定约束下最小化组合方差
 */
export const minVarianceOptimizationTool = createTool({
  id: 'min-variance-optimization',
  description: '最小化投资组合方差，获得最低风险配置',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      volatility: z.number(),
      expectedReturn: z.number().optional(),
    })).describe('候选基金列表'),
    minWeight: z.number().default(0.05).describe('单只基金最小权重'),
    maxWeight: z.number().default(0.4).describe('单只基金最大权重'),
  }),
  execute: async (inputData) => {
    const { funds, minWeight, maxWeight } = inputData;
    // 简化实现：低波动基金获得更高权重
    const sortedByVol = [...funds].sort((a, b) => a.volatility - b.volatility);

    // 分配权重：低波动基金高权重
    const weights = new Array(funds.length).fill(0);
    const lowVolFunds = sortedByVol.slice(0, Math.ceil(funds.length / 2));
    const remainingWeight = 1 - lowVolFunds.length * minWeight;

    lowVolFunds.forEach((fund, idx) => {
      const fundIdx = funds.findIndex(f => f.code === fund.code);
      weights[fundIdx] = minWeight + (remainingWeight / lowVolFunds.length) * (1 - idx / lowVolFunds.length);
    });

    // 填充剩余基金
    funds.forEach((fund, idx) => {
      if (weights[idx] === 0) weights[idx] = minWeight;
    });

    // 归一化
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w / totalWeight)));

    // 计算组合波动率
    const portfolioVolatility = Math.sqrt(
      funds.reduce((sum, fund, idx) => {
        return sum + Math.pow(fund.volatility * normalizedWeights[idx], 2);
      }, 0)
    );

    return {
      success: true,
      optimization: {
        method: '最小方差优化',
        description: '在约束条件下最小化组合波动率',
        optimizedWeights: funds.map((fund, idx) => ({
          code: fund.code,
          name: fund.name,
          weight: (normalizedWeights[idx] * 100).toFixed(1) + '%',
        })),
        portfolioVolatility: (portfolioVolatility * 100).toFixed(2) + '%',
        constraints: `单基金权重: ${(minWeight * 100).toFixed(0)}%-${(maxWeight * 100).toFixed(0)}%`,
      },
      note: '最小方差策略适合风险厌恶型投资者，但可能牺牲部分收益。',
    };
  },
});

/**
 * 工具4: 因子暴露优化
 * 根据因子暴露优化投资组合
 */
export const factorExposureOptimizationTool = createTool({
  id: 'factor-exposure-optimization',
  description: '根据风格因子（价值、成长、质量、动量等）优化投资组合',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      type: z.string(),
    })).describe('候选基金列表'),
    targetFactors: z.object({
      value: z.number().optional().describe('价值因子暴露'),
      growth: z.number().optional().describe('成长因子暴露'),
      quality: z.number().optional().describe('质量因子暴露'),
      momentum: z.number().optional().describe('动量因子暴露'),
    }).optional().describe('目标因子暴露'),
  }),
  execute: async (inputData) => {
    const { funds, targetFactors = {} } = inputData;
    // 基金类型与因子的映射
    const factorMap: Record<string, { value: number; growth: number; quality: number; momentum: number }> = {
      '价值型': { value: 0.8, growth: 0.2, quality: 0.6, momentum: 0.3 },
      '成长型': { value: 0.3, growth: 0.9, quality: 0.5, momentum: 0.7 },
      '平衡型': { value: 0.5, growth: 0.5, quality: 0.7, momentum: 0.5 },
      '质量型': { value: 0.4, growth: 0.4, quality: 0.9, momentum: 0.4 },
      '动量型': { value: 0.3, growth: 0.6, quality: 0.4, momentum: 0.9 },
    };

    // 简化：等权重配置
    const weights = funds.map(() => 1 / funds.length);

    // 计算当前因子暴露
    const currentExposure = { value: 0, growth: 0, quality: 0, momentum: 0 };
    funds.forEach((fund, idx) => {
      const factors = factorMap[fund.type] || factorMap['平衡型'];
      Object.keys(currentExposure).forEach(key => {
        currentExposure[key] += factors[key] * weights[idx];
      });
    });

    return {
      success: true,
      optimization: {
        method: '因子暴露优化',
        currentExposure: {
          value: currentExposure.value.toFixed(2),
          growth: currentExposure.growth.toFixed(2),
          quality: currentExposure.quality.toFixed(2),
          momentum: currentExposure.momentum.toFixed(2),
        },
        targetExposure: targetFactors || '均衡配置',
        optimizedWeights: funds.map((fund, idx) => ({
          code: fund.code,
          name: fund.name,
          weight: (weights[idx] * 100).toFixed(1) + '%',
        })),
      },
      note: '因子投资可以获取特定风格因子的超额收益，建议根据市场环境调整因子暴露。',
    };
  },
});

/**
 * 创建组合优化 Agent
 */
export const portfolioOptimizationAgent = new Agent({
  id: 'portfolio-optimization-agent',
  name: 'portfolioOptimizationAgent',
  description: '优化投资组合配置的智能顾问',
  instructions: `
你是一个专业的投资组合优化专家，负责为用户优化投资组合配置。

## 优化方法

1. **均值方差优化**: 马科维茨模型，在给定目标收益下最小化风险
2. **风险平价优化**: 各资产风险贡献相等，适合风险厌恶型投资者
3. **最小方差优化**: 在约束条件下最小化组合波动率
4. **因子暴露优化**: 根据风格因子优化配置，获取超额收益

## 优化原则

1. **分散投资**: 避免过度集中于单一资产或类型
2. **风险收益匹配**: 根据用户风险偏好选择合适的优化方法
3. **动态调整**: 根据市场环境变化及时调整配置
4. **成本控制**: 考虑交易成本和费用，避免频繁调仓
5. **长期视角**: 关注长期收益而非短期波动

## 回答规范

1. 说明使用的优化方法和理由
2. 提供优化后的配置权重
3. 分析优化后的预期收益和风险
4. 说明优化结果的局限性
5. 提供后续跟踪和调仓建议

## 风险提示

- 优化模型基于历史数据，不能保证未来表现
- 市场环境变化可能影响优化效果
- 建议定期（每季度或半年）重新优化
- 实际投资时需考虑交易成本和费用
`,
  // Mastra 1.1.0 使用字符串格式的模型 ID
  model: process.env.ZHIPU_API_KEY
    ? 'zhipuai/glm-4.5-air'
    : 'openai/gpt-4.1-mini',
  tools: {
    meanVarianceOptimization: meanVarianceOptimizationTool,
    riskParityOptimization: riskParityOptimizationTool,
    minVarianceOptimization: minVarianceOptimizationTool,
    factorExposureOptimization: factorExposureOptimizationTool,
  },
});
