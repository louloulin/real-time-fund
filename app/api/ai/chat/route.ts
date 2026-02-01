/**
 * AI Chat API Route
 *
 * 处理 AI 聊天请求
 * 使用 Zhipu GLM 模型提供智能对话功能
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ai/chat
 *
 * AI 聊天接口
 */
export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'glm-4.5-air' } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZHIPU_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'ZHIPU_API_KEY is not configured',
          message: 'Please set ZHIPU_API_KEY in environment variables',
        },
        { status: 500 }
      );
    }

    // 系统提示词
    const systemMessage = {
      role: 'system',
      content: `你是一个专业的基金投资顾问助手，可以帮助用户：

1. 基金搜索：通过基金代码、名称、拼音搜索基金
2. 基金分析：分析基金的历史业绩、风险等级
3. 投资建议：根据用户的风险偏好推荐合适的基金
4. 风险评估：分析投资组合的风险
5. 持仓分析：分析基金的重仓股和投资风格

基金类型说明：
- 货币型：低风险，适合短期理财
- 债券型：中低风险，收益稳健
- 混合型：中高风险，股债平衡
- 股票型：高风险，追求高收益
- 指数型：跟踪指数，费率低
- QDII：投资海外，分散风险

回答时请：
- 使用专业但易懂的语言
- 提供数据支持的分析
- 明确标注风险等级
- 不做绝对的收益承诺
- 建议用户分散投资`,
    };

    // 调用 Zhipu API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    // 流式响应
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const json = JSON.parse(data);
                  const content = json.choices[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
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
