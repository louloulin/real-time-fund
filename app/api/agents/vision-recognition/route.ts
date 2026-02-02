/**
 * Vision Recognition API Route
 *
 * 视觉识别 API - 使用 Mastra Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/lib/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/vision-recognition
 *
 * 视觉识别（支持图片上传和文本识别）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 如果包含图片数据，使用特殊处理
    if (body.imageData) {
      // 获取视觉识别 Agent
      const agent = mastra.getAgent('visionRecognition');

      // 构建消息（Mastra 接受字符串数组）
      const messages = [
        `请识别这张图片中的基金信息。图片数据：${body.imageData.substring(0, 50)}...`,
      ];

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
    }

    // 普通文本消息
    const { messages } = body;

    // 获取视觉识别 Agent
    const agent = mastra.getAgent('visionRecognition');

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
    console.error('Vision recognition error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process recognition request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
