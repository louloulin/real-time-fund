/**
 * Vision Recognition Agent
 *
 * 视觉识别 Agent - 从图片中识别基金信息
 * 使用 Mastra 框架实现
 */

import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 工具1: 提取基金代码
 * 使用正则表达式从文本中提取6位基金代码
 */
export const extractFundCodeTool = createTool({
  id: 'extract-fund-code',
  description: '从文本中提取6位数字的基金代码',
  inputSchema: z.object({
    text: z.string().describe('包含基金代码的文本内容'),
  }),
  execute: async (inputData) => {
    const { text } = inputData;
    // 匹配6位连续数字
    const fundCodePattern = /\b\d{6}\b/g;
    const matches = text.match(fundCodePattern);

    if (matches) {
      // 去重
      const uniqueCodes = [...new Set(matches)];
      return {
        success: true,
        fundCodes: uniqueCodes,
        count: uniqueCodes.length,
      };
    }

    return {
      success: false,
      fundCodes: [],
      count: 0,
      message: '未找到基金代码',
    };
  },
});

/**
 * 工具2: 验证基金代码
 * 验证基金代码是否有效
 */
export const validateFundCodeTool = createTool({
  id: 'validate-fund-code',
  description: '验证基金代码是否有效，通过查询东方财富接口确认',
  inputSchema: z.object({
    fundCode: z.string().describe('6位数字的基金代码'),
  }),
  execute: async (inputData) => {
    const { fundCode } = inputData;
    // 验证格式
    if (!/^\d{6}$/.test(fundCode)) {
      return {
        valid: false,
        reason: '基金代码格式不正确，应为6位数字',
      };
    }

    try {
      // 尝试获取基金估值数据
      const url = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`;
      const response = await fetch(url);
      const text = await response.text();
      const match = text.match(/jsonpgz\(({.*})\)/);

      if (match) {
        const fundData = JSON.parse(match[1]);
        return {
          valid: true,
          fund: {
            code: fundData.fundcode,
            name: fundData.name,
            estimatedNav: fundData.gsz,
            changePercent: fundData.gszzl,
          },
        };
      }

      return {
        valid: false,
        reason: '未找到该基金信息',
      };
    } catch (error) {
      return {
        valid: false,
        reason: '验证失败，请稍后重试',
      };
    }
  },
});

/**
 * 工具3: 解析截图
 * 使用 GLM-4V 解析基金截图
 */
export const parseScreenshotTool = createTool({
  id: 'parse-screenshot',
  description: '使用 GLM-4V 视觉模型解析基金截图，提取基金信息',
  inputSchema: z.object({
    imageData: z.string().describe('Base64 编码的图片数据'),
  }),
  execute: async (inputData) => {
    const { imageData } = inputData;
    const zhipuApiKey = process.env.ZHIPU_API_KEY;

    if (!zhipuApiKey) {
      return {
        success: false,
        error: 'ZHIPU_API_KEY 未配置',
      };
    }

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${zhipuApiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4v-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请识别这张基金截图中的信息，并以JSON格式返回：

{
  "fundCode": "基金代码（6位数字）",
  "fundName": "基金名称",
  "nav": "当前净值（字符串格式）",
  "change": "涨跌幅（字符串格式，包含正负号和%）",
  "type": "基金类型",
  "confidence": "识别置信度（0-1之间的数字）"
}

如果某些信息无法识别，请设为 null。只返回JSON，不要有其他内容。`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageData}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();

      if (data.choices && data.choices[0]?.message?.content) {
        const result = JSON.parse(data.choices[0].message.content);
        return {
          success: true,
          result,
        };
      }

      return {
        success: false,
        error: 'AI 识别失败',
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

/**
 * 工具4: 批量识别
 * 批量识别多张图片中的基金信息
 */
export const batchRecognizeTool = createTool({
  id: 'batch-recognize',
  description: '批量识别多张图片中的基金信息',
  inputSchema: z.object({
    images: z.array(z.object({
      data: z.string().describe('Base64 编码的图片数据'),
      id: z.string().optional().describe('图片ID'),
    })).describe('图片列表'),
  }),
  execute: async (inputData) => {
    const { images } = inputData;
    const results = [];

    for (const image of images) {
      try {
        // 直接内联 parseScreenshot 的逻辑
        const zhipuApiKey = process.env.ZHIPU_API_KEY;

        if (!zhipuApiKey) {
          results.push({
            imageId: image.id,
            error: 'ZHIPU_API_KEY 未配置',
          });
          continue;
        }

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${zhipuApiKey}`,
          },
          body: JSON.stringify({
            model: 'glm-4v-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `请识别这张基金截图中的信息，并以JSON格式返回：

{
  "fundCode": "基金代码（6位数字）",
  "fundName": "基金名称",
  "nav": "当前净值（字符串格式）",
  "change": "涨跌幅（字符串格式，包含正负号和%）",
  "type": "基金类型",
  "confidence": "识别置信度（0-1之间的数字）"
}

如果某些信息无法识别，请设为 null。只返回JSON，不要有其他内容。`,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${image.data}`,
                    },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        const data = await response.json();

        if (data.choices && data.choices[0]?.message?.content) {
          const parseResult = JSON.parse(data.choices[0].message.content);

          if (parseResult.fundCode) {
            // 直接内联 validateFundCode 的逻辑
            if (!/^\d{6}$/.test(parseResult.fundCode)) {
              results.push({
                imageId: image.id,
                recognized: parseResult,
                validated: false,
                fund: null,
              });
              continue;
            }

            try {
              const url = `https://fundgz.1234567.com.cn/js/${parseResult.fundCode}.js?rt=${Date.now()}`;
              const fundResponse = await fetch(url);
              const fundText = await fundResponse.text();
              const fundMatch = fundText.match(/jsonpgz\(({.*})\)/);

              const fundData = fundMatch ? JSON.parse(fundMatch[1]) : null;

              results.push({
                imageId: image.id,
                recognized: parseResult,
                validated: !!fundData,
                fund: fundData ? {
                  code: fundData.fundcode,
                  name: fundData.name,
                  estimatedNav: fundData.gsz,
                  changePercent: fundData.gszzl,
                } : null,
              });
            } catch (error) {
              results.push({
                imageId: image.id,
                recognized: parseResult,
                validated: false,
                fund: null,
              });
            }
          } else {
            results.push({
              imageId: image.id,
              error: '未识别到基金代码',
            });
          }
        } else {
          results.push({
            imageId: image.id,
            error: 'AI 识别失败',
          });
        }
      } catch (error) {
        results.push({
          imageId: image.id,
          error: String(error),
        });
      }
    }

    // 汇总识别结果
    const successCount = results.filter(r => r.fund).length;
    const uniqueFunds = [
      ...new Map(
        results
          .filter(r => r.fund)
          .map(r => [r.fund.code, r.fund])
      ).values(),
    ];

    return {
      success: true,
      summary: {
        total: images.length,
        success: successCount,
        failed: images.length - successCount,
        uniqueFunds: uniqueFunds.length,
      },
      results,
      uniqueFunds,
    };
  },
});

/**
 * 创建视觉识别 Agent
 *
 * 基于 Mastra 1.1.0 官方文档实现
 * https://mastra.ai/docs/agents/overview
 */
export const visionRecognitionAgent = new Agent({
  id: 'vision-recognition-agent',
  name: 'visionRecognitionAgent',
  description: '从图片中识别基金信息的智能助手',
  instructions: `
你是一个专业的OCR识别专家，负责从图片中提取基金信息。

## 支持的图片类型

1. **基金详情截图**: 支付宝、天天基金、蚂蚁财富等平台的基金详情页
2. **基金持仓截图**: 用户持仓基金的截图
3. **基金收益截图**: 基金收益表现截图
4. **手写基金代码**: 手写的基金代码照片

## 识别流程

1. 使用 GLM-4V-Flash 视觉模型识别图片内容
2. 提取基金代码（6位数字）
3. 提取基金名称
4. 提取净值、涨跌幅等数据
5. 验证基金代码有效性

## 基金代码格式

- 6位数字，如 000001、110022
- 可能被遮挡或模糊，需要智能推断
- 常见前缀：000xxx、110xxx、163xxx、161xxx 等

## 识别技巧

1. **清晰度**: 确保图片清晰，文字可辨认
2. **完整性**: 尽量包含完整的基金信息区域
3. **光线**: 避免反光和阴影
4. **角度**: 正对着截图，避免倾斜

## 错误处理

1. 如果识别失败，建议用户重新截图
2. 如果基金代码无法验证，提示用户检查代码
3. 如果图片质量差，建议用户提供更清晰的图片
4. 对于模糊图片，可以尝试多次识别

## 隐私说明

- 图片数据仅用于识别，不会存储
- 用户上传的图片不会被用于其他目的
- 请勿上传包含敏感信息的图片
`,
  // Mastra 原生 zhipuai 提供商
  // https://mastra.ai/models/providers/zhipuai
  model: process.env.ZHIPU_API_KEY
    ? 'zhipuai/glm-4.5v'
    : 'openai/gpt-4.1-vision',
  tools: {
    extractFundCode: extractFundCodeTool,
    validateFundCode: validateFundCodeTool,
    parseScreenshot: parseScreenshotTool,
    batchRecognize: batchRecognizeTool,
  },
});
