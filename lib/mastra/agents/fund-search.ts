/**
 * Fund Search Agent
 *
 * 基金搜索智能助手，支持：
 * - 通过基金名称、代码、拼音搜索基金
 * - 解答用户关于基金的疑问
 * - 推荐符合用户需求的基金
 */

import { mastraConfig } from '../config';

// 基金搜索工具
export interface FundSearchResult {
  code: string;
  name: string;
  type: string;
  pinyin?: string;
}

/**
 * 从东方财富 API 搜索基金
 * 使用 JSONP 方式跨域获取数据
 */
export async function searchFundsEastmoney(keyword: string): Promise<FundSearchResult[]> {
  const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }

    // 保存原有的 window.r
    const originalR = (window as any).r;

    const script = document.createElement('script');
    script.onload = () => {
      try {
        const result = (window as any).r || [];
        // 恢复原有的 window.r
        if (originalR !== undefined) {
          (window as any).r = originalR;
        }
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }

        // 客户端过滤（支持代码、名称、拼音）
        const filtered = result
          .filter((fund: any[]) => {
            const code = fund[0] || '';
            const name = fund[2] || '';
            const pinyin = fund[1] || '';
            return (
              code.includes(keyword) ||
              name.toLowerCase().includes(keyword.toLowerCase()) ||
              pinyin.toLowerCase().includes(keyword.toLowerCase())
            );
          })
          .slice(0, 20)
          .map((fund: any[]) => ({
            code: fund[0],
            name: fund[2],
            type: fund[3],
            pinyin: fund[1],
          }));

        resolve(filtered);
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      reject(new Error('Failed to load fund search data'));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

/**
 * 获取基金实时估值
 */
export async function getFundValuation(code: string): Promise<any> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const callbackName = `jsonpgz_${code}_${Date.now()}`;

    const script = document.createElement('script');
    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      resolve(data);
    };

    script.onerror = () => {
      delete (window as any)[callbackName];
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      reject(new Error(`Failed to get fund valuation for ${code}`));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

/**
 * 基金搜索 Agent 配置
 * 用于 Mastra 框架集成
 */
export const fundSearchAgentConfig = {
  name: 'fundSearchAgent',
  description: '搜索和添加基金的智能助手',
  instructions: `你是一个专业的基金搜索助手，可以帮助用户：
1. 通过基金名称、代码、拼音搜索基金
2. 解答用户关于基金的疑问
3. 推荐符合用户需求的基金

基金数据来源：东方财富天天基金

回答时请：
- 使用专业但易懂的语言
- 提供基金的关键信息（代码、名称、类型、净值等）
- 标注风险等级

支持的基金类型：
- 货币型：低风险，适合短期理财
- 债券型：中低风险，收益稳健
- 混合型：中高风险，股债平衡
- 股票型：高风险，追求高收益
- 指数型：跟踪指数，费率低
- QDII：投资海外，分散风险`,
  tools: {
    searchFunds: {
      description: '搜索基金，支持代码、名称、拼音',
      parameters: {
        keyword: {
          type: 'string',
          description: '搜索关键词，可以是基金代码、名称或拼音',
        },
      },
      execute: async ({ keyword }: { keyword: string }) => {
        const results = await searchFundsEastmoney(keyword);
        return {
          success: true,
          data: results,
          count: results.length,
        };
      },
    },
    getFundDetails: {
      description: '获取基金实时估值详情',
      parameters: {
        code: {
          type: 'string',
          description: '基金代码（6位数字）',
        },
      },
      execute: async ({ code }: { code: string }) => {
        const data = await getFundValuation(code);
        return {
          success: true,
          data,
        };
      },
    },
  },
  model: mastraConfig.defaultModel,
};

export default fundSearchAgentConfig;
