/**
 * Fund Selection Workflow API Route
 *
 * 基金选择工作流 API - 使用真实的工作流实现
 */

import { NextRequest, NextResponse } from 'next/server';
import { fundSelectionWorkflow } from '@/lib/mastra/workflows/fund-selection-new';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/fund-selection-new
 *
 * 执行基金选择工作流
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证输入
    const input = {
      riskTolerance: body.riskTolerance || 'moderate',
      investmentHorizon: body.investmentHorizon || 'medium',
      investmentGoal: body.investmentGoal || 'steady',
      initialCapital: body.initialCapital,
    };

    // 执行工作流
    const result = await fundSelectionWorkflow.execute(input);

    return NextResponse.json({
      success: true,
      workflowId: fundSelectionWorkflow.id,
      result,
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
