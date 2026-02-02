/**
 * 测试基金搜索功能
 */

async function testFundSearch() {
  const searchKeyword = '华夏'; // 或其他关键词

  try {
    // 调用东方财富基金搜索接口
    const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;
    const response = await fetch(url);
    const text = await response.text();

    // 解析返回的数据
    const match = text.match(/var r = (\[.*?\]);/);
    if (!match) {
      console.error('无法解析基金数据');
      return;
    }

    const fundsData = JSON.parse(match[1]);
    console.log(`总基金数量: ${fundsData.length}`);

    // 过滤匹配的基金
    const filtered = fundsData
      .filter((fund) => {
        const code = fund[0] || '';
        const name = fund[2] || '';
        const pinyin = fund[1] || '';

        return (
          code.includes(searchKeyword) ||
          name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          pinyin.toLowerCase().includes(searchKeyword.toLowerCase())
        );
      })
      .slice(0, 20)
      .map((fund) => ({
        code: fund[0],
        pinyin: fund[1],
        name: fund[2],
        type: fund[3],
      }));

    console.log(`找到 ${filtered.length} 只匹配的基金:`);
    filtered.forEach((fund, index) => {
      console.log(`${index + 1}. ${fund.code} - ${fund.name} (${fund.type})`);
    });
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

// 运行测试
testFundSearch();
