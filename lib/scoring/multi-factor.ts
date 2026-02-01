/**
 * 多因子评分模型
 *
 * 基于多个维度对基金进行综合评分
 * 用于智能推荐系统
 */

export interface FundData {
  code: string;
  name: string;
  type: string;
  // 业绩数据
  return1Y?: number; // 1年收益率
  return3Y?: number; // 3年收益率
  return5Y?: number; // 5年收益率
  // 风险数据
  volatility?: number; // 年化波动率
  maxDrawdown?: number; // 最大回撤
  sharpeRatio?: number; // 夏普比率
  // 基金经理数据
  managerExperience?: number; // 从业年限
  managerScale?: number; // 管理规模（亿元）
  // 费用数据
  managementFee?: number; // 管理费率
  // 规模数据
  fundScale?: number; // 基金规模（亿元）
  // 持仓数据
  holdingsConcentration?: number; // 持仓集中度
  turnoverRate?: number; // 换手率
}

export interface FundScore {
  code: string;
  name: string;
  performance: number; // 业绩得分 (0-100)
  risk: number; // 风险得分 (0-100)
  manager: number; // 经理得分 (0-100)
  fee: number; // 费用得分 (0-100)
  size: number; // 规模得分 (0-100)
  holdings: number; // 持仓得分 (0-100)
  totalScore: number; // 总分 (0-100)
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
}

/**
 * 多因子评分器
 */
export class MultiFactorScorer {
  // 因子权重
  private weights = {
    performance: 0.30, // 业绩因子 30%
    risk: 0.25, // 风险因子 25%
    manager: 0.20, // 经理因子 20%
    fee: 0.10, // 费用因子 10%
    size: 0.10, // 规模因子 10%
    holdings: 0.05, // 持仓因子 5%
  };

  /**
   * 计算基金综合得分
   */
  async score(fund: FundData): Promise<FundScore> {
    const scores = {
      performance: this.calcPerformanceScore(fund),
      risk: this.calcRiskScore(fund),
      manager: this.calcManagerScore(fund),
      fee: this.calcFeeScore(fund),
      size: this.calcSizeScore(fund),
      holdings: this.calcHoldingsScore(fund),
    };

    const totalScore =
      scores.performance * this.weights.performance +
      scores.risk * this.weights.risk +
      scores.manager * this.weights.manager +
      scores.fee * this.weights.fee +
      scores.size * this.weights.size +
      scores.holdings * this.weights.holdings;

    return {
      code: fund.code,
      name: fund.name,
      ...scores,
      totalScore,
      rating: this.getRating(totalScore),
    };
  }

