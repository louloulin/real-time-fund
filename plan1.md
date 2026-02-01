# 实时基金估值应用 - 基金名称搜索功能分析文档

## 项目概述

这是一个基于 Next.js 14 的实时基金估值监控应用，通过纯前端方式获取东方财富的基金数据，实现无需后端的实时监控功能。

**技术栈**：
- Next.js 14 (App Router)
- React 18 (Client Components)
- CSS (原生，无 CSS 框架)
- JSONP 跨域数据获取

**核心功能**：
1. 实时基金净值/估值显示
2. 前10重仓股票展示
3. 自选基金管理
4. 自动刷新（可配置频率）
5. **基金名称搜索**（新增功能）

---

## 一、数据接口分析

### 1.1 基金搜索接口

**接口地址**：
```
https://fund.eastmoney.com/js/fundcode_search.js
```

**数据格式**：
```javascript
var r = [
  ["基金代码", "基金简称", "基金类型", "拼音"],
  ["000001", "华夏成长混合", "混合型", "huaxiachengzhang"],
  ...
]
```

**调用方式**（JSONP）：
```javascript
const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;

const data = await new Promise((resolve) => {
  const script = document.createElement('script');
  script.onload = () => {
    // 数据被赋值到 window.r
    const result = window.r || [];
    resolve(result);
  };
  script.src = url;
  document.body.appendChild(script);
});
```

**数据字段说明**：
| 索引 | 字段 | 说明 | 示例 |
|-----|------|------|------|
| [0] | 基金代码 | 6位数字 | "000001" |
| [1] | 基金拼音 | 拼音缩写 | "HXCZHH" |
| [2] | 基金名称 | 完整名称 | "华夏成长混合" |
| [3] | 基金类型 | 分类 | "混合型" |

### 1.2 基金实时估值接口

**接口地址**：
```
https://fundgz.1234567.com.cn/js/{基金代码}.js?rt={时间戳}
```

**返回格式**（JSONP 回调 `jsonpgz`）：
```javascript
jsonpgz({
  fundcode: "000001",
  name: "华夏成长混合",
  gztime: "2024-01-30 15:00",
  gsz: "1.234",     // 估算净值
  gszzl: "1.23",    // 估算涨跌幅 %
  dwjz: "1.230"     // 昨日单位净值
})
```

### 1.3 重仓股票接口

**接口地址**：
```
https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code={基金代码}&topline=10
```

**数据解析**：
- 返回 HTML 表格数据
- 需通过正则提取股票代码、名称、占比

---

## 二、搜索功能实现

### 2.1 搜索流程

```
用户输入 → 防抖(300ms) → 加载搜索接口 → 客户端过滤 → 显示下拉结果 → 用户选择 → 添加基金
```

### 2.2 核心代码

```javascript
// app/page.jsx:364-446
const searchFunds = async (keyword) => {
  // 防抖处理
  searchDebounceRef.current = setTimeout(async () => {
    setSearchLoading(true);

    // 加载搜索接口
    const url = `https://fund.eastmoney.com/js/fundcode_search.js?timestamp=${Date.now()}`;

    const data = await new Promise((resolve) => {
      const script = document.createElement('script');
      script.onload = () => {
        const result = window.r || [];
        resolve(result);
      };
      script.src = url;
      document.body.appendChild(script);
    });

    // 客户端过滤（支持代码、名称、拼音）
    const filtered = data.filter(fund => {
      const code = fund[0] || '';
      const name = fund[2] || '';
      const pinyin = fund[3] || '';
      return code.includes(keyword) ||
             name.toLowerCase().includes(keyword.toLowerCase()) ||
             pinyin.toLowerCase().includes(keyword.toLowerCase());
    }).slice(0, 20);

    setSearchResults(filtered.map(fund => ({
      code: fund[0],
      name: fund[2],
      type: fund[3]
    })));

    // 计算下拉框位置
    const rect = searchInputRef.current.getBoundingClientRect();
    setSearchPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2
    });

    setShowSearchResults(true);
  }, 300);
};
```

### 2.3 UI 结构

```jsx
{/* 搜索输入框 */}
<div ref={searchInputRef} style={{ position: 'relative' }}>
  <input
    placeholder="基金名称或代码..."
    value={searchKeyword}
    onChange={(e) => {
      setSearchKeyword(e.target.value);
      searchFunds(e.target.value);
    }}
    onKeyDown={(e) => {
      // 纯数字代码按回车直接添加
      if (e.key === 'Enter' && /^\d{6}$/.test(searchKeyword.trim())) {
        addFundFromSearch(searchKeyword.trim());
      }
    }}
  />
