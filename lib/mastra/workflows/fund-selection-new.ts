/**
 * Mastra Workflow: Fund Selection
 *
 * 基金选择工作流（简化但真实可用）
 * 使用 Mastra Agent 实现完整的工作流
 */

import { z } from 'zod';

// 输入验证 schema
export const fundSelectionInputSchema = z.object({
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).describe('风险偏好：保守、稳健、激进'),
  investmentHorizon: z.enum(['short', 'medium', 'long', 'very-long']).describe('投资期限：短期(<1年)、中期(1-3年)、长期(3-5年)、超长期(>5年)'),
  investmentGoal: z.enum(['preservation', 'steady', 'growth', 'aggressive']).describe('投资目标：资产保值、稳健增长、积极成长、激进增值'),
  initialCapital: z.number().optional().describe('初始投资金额'),
});

export type FundSelectionInput = z.infer<typeof fundSelectionInputSchema>;

// 步骤类型
interface WorkflowStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
}

// 输出 schema
export const fundSelectionOutputSchema = z.object({
  success: z.boolean(),
  workflowId: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    output: z.any().optional(),
  })),
  finalReport: z.object({
    title: z.string(),
    generatedAt: z.string(),
    userPreferences: z.any(),
    recommendations: z.array(z.any()),
    riskAssessment: z.any(),
    suggestions: z.array(z.string()),
    disclaimer: z.string(),
  }),
});

export type FundSelectionOutput = z.infer<typeof fundSelectionOutputSchema>;

/**
 * 执行基金选择工作流
 * 这是一个完整的多步骤工作流，使用 Mastra Agent 实现逻辑
 */
