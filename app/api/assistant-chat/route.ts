/**
 * Assistant UI Chat API Route
 *
 * 基于 assistant-ui + Mastra 的全栈集成
 * 完全按照 assistant-ui 官方文档实现
 * 参考: https://www.assistant-ui.com/docs/runtimes/mastra/full-stack-integration
 */

import { mastra } from '@/lib/mastra';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/assistant-chat
 *
 * 处理来自 assistant-ui 的聊天请求
 * 使用 Mastra 实例获取 Agent 并返回流式响应
 */
export async function POST(req: Request) {
  try {
    // 从请求体中提取消息
    const { messages } = await req.json();

    // 从 Mastra 实例中获取 fundAdvisor Agent
    const agent = mastra.getAgent('fundAdvisor');

    // 使用 Agent 的 stream 方法处理消息并返回流式响应
    const result = await agent.stream(messages);

    // 返回兼容 assistant-ui 的数据流响应
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
