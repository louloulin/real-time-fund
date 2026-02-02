/**
 * Risk Analysis Agent
 *
 * 风险分析 Agent - 分析投资组合风险
 * 使用 Mastra 框架实现
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 工具1: 计算风险指标
 * 计算基金组合的波动率、最大回撤、夏普比率等风险指标
 */
export const calculateRiskTool = createTool({
  id: 'calculate-risk',
  description: '计算基金组合的风险指标，包括波动率、最大回撤、夏普比率等',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      weight: z.number(),
      return: z.number(),
    })).describe('基金组合列表，包含代码、名称、权重和收益率'),
  }),
  execute: async (inputData) => {
    const { funds } = inputData;
    // 计算组合收益率
    const portfolioReturn = funds.reduce((sum, fund) => sum + fund.return * fund.weight, 0);

    // 模拟计算波动率（实际应该用历史数据）
    const volatility = Math.sqrt(
      funds.reduce((sum, fund) => {
        const deviation = fund.return - portfolioReturn;
        return sum + Math.pow(deviation, 2) * fund.weight;
      }, 0)
    );

    // 计算最大回撤（模拟）
    const maxDrawdown = Math.max(...funds.map(f => Math.abs(f.return) * 0.3));

    // 计算夏普比率（假设无风险利率为 3%）
    const riskFreeRate = 0.03;
    const sharpeRatio = (portfolioReturn - riskFreeRate) / volatility;

    // 确定风险等级
    let riskLevel = '低';
    if (volatility > 0.25) riskLevel = '高';
    else if (volatility > 0.15) riskLevel = '中高';
    else if (volatility > 0.08) riskLevel = '中';

    return {
      success: true,
      riskMetrics: {
        portfolioReturn: (portfolioReturn * 100).toFixed(2) + '%',
        volatility: (volatility * 100).toFixed(2) + '%',
        maxDrawdown: (maxDrawdown * 100).toFixed(2) + '%',
        sharpeRatio: sharpeRatio.toFixed(2),
        riskLevel,
      },
      interpretation: `您的投资组合${riskLevel}风险，波动率为${(volatility * 100).toFixed(2)}%，夏普比率为${sharpeRatio.toFixed(2)}。${sharpeRatio > 1 ? '夏普比率大于1，说明风险调整后收益较好。' : '建议优化投资组合以提高风险调整后收益。'}`,
    };
  },
});

/**
 * 工具2: 评估投资组合
 * 全面评估投资组合的配置合理性
 */
export const assessPortfolioTool = createTool({
  id: 'assess-portfolio',
  description: '评估投资组合的配置合理性，包括分散度、集中度、行业分布等',
  inputSchema: z.object({
    holdings: z.array(z.object({
      code: z.string(),
      name: z.string(),
      weight: z.number(),
      type: z.string().optional(),
    })).describe('持仓基金列表'),
  }),
  execute: async (inputData) => {
    const { holdings } = inputData;
    // 检查权重总和
    const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0);
    const weightCheck = Math.abs(totalWeight - 1) < 0.01;

    // 计算分散度（基金数量）
    const diversification = holdings.length;
    let diversificationLevel = '集中';
    if (diversification >= 8) diversificationLevel = '高度分散';
    else if (diversification >= 5) diversificationLevel = '适度分散';

    // 检查单一基金集中度
    const maxWeight = Math.max(...holdings.map(h => h.weight));
    let concentration = '合理';
    if (maxWeight > 0.4) concentration = '高度集中';
    else if (maxWeight > 0.25) concentration = '较集中';

    // 计算类型分布
    const typeDistribution: Record<string, number> = {};
    holdings.forEach(h => {
      const type = h.type || '未知';
      typeDistribution[type] = (typeDistribution[type] || 0) + h.weight;
    });

    return {
      success: true,
      assessment: {
        totalWeight: totalWeight.toFixed(2),
        weightValid: weightCheck,
        diversification,
        diversificationLevel,
        maxWeight: (maxWeight * 100).toFixed(1) + '%',
        concentration,
        typeDistribution,
      },
      suggestions: [
        !weightCheck ? '权重总和应为100%，请检查投资组合配置。' : null,
        diversification < 3 ? '建议增加基金数量以分散风险。' : null,
        maxWeight > 0.3 ? '单一基金权重过高，建议降低集中度。' : null,
        Object.values(typeDistribution).some(w => w > 0.5) ? '建议平衡不同类型基金的配置。' : null,
      ].filter(Boolean),
    };
  },
});

/**
 * 工具3: 分析相关性
 * 分析基金之间的相关性
 */
export const analyzeCorrelationTool = createTool({
  id: 'analyze-correlation',
  description: '分析基金之间的相关性，判断投资组合的分散程度',
  inputSchema: z.object({
    funds: z.array(z.object({
      code: z.string(),
      name: z.string(),
      type: z.string(),
    })).describe('要分析的基金列表'),
  }),
  execute: async (inputData) => {
    const { funds } = inputData;
    // 简化相关性分析：基于基金类型
    const typeGroups: Record<string, string[]> = {};
    funds.forEach(fund => {
      const type = fund.type || '其他';
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(fund.code);
    });

    // 计算相关性得分（类型相同的相关性高）
    let totalCorrelation = 0;
    let pairCount = 0;

    for (let i = 0; i < funds.length; i++) {
      for (let j = i + 1; j < funds.length; j++) {
        const type1 = funds[i].type || '其他';
        const type2 = funds[j].type || '其他';
        // 相同类型相关性为0.8，不同类型为0.3
        const correlation = type1 === type2 ? 0.8 : 0.3;
        totalCorrelation += correlation;
        pairCount++;
      }
    }

    const avgCorrelation = pairCount > 0 ? totalCorrelation / pairCount : 0;

    return {
      success: true,
      correlation: {
        avgCorrelation: avgCorrelation.toFixed(2),
        level: avgCorrelation > 0.6 ? '高相关' : avgCorrelation > 0.4 ? '中等相关' : '低相关',
        typeGroups,
      },
      interpretation: avgCorrelation > 0.6
        ? '基金之间相关性较高，建议增加不同类型基金以降低风险。'
        : '基金之间相关性适中，投资组合分散度较好。',
    };
  },
});

