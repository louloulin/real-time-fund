/**
 * Mastra Workflow 系统
 *
 * 实现 Agent 工作流编排
 */

export interface WorkflowStep {
  name: string;
  description: string;
  agent: string;
  inputs?: Record<string, any>;
  dependsOn?: string[];
}

export interface WorkflowConfig {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowContext {
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  results: Record<string, any>;
  errors: string[];
}

/**
 * 工作流执行器
 */
export class WorkflowExecutor {
  /**
   * 执行工作流
   */
  async execute(
    config: WorkflowConfig,
    initialContext: WorkflowContext = {}
  ): Promise<WorkflowResult> {
    const results: Record<string, any> = {};
    const errors: string[] = [];
    const context = { ...initialContext };

    // 按依赖关系排序步骤
    const sortedSteps = this.topologicalSort(config.steps);

    for (const step of sortedSteps) {
      try {
        console.log(`[Workflow] Executing step: ${step.name}`);

        // 执行步骤
        const result = await this.executeStep(step, context);

        // 保存结果
        results[step.name] = result;

        // 更新上下文
        context[step.name] = result;

        console.log(`[Workflow] Step completed: ${step.name}`);
      } catch (error) {
        const errorMsg = `Step ${step.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`[Workflow] ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // 根据步骤的 agent 类型执行不同的逻辑
    switch (step.agent) {
      case 'fundSearchAgent':
        return await this.executeFundSearch(step, context);

      case 'fundRecommendationAgent':
        return await this.executeFundRecommendation(step, context);

      case 'riskAnalysisAgent':
        return await this.executeRiskAnalysis(step, context);

      case 'portfolioOptimizationAgent':
        return await this.executePortfolioOptimization(step, context);

      case 'orchestrator':
        return await this.executeOrchestrator(step, context);

      default:
        throw new Error(`Unknown agent: ${step.agent}`);
    }
  }

  /**
   * 执行基金搜索
   */
  private async executeFundSearch(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    const { searchFundsTool } = await import('../tools/index');

    // 从上下文或步骤输入获取搜索关键词
    const keyword = step.inputs?.keyword || context.keyword || '';

    if (!keyword) {
      return { results: [], count: 0 };
    }

    const result = await searchFundsTool.execute({ keyword });
    return result;
  }

  /**
   * 执行基金推荐
   */
  private async executeFundRecommendation(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    const { SmartFundRecommender } = await import('../../recommendation/smart-recommender');

    const recommender = new SmartFundRecommender();

    // 从上下文获取用户偏好
    const preferences = context.preferences || {
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      investmentGoal: 'steady',
    };

    const recommendations = await recommender.recommend(preferences, 10);

    return recommendations;
  }

  /**
   * 执行风险分析
   */
  private async executeRiskAnalysis(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    const { PortfolioRiskAnalyzer } = await import('../../risk/portfolio-risk');

    const analyzer = new PortfolioRiskAnalyzer();

    // 从上下文获取持仓
    const holdings = context.holdings || [];

    const metrics = analyzer.analyzePortfolio(holdings);

    return metrics;
  }

  /**
   * 执行组合优化
   */
  private async executePortfolioOptimization(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // 简化的组合优化逻辑
    const holdings = context.holdings || [];
    const riskMetrics = context['assess-risk'] || {};

    // 基于风险评分调整权重
    const optimizedWeights = holdings.map((h: any) => ({
      ...h,
      optimalWeight: 1 / holdings.length, // 等权重配置
    }));

    return {
      originalWeights: holdings,
      optimizedWeights,
      riskMetrics,
      advice: '建议分散投资，避免过度集中单一基金',
    };
  }

  /**
   * 执行编排器
   */
  private async executeOrchestrator(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<any> {
    // 编排器负责协调和综合结果
    return {
      message: '工作流执行完成',
      summary: this.generateSummary(context),
    };
  }

  /**
   * 生成总结
   */
  private generateSummary(context: WorkflowContext): string {
    const parts: string[] = [];

    if (context['analyze-user-preferences']) {
      parts.push('✓ 用户偏好分析完成');
    }
    if (context['search-candidates']) {
      const count = context['search-candidates'].count || 0;
      parts.push(`✓ 搜索到 ${count} 只候选基金`);
    }
    if (context['filter-by-performance']) {
      parts.push('✓ 业绩筛选完成');
    }
    if (context['assess-risk']) {
      parts.push('✓ 风险评估完成');
    }
    if (context['optimize-portfolio']) {
      parts.push('✓ 组合优化完成');
    }

    return parts.join('\n') || '工作流执行完成';
  }

  /**
   * 拓扑排序步骤（按依赖关系排序）
   */
  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const sorted: WorkflowStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: WorkflowStep) => {
      if (visited.has(step.name)) return;
      if (visiting.has(step.name)) {
        throw new Error(`Circular dependency detected: ${step.name}`);
      }

      visiting.add(step.name);

      // 先访问依赖的步骤
      if (step.dependsOn) {
        for (const depName of step.dependsOn) {
          const depStep = steps.find((s) => s.name === depName);
          if (depStep) {
            visit(depStep);
          }
        }
      }

      visiting.delete(step.name);
      visited.add(step.name);
      sorted.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return sorted;
  }
}

/**
 * 基金选择工作流配置
 */
export const fundSelectionWorkflowConfig: WorkflowConfig = {
  name: 'fund-selection',
  description: '智能基金选择工作流 - 分析偏好、搜索、筛选、评估、优化',
  steps: [
    {
      name: 'analyze-user-preferences',
      description: '分析用户投资偏好',
      agent: 'orchestrator',
      inputs: {
        riskTolerance: 'moderate',
        investmentHorizon: 'medium',
        investmentGoal: 'steady',
      },
    },
    {
      name: 'search-candidates',
      description: '搜索候选基金',
      agent: 'fundSearchAgent',
      dependsOn: ['analyze-user-preferences'],
    },
    {
      name: 'filter-by-performance',
      description: '根据历史业绩筛选',
      agent: 'fundRecommendationAgent',
      dependsOn: ['search-candidates'],
    },
    {
      name: 'assess-risk',
      description: '风险评估',
      agent: 'riskAnalysisAgent',
      dependsOn: ['filter-by-performance'],
    },
    {
      name: 'optimize-portfolio',
      description: '组合优化',
      agent: 'portfolioOptimizationAgent',
      dependsOn: ['assess-risk'],
    },
    {
      name: 'generate-report',
      description: '生成推荐报告',
      agent: 'orchestrator',
      dependsOn: ['optimize-portfolio'],
    },
  ],
};

/**
 * 快捷执行函数
 */
export async function executeFundSelectionWorkflow(
  preferences?: {
    riskTolerance?: string;
    investmentHorizon?: string;
    investmentGoal?: string;
    keyword?: string;
  }
): Promise<WorkflowResult> {
  const executor = new WorkflowExecutor();

  const context: WorkflowContext = {
    preferences: preferences || {
      riskTolerance: 'moderate',
      investmentHorizon: 'medium',
      investmentGoal: 'steady',
    },
    keyword: preferences?.keyword || '',
    holdings: [],
  };

  return executor.execute(fundSelectionWorkflowConfig, context);
}

export default WorkflowExecutor;