</div>

{/* 搜索结果下拉框 - 使用 Portal 渲染到 body */}
{showSearchResults && createPortal(
  <div className="search-results" style={{
    top: `${searchPosition.top}px`,
    left: `${searchPosition.left}px`
  }}>
    {searchResults.map((fund) => (
      <div
        key={fund.code}
        className="search-result-item"
        onClick={() => addFundFromSearch(fund.code)}
        onMouseDown={(e) => e.preventDefault()}  // 防止 blur 阻止点击
      >
        <span>{fund.name}</span>
        <span className="muted">#{fund.code}</span>
        {funds.some(f => f.code === fund.code) && (
          <span className="search-result-added">已添加</span>
        )}
      </div>
    ))}
  </div>,
  document.body
)}
```

---

## 三、CSS 样式设计

### 3.1 搜索结果下拉框

```css
/* app/globals.css:477-560 */
.search-results {
  position: fixed;           /* 固定定位，避免被遮挡 */
  top: auto;                 /* 通过 JS 动态设置 */
  left: 50%;
  transform: translateX(-50%);
  background: #0b1220;
  border: 1px solid var(--border);
  border-radius: 12px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 200;              /* 高层级确保显示在最上层 */
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  width: 560px;
  max-width: calc(100vw - 32px);
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  user-select: none;
}

.search-result-item:hover {
  background: rgba(34, 211, 238, 0.1);  /* 悬停高亮 */
}

.search-result-info {
  pointer-events: none;      /* 子元素不响应鼠标，确保父元素点击 */
}

.search-result-added {
  background: rgba(52, 211, 153, 0.2);
  color: var(--success);
  pointer-events: none;
}
```

### 3.2 颜色系统

```css
:root {
  --bg: #0f172a;         /* 背景色 */
  --card: #111827;       /* 卡片背景 */
  --text: #e5e7eb;       /* 主文字 */
  --muted: #9ca3af;      /* 次要文字 */
  --primary: #22d3ee;    /* 主色调（青色） */
  --accent: #60a5fa;     /* 强调色（蓝色） */
  --success: #34d399;    /* 成功/绿色 */
  --danger: #f87171;     /* 危险/红色 */
  --border: #1f2937;     /* 边框 */
}
```

---

## 四、关键技术点

### 4.1 React Portal 解决定位问题

**问题**：搜索结果下拉框使用 `absolute` 定位时，可能被父元素的 `overflow: hidden` 或 `z-index` 遮挡。

**解决方案**：使用 `createPortal` 将下拉框渲染到 `document.body`，配合 `fixed` 定位：

```javascript
import { createPortal } from 'react-dom';

// 在组件返回中
{showSearchResults && createPortal(
  <div className="search-results" style={{
    top: `${searchPosition.top}px`,
    left: `${searchPosition.left}px`
  }}>
    {/* 搜索结果 */}
  </div>,
  document.body  // 渲染到 body，脱离父组件 DOM 层级
)}
```

### 4.2 getBoundingClientRect 动态定位

```javascript
// 计算输入框位置，用于定位下拉框
const rect = searchInputRef.current.getBoundingClientRect();
setSearchPosition({
  top: rect.bottom + 8,           // 输入框底部 + 8px 间距
  left: rect.left + rect.width / 2 // 输入框水平中心
});
```

配合 CSS `transform: translateX(-50%)` 实现水平居中。

### 4.3 onMouseDown 防止 blur 阻止点击

**问题**：点击下拉结果时，输入框先触发 `blur` 事件，导致下拉框关闭，点击事件无法触发。

**解决方案**：

```javascript
<div
  onClick={() => addFundFromSearch(fund.code)}
  onMouseDown={(e) => {
    // 防止 input 的 blur 事件阻止点击
    e.preventDefault();
  }}
