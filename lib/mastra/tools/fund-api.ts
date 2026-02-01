/**
 * Fund API Tools
 *
 * 基金数据 API 工具集
 * 用于与东方财富等数据源交互
 */

/**
 * 获取基金实时估值
 */
export async function fetchFundValuation(code: string): Promise<{
  fundcode: string;
  name: string;
  gztime: string;
  gsz: string;
  gszzl: string;
  dwjz: string;
} | null> {
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
 * 获取基金重仓股票
 */
export async function fetchFundHoldings(code: string): Promise<Array<{
  name: string;
  code: string;
  weight: string;
  change?: string;
}> | null> {
  const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10`;

  try {
    const response = await fetch(url);
    const html = await response.text();

    // 简单解析 HTML 提取股票信息
    const holdings: Array<{ name: string; code: string; weight: string }> = [];

    // 匹配表格行
    const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const rows = html.match(rowPattern) || [];

    for (const row of rows) {
      // 提取股票代码
      const codeMatch = row.match(/(\d{6})/);
      // 提取股票名称
      const nameMatch = row.match(/<a[^>]*>([^<]+)<\/a>/);
      // 提取持仓比例
      const weightMatch = row.match(/([\d.]+%)/);

      if (codeMatch && nameMatch && weightMatch) {
        holdings.push({
          code: codeMatch[1],
          name: nameMatch[1].trim(),
          weight: weightMatch[1],
        });
      }
    }

    return holdings.slice(0, 10);
  } catch (error) {
    console.error('Failed to fetch fund holdings:', error);
    return null;
  }
}

/**
 * 批量获取基金估值
 */
export async function fetchMultipleFundValuations(
  codes: string[]
): Promise<Map<string, any>> {
  const results = new Map<string, any>();

  // 批量请求，每次最多10个
  const batchSize = 10;
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    const promises = batch.map(async (code) => {
      try {
        const data = await fetchFundValuation(code);
        if (data) {
          results.set(code, data);
        }
      } catch (error) {
        console.error(`Failed to fetch valuation for ${code}:`, error);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * 基金数据类型定义
 */
export interface FundData {
  code: string;
  name: string;
  type: string;
  nav?: string;
  gsz?: string;
  gszzl?: string;
  dwjz?: string;
  gztime?: string;
  holdings?: Array<{
    name: string;
    code: string;
    weight: string;
  }>;
}

/**
 * 搜索基金
 */
export async function searchFunds(keyword: string): Promise<FundData[]> {
  const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }

    const script = document.createElement('script');
    script.onload = () => {
      try {
        const result = (window as any).r || [];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }

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
          .slice(0, 50)
          .map((fund: any[]) => ({
            code: fund[0],
            name: fund[2],
            type: fund[3],
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

export default {
  fetchFundValuation,
  fetchFundHoldings,
  fetchMultipleFundValuations,
  searchFunds,
};