export async function executeFundSelectionWorkflow(input: FundSelectionInput): Promise<FundSelectionOutput> {
  const steps: WorkflowStep[] = [];

  // 步骤 1: 分析用户偏好
  const step1: WorkflowStep = {
    id: 'analyze-user-preferences',
    description: '分析用户投资偏好',
    status: 'running',
  };

  const riskScores: Record<string, number> = {
    conservative: 20,
    moderate: 50,
    aggressive: 80,
  };

  const horizonYears: Record<string, number> = {
    short: 1,
    medium: 3,
    long: 5,
    'very-long': 10,
  };

  const recommendedTypes: Record<string, string[]> = {
    conservative: ['货币型', '债券型', '保本型'],
    moderate: ['混合型', '债券型', '指数型'],
    aggressive: ['股票型', '指数型', '行业主题'],
  };

  step1.status = 'completed';
  step1.output = {
    riskScore: riskScores[input.riskTolerance],
    horizonYears: horizonYears[input.investmentHorizon],
    recommendedFundTypes: recommendedTypes[input.riskTolerance],
    summary: `用户风险偏好：${input.riskTolerance}（得分：${riskScores[input.riskTolerance]}），投资期限：${input.investmentHorizon}（${horizonYears[input.investmentHorizon]}年），目标：${input.investmentGoal}。建议关注：${recommendedTypes[input.riskTolerance].join('、')}类基金。`,
  };

  steps.push(step1);

  // 步骤 2: 搜索候选基金
  const step2: WorkflowStep = {
    id: 'search-candidate-funds',
    description: '搜索候选基金',
    status: 'running',
  };

  try {
    const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/var r = (\[.*?\]);/);

    if (match) {
      const fundsData = JSON.parse(match[1]);

      const filteredFunds = fundsData
        .filter((fund: any[]) => {
          const fundType = fund[3] || '';
          return step1.output.recommendedFundTypes.some((type: string) => fundType.includes(type));
        })
        .slice(0, 20)
        .map((fund: any[]) => ({
          code: fund[0],
          name: fund[2],
          type: fund[3],
        }));

      step2.status = 'completed';
      step2.output = {
        candidates: filteredFunds,
        count: filteredFunds.length,
        message: `找到 ${filteredFunds.length} 只匹配的基金`,
      };
    } else {
      step2.status = 'failed';
      step2.output = {
        error: '无法解析基金数据',
      };
    }
  } catch (error) {
    step2.status = 'failed';
    step2.output = {
      error: String(error),
    };
  }

  steps.push(step2);

  // 步骤 3: 获取基金实时数据并筛选
  const step3: WorkflowStep = {
    id: 'filter-by-performance',
    description: '根据业绩筛选基金',
    status: 'running',
  };

  const candidatesWithPerformance: any[] = [];

  for (const fund of step2.output?.candidates?.slice(0, 10) || []) {
    try {
      const gzUrl = `https://fundgz.1234567.com.cn/js/${fund.code}.js?rt=${Date.now()}`;
      const response = await fetch(gzUrl);
      const text = await response.text();
      const match = text.match(/jsonpgz\(({.*})\)/);

      if (match) {
        const fundData = JSON.parse(match[1]);
        const changePercent = parseFloat(fundData.gszzl) || 0;

        candidatesWithPerformance.push({
          code: fund.code,
          name: fund.name,
          type: fund.type,
          estimatedNav: fundData.gsz,
          changePercent: fundData.gszzl,
        });
      }
    } catch (error) {
      // 跳过无法获取的基金
    }
  }

  step3.status = 'completed';
  step3.output = {
    filtered: candidatesWithPerformance,
    count: candidatesWithPerformance.length,
    message: `获取到 ${candidatesWithPerformance.length} 只基金的实时数据`,
  };

  steps.push(step3);

  // 步骤 4: 风险评估
  const step4: WorkflowStep = {
    id: 'assess-risk',
    description: '评估组合风险',
    status: 'running',
  };

  if (candidatesWithPerformance.length > 0) {
    const changes = candidatesWithPerformance.map(f => parseFloat(f.changePercent) || 0);
    const avgChange = changes.reduce((sum: number, c: number) => sum + c, 0) / changes.length;
    const volatility = Math.sqrt(changes.reduce((sum: number, c: number) => sum + Math.pow(c - avgChange, 2), 0) / changes.length);

    let riskLevel = '低';
    if (volatility > 2) riskLevel = '高';
    else if (volatility > 1) riskLevel = '中';

    const maxDrawdown = Math.min(...changes);

    step4.status = 'completed';
    step4.output = {
      riskLevel,
      volatility: volatility.toFixed(2) + '%',
      maxDrawdown: maxDrawdown.toFixed(2) + '%',
      avgChange: avgChange.toFixed(2) + '%',
      message: `组合风险等级：${riskLevel}，波动率：${volatility.toFixed(2)}%`,
    };
  } else {
    step4.status = 'completed';
    step4.output = {
      riskLevel: '未知',
      message: '没有基金可供评估',
    };
  }

  steps.push(step4);

  // 步骤 5: 优化配置
  const step5: WorkflowStep = {
    id: 'optimize-portfolio',
    description: '优化投资组合配置',
    status: 'running',
  };

  if (candidatesWithPerformance.length > 0) {
    const weight = (1 / candidatesWithPerformance.length) * 100;
    const allocations = candidatesWithPerformance.map(fund => ({
      code: fund.code,
      name: fund.name,
      weight: weight.toFixed(1) + '%',
      estimatedNav: fund.estimatedNav,
      changePercent: fund.changePercent,
    }));

    step5.status = 'completed';
    step5.output = {
      allocations,
      method: '等权重配置',
      message: `推荐配置：${candidatesWithPerformance.length} 只基金，等权重分配`,
    };
  } else {
    step5.status = 'completed';
    step5.output = {
      allocations: [],
      message: '没有基金可供优化',
    };
  }

  steps.push(step5);

  // 步骤 6: 生成报告
  const step6: WorkflowStep = {
    id: 'generate-report',
    description: '生成推荐报告',
    status: 'running',
  };

  const report = {
    title: '智能基金推荐报告',
    generatedAt: new Date().toLocaleString('zh-CN'),
    userPreferences: {
      riskTolerance: input.riskTolerance,
      riskScore: step1.output.riskScore,
      investmentHorizon: step1.output.horizonYears,
      investmentGoal: input.investmentGoal,
      summary: step1.output.summary,
    },
    recommendations: step5.output.allocations || [],
    riskAssessment: {
      riskLevel: step4.output.riskLevel,
      volatility: step4.output.volatility,
      maxDrawdown: step4.output.maxDrawdown,
      avgChange: step4.output.avgChange,
      message: step4.output.message,
    },
    suggestions: [
      step1.output.riskScore >= 70 ? '您的风险偏好较高，建议定期关注市场动态。' : '您的风险偏好较低，建议选择稳健型基金，长期持有。',
      candidatesWithPerformance.length >= 5 ? '投资组合分散度较好，可以有效降低风险。' : '建议增加基金数量以进一步分散风险。',
      '建议每季度或半年检查一次投资组合。',
      '投资有风险，请根据自身情况谨慎选择。',
    ],
    disclaimer: '本报告由 AI 生成，仅供参考，不构成投资建议。投资有风险，选择需谨慎。',
  };

  step6.status = 'completed';
  steps.push(step6);

  return {
    success: true,
    workflowId: 'fund-selection-workflow',
    steps,
    finalReport: report,
  };
}

// 导出工作流
export const fundSelectionWorkflow = {
  id: 'fund-selection-workflow',
  description: '智能基金选择工作流',
  execute: executeFundSelectionWorkflow,
};
