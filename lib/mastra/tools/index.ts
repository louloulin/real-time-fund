/**
 * Mastra Tools Registry
 *
 * 定义 Agent 可以调用的工具
 */

import { z } from 'zod';
import { searchFundsEastmoney } from '../agents/fund-search';
import { searchFunds as searchFundsApi } from './fund-api';

/**
 * 基金搜索工具
 * 支持通过代码、名称、拼音搜索基金
 */
export const searchFundsTool = {
  description: '搜索基金，支持通过基金代码、名称、拼音进行搜索。返回包含基金代码、名称、类型的信息。',
  parameters: z.object({
    keyword: z.string().describe('搜索关键词，可以是基金代码（6位数字）、基金名称或拼音'),
  }),
  execute: async ({ keyword }: { keyword: string }) => {
    try {
      const results = await searchFundsEastmoney(keyword);
      return {
        success: true,
        results: results.slice(0, 20),
        count: results.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '搜索失败',
        results: [],
        count: 0,
      };
    }
  },
};

/**
 * 获取基金详情工具
 */
export const getFundDetailsTool = {
  description: '获取基金的详细信息，包括代码、名称、类型等。',
  parameters: z.object({
    code: z.string().describe('基金代码（6位数字）'),
  }),
  execute: async ({ code }: { code: string }) => {
    try {
      const results = await searchFundsEastmoney(code);
      const fund = results.find((f: any) => f.code === code);

      if (fund) {
        return {
          success: true,
          fund: {
            code: fund.code,
            name: fund.name,
            type: fund.type,
            pinyin: fund.pinyin,
          },
        };
      }

      return {
        success: false,
        error: '未找到该基金',
        fund: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取失败',
        fund: null,
      };
    }
  },
};

/**
 * 批量获取基金估值工具
 */
export const getBatchFundValuationTool = {
  description: '批量获取多只基金的实时估值数据。',
  parameters: z.object({
    codes: z.array(z.string()).describe('基金代码列表'),
  }),
  execute: async ({ codes }: { codes: string[] }) => {
    // 这里调用基金 API 工具
    const results = await Promise.all(
      codes.map(async (code) => {
        try {
          const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

          const data = await new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
              resolve(null);
              return;
            }

            const callbackName = `jsonpgz_${code}_${Date.now()}`;
            const script = document.createElement('script');

            (window as any)[callbackName] = (responseData: any) => {
              delete (window as any)[callbackName];
              if (document.body.contains(script)) {
                document.body.removeChild(script);
              }
              resolve(responseData);
            };

            script.onerror = () => {
              delete (window as any)[callbackName];
              if (document.body.contains(script)) {
                document.body.removeChild(script);
              }
              reject(new Error(`Failed to fetch ${code}`));
            };

            script.src = url;
            document.body.appendChild(script);
          });

          return data;
        } catch {
          return null;
        }
      })
    );

    return {
      success: true,
      results: results.filter((r) => r !== null),
      count: results.filter((r) => r !== null).length,
    };
  },
};

/**
 * 分析基金类型工具
 */
export const analyzeFundTypeTool = {
  description: '分析基金类型并返回该类型的特点和适合的投资人群。',
  parameters: z.object({
    fundType: z.string().describe('基金类型，如：股票型、债券型、混合型、指数型、货币型、QDII等'),
  }),
  execute: async ({ fundType }: { fundType: string }) => {
    const typeInfo: Record<string, any> = {
      '股票型': {
        risk: '高',
        return: '高',
        description: '主要投资于股票市场，追求长期资本增值',
        suitable: '风险承受能力强、追求高收益的投资者',
        period: '建议长期持有（3年以上）',
      },
      '债券型': {
        risk: '中低',
        return: '中低',
        description: '主要投资于债券，收益相对稳定',
        suitable: '风险偏好较低、追求稳定收益的投资者',
        period: '建议中长期持有（1-3年）',
      },
      '混合型': {
        risk: '中',
        return: '中',
        description: '股债混合投资，平衡收益与风险',
        suitable: '希望平衡风险与收益的投资者',
        period: '建议中长期持有（2-5年）',
      },
      '指数型': {
        risk: '中高',
        return: '中',
        description: '跟踪特定指数，费率较低',
        suitable: '相信指数投资、希望降低费用的投资者',
        period: '建议长期持有（3年以上）',
      },
      '货币型': {
        risk: '低',
        return: '低',
        description: '投资于货币市场工具，流动性好',
        suitable: '短期理财、流动性需求高的投资者',
        period: '适合短期投资（1年以内）',
      },
      'QDII': {
        risk: '中高',
        return: '中',
        description: '投资海外市场，分散地域风险',
        suitable: '希望全球配置、分散风险的投资者',
        period: '建议中长期持有（2-5年）',
      },
    };

    const info = typeInfo[fundType] || {
      risk: '未知',
      return: '未知',
      description: '请咨询专业投资顾问',
      suitable: '请根据自身情况谨慎选择',
      period: '建议咨询专业人士',
    };

    return {
      success: true,
      fundType,
      analysis: info,
    };
  },
};

/**
 * 计算风险收益比工具
 */
export const calculateRiskReturnRatioTool = {
  description: '计算基金的风险收益比，帮助评估投资价值。',
  parameters: z.object({
    returnRate: z.number().describe('预期年化收益率（百分比）'),
    volatility: z.number().describe('年化波动率（百分比）'),
    riskFreeRate: z.number().optional().describe('无风险利率（百分比），默认3%'),
  }),
  execute: async ({ returnRate, volatility, riskFreeRate = 3 }) => {
    // 夏普比率 = (收益率 - 无风险利率) / 波动率
    const sharpeRatio = volatility > 0
      ? (returnRate - riskFreeRate) / volatility
      : 0;

    // 评级
    let rating = '';
    if (sharpeRatio > 1.5) rating = '优秀';
    else if (sharpeRatio > 1.0) rating = '良好';
    else if (sharpeRatio > 0.5) rating = '一般';
    else rating = '较差';

    return {
      success: true,
      sharpeRatio: Number(sharpeRatio.toFixed(3)),
      rating,
      recommendation: sharpeRatio > 1
        ? '该基金风险调整后收益表现较好，值得考虑'
        : '该基金风险调整后收益表现一般，建议谨慎考虑',
    };
  },
};

/**
 * 导出所有工具
 */
export const agentTools = {
  searchFunds: searchFundsTool,
  getFundDetails: getFundDetailsTool,
  getBatchFundValuation: getBatchFundValuationTool,
  analyzeFundType: analyzeFundTypeTool,
  calculateRiskReturnRatio: calculateRiskReturnRatioTool,
};

export default agentTools;