/**
 * 工具4: 压力测试
 * 对投资组合进行压力测试，模拟不同市场情况下的表现
 */
export const stressTestTool = createTool({
  id: 'stress-test',
  description: '对投资组合进行压力测试，模拟牛市、熊市、震荡市等不同情况',
  inputSchema: z.object({
    holdings: z.array(z.object({
      code: z.string(),
      name: z.string(),
      weight: z.number(),
      type: z.string(),
      beta: z.number().optional().describe('Beta系数，默认1.0'),
    })).describe('持仓基金列表'),
  }),
  execute: async (inputData) => {
    const { holdings } = inputData;
    // 模拟不同市场场景
    const scenarios = [
      {
        name: '牛市上涨 (+20%)',
        marketChange: 0.2,
        description: '市场整体上涨20%',
      },
      {
        name: '熊市下跌 (-20%)',
        marketChange: -0.2,
        description: '市场整体下跌20%',
      },
      {
        name: '震荡市场 (0%)',
        marketChange: 0,
        description: '市场横盘整理',
      },
      {
        name: '极端暴跌 (-30%)',
        marketChange: -0.3,
        description: '市场急剧下跌30%',
      },
    ];

    const results = scenarios.map(scenario => {
      // 计算组合在每种场景下的预期收益
      const portfolioChange = holdings.reduce((sum, fund) => {
        const beta = fund.beta || 1.0;
        const typeFactor = {
          '股票型': 1.2,
          '混合型': 0.9,
          '债券型': 0.3,
          '货币型': 0.05,
          '指数型': 1.1,
        }[fund.type] || 1.0;

        const fundChange = scenario.marketChange * beta * typeFactor;
        return sum + fundChange * fund.weight;
      }, 0);

      return {
        name: scenario.name,
        description: scenario.description,
        impact: (portfolioChange * 100).toFixed(2) + '%',
        value: portfolioChange,
      };
    });

    // 找出最大损失
    const maxLoss = Math.min(...results.map(r => r.value));
    const maxGain = Math.max(...results.map(r => r.value));

    return {
      success: true,
      stressTest: {
        results,
        maxLoss: (maxLoss * 100).toFixed(2) + '%',
        maxGain: (maxGain * 100).toFixed(2) + '%',
        resilience: maxLoss > -0.15 ? '较强' : maxLoss > -0.25 ? '一般' : '较弱',
      },
      summary: `在压力测试中，您的投资组合最大可能损失为${(maxLoss * 100).toFixed(2)}%，最大可能收益为${(maxGain * 100).toFixed(2)}%。${maxLoss > -0.15 ? '组合抗风险能力较强。' : '建议增加防御性资产以降低风险。'}`,
    };
  },
});

/**
 * 创建风险分析 Agent
 */
export const riskAnalysisAgent = new Agent({
  id: 'risk-analysis-agent',
  name: 'riskAnalysisAgent',
  description: '分析投资组合风险的专业顾问',
  instructions: `
你是一个专业的风险分析专家，负责评估投资组合的风险。

## 分析维度

1. **波动率分析**: 计算基金历史波动率，衡量价格变动幅度
2. **最大回撤**: 评估历史最大损失，衡量最坏情况下的风险
3. **夏普比率**: 风险调整后收益，衡量单位风险的回报
4. **相关性分析**: 基金之间的相关性，判断分散程度
5. **集中度分析**: 单一基金权重、类型分布等

## 风险等级划分

| 等级 | 波动率范围 | 适用人群 | 推荐基金类型 |
|-----|----------|---------|------------|
| 低风险 | < 8% | 保守型投资者 | 货币型、债券型 |
| 中低风险 | 8%-15% | 稳健型投资者 | 债券型、保本型 |
| 中高风险 | 15%-25% | 平衡型投资者 | 混合型、指数型 |
| 高风险 | > 25% | 激进型投资者 | 股票型、行业主题 |

## 回答规范

1. 清晰说明风险等级和主要风险点
2. 提供具体的风险指标数据
3. 给出风险控制建议
4. 提醒投资有风险，过往业绩不代表未来表现
5. 建议根据自身风险承受能力投资

## 风险提示

- 基金投资有风险，过往业绩不代表未来表现
- 建议根据自身风险承受能力选择合适的基金
- 分散投资可以降低风险，但不能完全消除风险
- 定期检查和调整投资组合
`,
  // Mastra 1.1.0 使用字符串格式的模型 ID
  model: process.env.ZHIPU_API_KEY
    ? 'zhipuai/glm-4.5-air'
    : 'openai/gpt-4.1-mini',
  tools: {
    calculateRisk: calculateRiskTool,
    assessPortfolio: assessPortfolioTool,
    analyzeCorrelation: analyzeCorrelationTool,
    stressTest: stressTestTool,
  },
});
