/**
 * Workflow API Route
 *
 * 工作流执行 API
 * 执行基金选择工作流
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeFundSelectionWorkflow } from '../../../../lib/mastra/workflows/fund-selection-workflow';

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

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow execution failed',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.results,
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
