/**
 * Smart Recommendation API Route
 *
 * 智能推荐 API
 * 根据用户偏好推荐基金
 */

import { NextRequest, NextResponse } from 'next/server';
import { SmartFundRecommender, UserPreferences } from '../../../lib/recommendation/smart-recommender';

/**
 * POST /api/recommend
 *
 * 获取智能推荐
 */
export async function POST(request: NextRequest) {
  try {
    const preferences: UserPreferences = await request.json();

    // 验证输入
    if (!preferences.riskTolerance || !preferences.investmentHorizon || !preferences.investmentGoal) {
      return NextResponse.json(
        { error: 'Missing required preferences' },
        { status: 400 }
      );
    }

    // 创建推荐器
    const recommender = new SmartFundRecommender();

    // 获取推荐
    const recommendations = await recommender.recommend(preferences, 10);

    // 生成投资建议
    const advice = recommender.getInvestmentAdvice(recommendations, preferences);

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        advice,
        preferences,
      },
    });
  } catch (error) {
    console.error('Recommendation error:', error);
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
