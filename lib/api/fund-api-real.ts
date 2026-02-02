/**
 * 真实的基金 API 工具
 *
 * 直接调用东方财富 API，不使用 Mastra Agent
 */

/**
 * 真实的基金搜索
 * 调用东方财富 API 获取真实数据
 */
export async function searchFundsReal(keyword: string) {
  try {
    const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;
    const response = await fetch(url);
    const text = await response.text();

    // 解析返回的数据
    const match = text.match(/var r = (\[.*?\]);/);
    if (!match) {
      return {
        success: false,
        results: [],
        error: '无法解析基金数据',
      };
    }

    const fundsData = JSON.parse(match[1]);

    // 过滤匹配的基金
    const filtered = fundsData
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
        pinyin: fund[1],
        name: fund[2],
        type: fund[3],
      }));

    return {
      success: true,
      results: filtered,
      count: filtered.length,
      message: filtered.length > 0 ? `找到 ${filtered.length} 只匹配的基金` : `未找到包含 "${keyword}" 的基金`,
    };
  } catch (error) {
    console.error('搜索基金失败:', error);
    return {
      success: false,
      results: [],
      error: String(error),
    };
  }
}

/**
 * 真实的基金详情获取
 */
export async function getFundDetailsReal(fundCode: string) {
  try {
    const gzUrl = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`;
    const response = await fetch(gzUrl);
    const text = await response.text();

    const match = text.match(/jsonpgz\(({.*})\)/);
    if (!match) {
      return {
        success: false,
        error: '无法获取基金数据',
      };
    }

    const fundData = JSON.parse(match[1]);

    return {
      success: true,
      fund: {
        code: fundData.fundcode,
        name: fundData.name,
        gzTime: fundData.gztime,
        estimatedNav: fundData.gsz,
        changePercent: fundData.gszzl,
        yesterdayNav: fundData.dwjz,
      },
    };
  } catch (error) {
    console.error('获取基金详情失败:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 批量获取基金估值
 */
export async function getBatchFundNav(fundCodes: string[]) {
  const results = await Promise.all(
    fundCodes.map(async (code) => {
      try {
        const result = await getFundDetailsReal(code);
        return result.success ? result.fund : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter(r => r !== null);
}
