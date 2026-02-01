/**
 * Risk Analysis API Route
 *
 * 风险分析 API
 * 分析投资组合的风险
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortfolioRiskAnalyzer } from '../../../../lib/risk/portfolio-risk';

/**
 * POST /api/risk/analyze
 *
 * 分析组合风险
 */
export async function POST(request: NextRequest) {
  try {
    const { holdings } = await request.json();

    // 验证输入
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'Invalid holdings data' },
        { status: 400 }
      );
    }

    // 创建风险分析器
    const analyzer = new PortfolioRiskAnalyzer();

    // 分析组合风险
    const metrics = analyzer.analyzePortfolio(holdings);

    // 压力测试
    const stressTests = analyzer.stressTest(holdings);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        stressTests,
        holdingsCount: holdings.length,
      },
    });
  } catch (error) {
    console.error('Risk analysis error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 配置路由选项
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