>
```

或者使用 `pointer-events: none` 让子元素不响应鼠标事件。

### 4.4 防抖优化

```javascript
searchDebounceRef.current = setTimeout(async () => {
  // 搜索逻辑
}, 300);  // 300ms 延迟
```

避免每次输入都发起请求，减少不必要的网络请求。

---

## 五、截图分析与界面问题

### 5.1 界面布局分析

根据 AI 识别的截图分析：

```
┌─────────────────────────────────────────────────────┐
│  [实时基金估值]                        [刷新] [设置]  │ ← 导航栏（固定）
├─────────────────────────────────────────────────────┤
│  + 添加基金                                          │
│  ┌─────────────────────────────────────────────┐    │
│  │ 基金名称或代码...                    [添加]  │    │ ← 搜索输入框
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ 易方达天天理财货币A #000009              [K] │    │ ← 搜索建议
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  [易方达消费行业股票 #110022]              [垃圾桶]   │
│  单位净值: 3.4200  估值净值: 3.3388  涨跌幅: -2.37% │
│  [前10重仓股票 ▼]                                涨跌幅/占比
│  ┌──────────────┬──────────────┐                   │
│  │ 贵州茅台      │ +1.23%  8.5% │                   │
│  │ 五粮液        │ -0.45%  6.2% │                   │
│  └──────────────┴──────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### 5.2 已修复的问题

| 问题 | 原因 | 解决方案 |
|-----|------|---------|
| 搜索框被导航栏遮挡 | `absolute` 定位 + 层级问题 | 改用 `fixed` + `createPortal` |
| 点击搜索结果无反应 | blur 事件阻止 click | 使用 `onMouseDown` + `preventDefault` |

### 5.3 UI 改进建议（参考）

1. **搜索建议的视觉区分**：增加边框或阴影提升对比度
2. **删除按钮交互反馈**：添加 hover 状态
3. **重仓股票响应式布局**：小屏幕自动调整为1列
4. **数据源说明字体**：适当增大提升可读性

---

## 六、参考资源

### 6.1 API 相关

- [天天基金网数据接口 - CSDN](https://blog.csdn.net/shykevin/article/details/108017302)
- [天天基金免费开放数据API使用说明](https://blog.ops-coffee.com/t/eastmoney-fund-free-open-api.html)
- [实时抓取基金估值数据 - CSDN](https://blog.csdn.net/qq_24256961/article/details/106130384)

### 6.2 React Portal 相关

- [彻底解决React模态框定位难题：react-portal全方位实践指南 - CSDN](https://blog.csdn.net/gitblog_00203/article/details/143710542)
- [探索React Relative Portal：构建无障碍下拉组件的新利器 - CSDN](https://blog.csdn.net/gitblog_00132/article/details/142074687)

### 6.3 下拉定位相关

- [Building a dropdown - Reshaped](https://reshaped.so/blog/building-a-dropdown)
- [Show dropdown list position based on document height - Medium](https://medium.com/@rohitkumarrk13568/show-dropdown-list-position-up-bottom-based-on-document-height-ae4978eb9f1d)
- [Element: getBoundingClientRect() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)

---

## 七、代码文件结构

```
real-time-fund/
├── app/
│   ├── page.jsx       # 主页面组件（包含搜索逻辑）
│   ├── layout.jsx     # 布局组件
│   └── globals.css    # 全局样式
├── public/
├── next.config.js
├── package.json
└── README.md
```

---

## 八、功能总结

### 已实现功能

- ✅ 基金名称搜索
- ✅ 拼音搜索
- ✅ 基金代码搜索
- ✅ 防抖优化
- ✅ 搜索结果下拉显示
- ✅ 一键添加基金
- ✅ 已添加基金状态标识
- ✅ ESC 键关闭搜索结果
- ✅ 点击外部关闭搜索结果

### 核心技术要点

1. **JSONP 跨域**：通过动态 `<script>` 标签获取数据
2. **客户端过滤**：在浏览器端对全量基金数据进行关键词匹配
3. **Portal 渲染**：解决下拉框定位和层级问题
4. **防抖优化**：减少不必要的网络请求
5. **用户体验**：支持回车添加、键盘关闭、点击外部关闭

---

*文档生成时间：2024年*
