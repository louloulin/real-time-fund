/**
 * 组合风险分析模块
 *
 * 计算投资组合的风险指标
 */

export interface FundHolding {
  code: string;
  name: string;
  weight: number; // 权重 (0-1)
  return: number; // 收益率
  volatility?: number; // 波动率
}

export interface RiskMetrics {
  // 组合指标
  portfolioReturn: number; // 组合收益率
  portfolioVolatility: number; // 组合波动率
  portfolioSharpe: number; // 组合夏普比率

  // 风险指标
  maxDrawdown: number; // 最大回撤
  var95: number; // 95% VaR (风险价值)
  cvar95: number; // 95% CVaR (条件风险价值)

  // 分散化指标
  correlation: number; // 平均相关系数
  concentration: number; // 集中度

  // 风险等级
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number; // 风险评分 (0-100)
}

/**
 * 组合风险分析器
 */
export class PortfolioRiskAnalyzer {
  private riskFreeRate = 0.03; // 无风险利率 3%

  /**
   * 分析组合风险
   */
  analyzePortfolio(holdings: FundHolding[]): RiskMetrics {
    if (holdings.length === 0) {
      return this.getEmptyMetrics();
    }

    // 计算组合收益率
    const portfolioReturn = this.calcPortfolioReturn(holdings);

    // 计算组合波动率
    const portfolioVolatility = this.calcPortfolioVolatility(holdings);

    // 计算夏普比率
    const portfolioSharpe = this.calcSharpeRatio(
      portfolioReturn,
      portfolioVolatility
    );

    // 估算最大回撤
    const maxDrawdown = this.estimateMaxDrawdown(portfolioVolatility);

    // 计算 VaR
    const var95 = this.calcVaR(portfolioVolatility, 0.95);
    const cvar95 = this.calcCVaR(portfolioVolatility, 0.95);

    // 计算相关性
    const correlation = this.estimateCorrelation(holdings);

    // 计算集中度
    const concentration = this.calcConcentration(holdings);

    // 计算风险等级
    const { riskLevel, riskScore } = this.getRiskLevel(portfolioVolatility);

    return {
      portfolioReturn,
      portfolioVolatility,
      portfolioSharpe,
      maxDrawdown,
      var95,
      cvar95,
      correlation,
      concentration,
      riskLevel,
      riskScore,
    };
  }

  /**
   * 计算组合收益率
   */
  private calcPortfolioReturn(holdings: FundHolding[]): number {
    return holdings.reduce(
      (sum, h) => sum + h.return * h.weight,
      0
    );
  }

  /**
   * 计算组合波动率
   * 简化计算：使用波动率的加权平均（假设零相关）
   */
  private calcPortfolioVolatility(holdings: FundHolding[]): number {
    let variance = 0;

    for (const holding of holdings) {
      const vol = holding.volatility || this.estimateVolatility(holding.return);
      variance += Math.pow(vol * holding.weight, 2);
    }

    // 添加相关性影响（简化假设平均相关性为 0.3）
    const avgCorrelation = 0.3;
    for (let i = 0; i < holdings.length; i++) {
      for (let j = i + 1; j < holdings.length; j++) {
        const vol1 = holdings[i].volatility || this.estimateVolatility(holdings[i].return);
        const vol2 = holdings[j].volatility || this.estimateVolatility(holdings[j].return);
        variance += 2 * avgCorrelation * holdings[i].weight * holdings[j].weight * vol1 * vol2;
      }
    }

    return Math.sqrt(variance);
  }

  /**
   * 估算波动率（基于收益率）
   */
  private estimateVolatility(returnRate: number): number {
    // 简化假设：波动率约为收益率的 1/3
    return Math.abs(returnRate) / 3 + 0.1; // 最小 10%
  }

  /**
   * 计算夏普比率
   */
  private calcSharpeRatio(
    portfolioReturn: number,
    portfolioVolatility: number
  ): number {
    if (portfolioVolatility === 0) return 0;
    return (portfolioReturn - this.riskFreeRate) / portfolioVolatility;
  }

  /**
   * 估算最大回撤
   */
  private estimateMaxDrawdown(volatility: number): number {
    // 简化假设：最大回撤约为 2 倍波动率
    return volatility * 2;
  }

  /**
   * 计算 VaR (风险价值)
   */
  private calcVaR(volatility: number, confidence: number): number {
    // 使用正态分布假设
    const z = this.getZScore(confidence);
    return z * volatility;
  }

  /**
   * 计算 CVaR (条件风险价值)
   */
  private calcCVaR(volatility: number, confidence: number): number {
    // CVaR 约为 VaR 的 1.2 倍
    return this.calcVaR(volatility, confidence) * 1.2;
  }

  /**
   * 获取 Z 分数
   */
  private getZScore(confidence: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33,
    };
    return zScores[confidence] || 1.65;
  }

  /**
   * 估算平均相关性
   */
  private estimateCorrelation(holdings: FundHolding[]): number {
    if (holdings.length <= 1) return 0;

    // 简化假设：基于基金类型估算相关性
    // 这里使用固定的 0.3 作为估计值
    return 0.3;
  }

  /**
   * 计算集中度（HHI 指数）
   */
  private calcConcentration(holdings: FundHolding[]): number {
    // HHI (Herfindahl-Hirschman Index)
    const hhi = holdings.reduce(
      (sum, h) => sum + Math.pow(h.weight * 100, 2),
      0
    );

    // 归一化到 0-1
    return Math.min(1, hhi / 10000);
  }

  /**
   * 获取风险等级
   */
  private getRiskLevel(volatility: number): {
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
  } {
    let riskLevel: 'low' | 'medium' | 'high';
    let riskScore: number;

    if (volatility < 0.10) {
      riskLevel = 'low';
      riskScore = 100 - volatility * 500; // 50-100
    } else if (volatility < 0.20) {
      riskLevel = 'medium';
      riskScore = 75 - (volatility - 0.10) * 250; // 50-75
    } else {
      riskLevel = 'high';
      riskScore = 50 - Math.min(50, (volatility - 0.20) * 200); // 0-50
    }

    return { riskLevel, riskScore };
  }

  /**
   * 获取空指标
   */
  private getEmptyMetrics(): RiskMetrics {
    return {
      portfolioReturn: 0,
      portfolioVolatility: 0,
      portfolioSharpe: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
      correlation: 0,
      concentration: 0,
      riskLevel: 'low',
      riskScore: 100,
    };
  }

  /**
   * 压力测试
   */
  stressTest(holdings: FundHolding[]): {
    scenario: string;
    impact: number;
    description: string;
  }[] {
    const scenarios = [
      {
        scenario: '市场崩盘',
        impact: -0.30,
        description: '市场下跌 30% 时的损失',
      },
      {
        scenario: '熊市',
        impact: -0.15,
        description: '市场下跌 15% 时的损失',
      },
      {
        scenario: '高波动',
        impact: -0.10,
        description: '波动率上升 10% 时的损失',
      },
      {
        scenario: '利率上升',
        impact: -0.05,
        description: '利率上升 1% 时的损失',
      },
    ];

    const portfolioValue = holdings.reduce((sum, h) => sum + h.weight, 1);

    return scenarios.map((s) => ({
      ...s,
      impact: portfolioValue * s.impact,
    }));
  }
}

export default PortfolioRiskAnalyzer;
