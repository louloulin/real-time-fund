/**
 * Workflow API Route
 *
 * 工作流执行 API
 * 执行基金选择工作流
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow as executeFundSelectionWorkflow } from '../../../../lib/mastra/workflows/fund-selection-workflow';

/**
 * POST /api/workflows/fund-selection
 *
 * 执行基金选择工作流
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 执行工作流
    const result = await executeFundSelectionWorkflow(body);

    // 工作流总是返回 success: true，直接返回数据
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      {
        success: false,
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