  /**
   * 批量评分
   */
  async scoreBatch(funds: FundData[]): Promise<FundScore[]> {
    const scores = await Promise.all(
      funds.map((fund) => this.score(fund))
    );

    // 按总分降序排序
    return scores.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 计算业绩得分
   */
  private calcPerformanceScore(fund: FundData): number {
    let score = 50; // 基础分

    // 1年收益率 (20分)
    if (fund.return1Y !== undefined) {
      if (fund.return1Y > 30) score += 20;
      else if (fund.return1Y > 20) score += 15;
      else if (fund.return1Y > 10) score += 10;
      else if (fund.return1Y > 0) score += 5;
      else score -= 10;
    }

    // 3年收益率 (40分)
    if (fund.return3Y !== undefined) {
      if (fund.return3Y > 80) score += 40;
      else if (fund.return3Y > 50) score += 30;
      else if (fund.return3Y > 30) score += 20;
      else if (fund.return3Y > 10) score += 10;
      else if (fund.return3Y > 0) score += 5;
      else score -= 10;
    }

    // 5年收益率 (40分)
    if (fund.return5Y !== undefined) {
      if (fund.return5Y > 150) score += 40;
      else if (fund.return5Y > 100) score += 30;
      else if (fund.return5Y > 50) score += 20;
      else if (fund.return5Y > 20) score += 10;
      else if (fund.return5Y > 0) score += 5;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算风险得分
   */
  private calcRiskScore(fund: FundData): number {
    let score = 50; // 基础分

    // 波动率 (30分) - 越低越好
    if (fund.volatility !== undefined) {
      if (fund.volatility < 10) score += 30;
      else if (fund.volatility < 15) score += 20;
      else if (fund.volatility < 20) score += 10;
      else if (fund.volatility < 25) score += 0;
      else score -= 10;
    }

    // 最大回撤 (30分) - 越小越好
    if (fund.maxDrawdown !== undefined) {
      if (fund.maxDrawdown < 5) score += 30;
      else if (fund.maxDrawdown < 10) score += 20;
      else if (fund.maxDrawdown < 15) score += 10;
      else if (fund.maxDrawdown < 20) score += 0;
      else score -= 10;
    }

    // 夏普比率 (40分) - 越高越好
    if (fund.sharpeRatio !== undefined) {
      if (fund.sharpeRatio > 1.5) score += 40;
      else if (fund.sharpeRatio > 1.0) score += 30;
      else if (fund.sharpeRatio > 0.5) score += 20;
      else if (fund.sharpeRatio > 0) score += 10;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算经理得分
   */
  private calcManagerScore(fund: FundData): number {
    let score = 50; // 基础分

    // 从业年限 (50分)
    if (fund.managerExperience !== undefined) {
      if (fund.managerExperience > 10) score += 50;
      else if (fund.managerExperience > 7) score += 40;
      else if (fund.managerExperience > 5) score += 30;
      else if (fund.managerExperience > 3) score += 20;
      else if (fund.managerExperience > 1) score += 10;
    }

    // 管理规模 (50分)
    if (fund.managerScale !== undefined) {
      if (fund.managerScale > 500) score += 50;
      else if (fund.managerScale > 200) score += 40;
      else if (fund.managerScale > 100) score += 30;
      else if (fund.managerScale > 50) score += 20;
      else if (fund.managerScale > 10) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算费用得分
   */
  private calcFeeScore(fund: FundData): number {
    let score = 50; // 基础分

    if (fund.managementFee !== undefined) {
      if (fund.managementFee < 0.5) score += 50;
      else if (fund.managementFee < 1.0) score += 40;
      else if (fund.managementFee < 1.5) score += 30;
      else if (fund.managementFee < 2.0) score += 20;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算规模得分
   */
  private calcSizeScore(fund: FundData): number {
    let score = 50; // 基础分

    if (fund.fundScale !== undefined) {
      // 规模适中最好（10-100亿）
      if (fund.fundScale >= 10 && fund.fundScale <= 100) score += 50;
      else if (fund.fundScale >= 5 && fund.fundScale <= 200) score += 40;
      else if (fund.fundScale >= 2 && fund.fundScale <= 500) score += 30;
      else if (fund.fundScale > 0) score += 10;
      // 规模太小或太大都不好
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算持仓得分
   */
  private calcHoldingsScore(fund: FundData): number {
    let score = 50; // 基础分

    // 持仓集中度 (50分) - 适中最好
    if (fund.holdingsConcentration !== undefined) {
      if (fund.holdingsConcentration >= 30 && fund.holdingsConcentration <= 60) score += 50;
      else if (fund.holdingsConcentration >= 20 && fund.holdingsConcentration <= 70) score += 40;
      else score += 20;
    }

    // 换手率 (50分) - 越低越好
    if (fund.turnoverRate !== undefined) {
      if (fund.turnoverRate < 50) score += 50;
      else if (fund.turnoverRate < 100) score += 40;
      else if (fund.turnoverRate < 200) score += 30;
      else if (fund.turnoverRate < 300) score += 20;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 根据总分获取评级
   */
  private getRating(score: number): 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' {
    if (score >= 90) return 'AAA';
    if (score >= 85) return 'AA';
    if (score >= 80) return 'A';
    if (score >= 75) return 'BBB';
    if (score >= 70) return 'BB';
    if (score >= 65) return 'B';
    return 'CCC';
  }

  /**
   * 设置因子权重
   */
  setWeights(weights: Partial<typeof this.weights>) {
    this.weights = { ...this.weights, ...weights };
  }
}

export default MultiFactorScorer;
