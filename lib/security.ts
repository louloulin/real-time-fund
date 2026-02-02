/**
 * Security Utilities
 * 
 * 输入验证、清理和安全工具函数
 */

/**
 * 验证基金代码格式
 * 基金代码应为 6 位数字
 */
export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/**
 * 验证和清理用户输入
 * 防止 XSS 攻击
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // 移除尖括号
    .slice(0, 500); // 限制长度
}

/**
 * 验证搜索关键词
 */
export function validateSearchKeyword(keyword: string): boolean {
  const sanitized = sanitizeInput(keyword);
  return sanitized.length >= 1 && sanitized.length <= 50;
}

/**
 * 验证并清理基金代码列表
 */
export function sanitizeFundCodes(codes: string[]): string[] {
  return codes
    .map(code => code.trim())
    .filter(validateFundCode);
}

/**
 * 验证风险偏好值
 */
export function validateRiskTolerance(value: string): boolean {
  return ['conservative', 'moderate', 'aggressive'].includes(value);
}

/**
 * 验证投资期限
 */
export function validateInvestmentHorizon(value: string): boolean {
  return ['short', 'medium', 'long', 'very-long'].includes(value);
}

/**
 * 验证投资目标
 */
export function validateInvestmentGoal(value: string): boolean {
  return ['preservation', 'steady', 'growth', 'aggressive'].includes(value);
}

/**
 * 验证数字范围
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number
): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * 验证权重值（应为 0-1 之间的数字）
 */
export function validateWeight(weight: number): boolean {
  return validateNumberRange(weight, 0, 1);
}

/**
 * 验证投资组合权重总和
 */
export function validatePortfolioWeights(weights: number[]): boolean {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return Math.abs(sum - 1) < 0.01; // 允许 0.01 的误差
}

/**
 * 验证文件类型
 */
export function validateImageFileType(fileType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(fileType);
}

/**
 * 验证文件大小（最大 10MB）
 */
export function validateFileSize(fileSize: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return fileSize <= maxSize;
}

/**
 * 防止 SQL 注入（虽然我们不使用 SQL，但保留作为参考）
 */
export function escapeSqlLike(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&');
}

/**
 * 验证 API Key 格式（简单检查）
 */
export function validateApiKey(key: string): boolean {
  return typeof key === 'string' && key.length >= 20;
}

/**
 * 生成 CSRF Token
 */
export function generateCsrfToken(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

/**
 * 验证 CSRF Token
 */
export function validateCsrfToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

/**
 * 安全地解析 JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 检测恶意输入模式
 */
export function detectMaliciousInput(input: string): boolean {
  const maliciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // 事件处理器如 onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * 清理 HTML 输入
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 验证并转换字符串为数字
 */
export function safeParseNumber(value: string, defaultValue: number): number {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 错误消息清理（防止信息泄露）
 */
export function sanitizeErrorMessage(error: Error): string {
  // 生产环境中不应暴露详细错误信息
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again later.';
  }
  return error.message;
}
