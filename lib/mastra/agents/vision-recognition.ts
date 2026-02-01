/**
 * Vision Recognition Agent
 *
 * 视觉识别 Agent，支持从图片中识别基金信息
 * 使用 Tesseract.js OCR + GLM-4V-Flash AI 验证
 */

import { mastraConfig } from '../config';

// 识别结果接口
export interface FundRecognitionResult {
  fundCode: string | null;
  fundName: string | null;
  nav: string | null;
  change: string | null;
  type: string | null;
  confidence: number;
}

/**
 * Tesseract.js OCR 识别
 * 从图片中提取文本
 */
export async function extractTextWithTesseract(imageFile: File): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const Tesseract = (await import('tesseract.js')).default;

    const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });

    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();

    return text;
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw error;
  }
}

/**
 * 从 OCR 文本中提取基金代码
 * 基金代码格式：6位数字
 */
export function extractFundCodes(text: string): string[] {
  const fundCodePattern = /\b(\d{6})\b/g;
  const matches = text.match(fundCodePattern) || [];
  return [...new Set(matches)]; // 去重
}

/**
 * 从 OCR 文本中提取净值信息
 */
export function extractNavInfo(text: string): { nav: string | null; change: string | null } {
  // 匹配净值：如 1.234, 1.2345
  const navPattern = /(?:单位净值|净值)[:：\s]*([0-9]+\.?[0-9]{0,4})/g;
  const navMatch = navPattern.exec(text);

  // 匹配涨跌幅：如 +1.23%, -1.23%, 1.23%
  const changePattern = /(?:涨跌幅|涨跌)[:：\s]*([+-]?\d+\.?\d{0,2}%)/g;
  const changeMatch = changePattern.exec(text);

  return {
    nav: navMatch ? navMatch[1] : null,
    change: changeMatch ? changeMatch[1] : null,
  };
}

/**
 * 使用 GLM-4V-Flash 进行智能验证和纠错
 * 完全免费的多模态模型
 */
export async function verifyFundWithGLM4V(imageBase64: string): Promise<FundRecognitionResult> {
  const apiKey = process.env.ZHIPU_API_KEY;

  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY is required for vision recognition');
  }

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4v-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `请识别这张基金截图中的以下信息：
1. 基金代码（6位数字）
2. 基金名称
3. 当前净值
4. 涨跌幅
5. 基金类型

请以JSON格式返回：
{
  "fundCode": "000001",
  "fundName": "华夏成长混合",
  "nav": "1.234",
  "change": "+1.23%",
  "type": "混合型",
  "confidence": 0.95
}

如果某些信息无法识别，请设为null。
confidence 是识别的置信度 (0-1)。`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM-4V API error: ${error}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    fundCode: result.fundCode,
    fundName: result.fundName,
    nav: result.nav,
    change: result.change,
    type: result.type,
    confidence: result.confidence || 0.8,
  };
}

/**
 * 将文件转换为 Base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 组合识别流程：Tesseract OCR + GLM-4V 验证
 */
export async function recognizeFundFromImage(imageFile: File): Promise<FundRecognitionResult> {
  try {
    // Step 1: 使用 Tesseract 进行 OCR
    const ocrText = await extractTextWithTesseract(imageFile);

    // Step 2: 提取基金代码
    const fundCodes = extractFundCodes(ocrText);

    // Step 3: 提取净值信息
    const { nav, change } = extractNavInfo(ocrText);

    // Step 4: 使用 GLM-4V 进行验证和纠错
    const base64Image = await fileToBase64(imageFile);
    const aiResult = await verifyFundWithGLM4V(base64Image);

    // Step 5: 合并结果（AI 优先，OCR 补充）
    return {
      fundCode: aiResult.fundCode || (fundCodes[0] || null),
      fundName: aiResult.fundName,
      nav: aiResult.nav || nav,
      change: aiResult.change || change,
      type: aiResult.type,
      confidence: aiResult.confidence,
    };
  } catch (error) {
    console.error('Fund recognition error:', error);
    throw error;
  }
}

/**
 * 视觉识别 Agent 配置
 */
export const visionRecognitionAgentConfig = {
  name: 'visionRecognitionAgent',
  description: '从图片中识别基金信息',
  instructions: `你是一个专业的OCR识别专家，负责从图片中提取基金信息。

支持的图片类型：
1. 基金详情截图（支付宝、天天基金等）
2. 基金持仓截图
3. 基金收益截图
4. 手写基金代码照片

识别流程：
1. 使用 Tesseract.js 进行初步OCR
2. 使用 GLM-4V-Flash 进行验证和纠错
3. 提取基金代码（6位数字）
4. 提取基金名称进行匹配
5. 提取净值、涨跌幅等数据

基金代码格式：
- 6位数字，如 000001、110022
- 可能被遮挡或模糊，需要智能推断`,
  tools: {
    extractFundCode: {
      description: '从图片中提取基金代码',
      parameters: {
        image: {
          type: 'string',
          description: '图片的 Base64 编码',
        },
      },
      execute: async ({ image }: { image: string }) => {
        const result = await verifyFundWithGLM4V(image);
        return {
          success: true,
          fundCode: result.fundCode,
          confidence: result.confidence,
        };
      },
    },
    parseScreenshot: {
      description: '解析基金截图，提取完整信息',
      parameters: {
        image: {
          type: 'string',
          description: '图片的 Base64 编码',
        },
      },
      execute: async ({ image }: { image: string }) => {
        const result = await verifyFundWithGLM4V(image);
        return {
          success: true,
          data: result,
        };
      },
    },
  },
  model: mastraConfig.visionModel,
};

export default visionRecognitionAgentConfig;
