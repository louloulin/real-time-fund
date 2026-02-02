/**
 * Portfolio Optimization API Route
 *
 * 组合优化 API - 使用 Mastra Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/lib/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/portfolio-optimization
 *
 * 组合优化
 */
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    // 获取组合优化 Agent
    const agent = mastra.getAgent('portfolioOptimization');

    // 使用 Agent 的 stream 方法
    const result = await agent.stream(messages);

    // 返回流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const agentStream = result.fullStream;
          const reader = agentStream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value.type === 'text-delta' && value.payload?.text) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'content',
                content: value.payload.text
              }) + '\n'));
            }
          }

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }) + '\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Portfolio optimization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process optimization request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
