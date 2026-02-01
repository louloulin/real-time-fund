/**
 * Risk Dashboard Component
 *
 * 风险分析仪表板组件
 * 展示投资组合的风险指标
 */

'use client';

import React, { useEffect, useState } from 'react';

interface RiskMetrics {
  portfolioReturn: number;
  portfolioVolatility: number;
  portfolioSharpe: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  correlation: number;
  concentration: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
}

interface StressTest {
  scenario: string;
  impact: number;
  description: string;
}

interface RiskAnalysisResult {
  metrics: RiskMetrics;
  stressTests: StressTest[];
  holdingsCount: number;
}

interface RiskDashboardProps {
  funds: Array<{
    code: string;
    name: string;
    gsz?: string; // 估算净值
    gszzl?: string; // 涨跌幅
  }>;
}

export function RiskDashboard({ funds }: RiskDashboardProps) {
  const [analysis, setAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeRisk = async () => {
    if (funds.length === 0) return;

    setLoading(true);
    try {
      // 转换基金数据为持仓数据
      const holdings = funds.map((fund) => ({
        code: fund.code,
        name: fund.name,
        weight: 1 / funds.length, // 等权重
        return: fund.gszzl ? parseFloat(fund.gszzl) / 100 : 0,
      }));

      const response = await fetch('/api/risk/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings }),
      });

      if (!response.ok) {
        throw new Error('风险分析失败');
      }

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Failed to analyze risk:', error);
      alert('风险分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number, decimals = 2) => {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(decimals)}%`;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#22c55e';
      case 'medium': return '#eab308';
      case 'high': return '#ef4444';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中等风险';
      case 'high': return '高风险';
    }
  };

  return (
    <div className="risk-dashboard">
      {!showDetails ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
            分析当前投资组合的风险指标
          </p>
          <button
            onClick={analyzeRisk}
            disabled={loading || funds.length === 0}
            style={{
              height: '44px',
              padding: '0 24px',
              borderRadius: '12px',
              border: 'none',
              background: loading || funds.length === 0
                ? '#374151'
                : 'linear-gradient(180deg, #0ea5e9, #22d3ee)',
              color: '#05263b',
              fontWeight: 600,
              cursor: loading || funds.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '分析中...' : '开始风险分析'}
          </button>
        </div>
      ) : analysis ? (
        <div>
          {/* 风险概览 */}
          <div className="risk-overview" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div className="metric-card" style={{
              padding: '16px',
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                风险等级
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: getRiskLevelColor(analysis.metrics.riskLevel),
              }}>
                {getRiskLevelLabel(analysis.metrics.riskLevel)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                评分: {analysis.metrics.riskScore.toFixed(0)}/100
              </div>
            </div>

            <div className="metric-card" style={{
              padding: '16px',
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                组合波动率
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#e5e7eb',
              }}>
                {formatPercent(analysis.metrics.portfolioVolatility)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                年化波动
              </div>
            </div>

            <div className="metric-card" style={{
              padding: '16px',
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                最大回撤
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ef4444',
              }}>
                {formatPercent(-analysis.metrics.maxDrawdown)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                历史最大损失
              </div>
            </div>

            <div className="metric-card" style={{
              padding: '16px',
              background: '#0b1220',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                夏普比率
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: analysis.metrics.portfolioSharpe > 1 ? '#22c55e' : analysis.metrics.portfolioSharpe > 0.5 ? '#eab308' : '#ef4444',
              }}>
                {analysis.metrics.portfolioSharpe.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                风险调整收益
              </div>
            </div>
          </div>

          {/* 详细指标 */}
          <div className="risk-details" style={{
            padding: '16px',
            background: '#0b1220',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#e5e7eb' }}>
              风险指标详情
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>组合收益率</span>
                <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                  {formatPercent(analysis.metrics.portfolioReturn)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>95% VaR</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  {formatPercent(-analysis.metrics.var95)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>95% CVaR</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  {formatPercent(-analysis.metrics.cvar95)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>平均相关性</span>
                <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                  {analysis.metrics.correlation.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>集中度 (HHI)</span>
                <span style={{
                  color: analysis.metrics.concentration > 0.5 ? '#ef4444' : '#e5e7eb',
                  fontWeight: 600,
                }}>
                  {(analysis.metrics.concentration * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* 压力测试 */}
          <div className="stress-test" style={{
            padding: '16px',
            background: '#0b1220',
            border: '1px solid #1f2937',
            borderRadius: '12px',
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#e5e7eb' }}>
              压力测试
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.stressTests.map((test, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: '#e5e7eb', marginBottom: '4px' }}>
                      {test.scenario}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {test.description}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: test.impact > -0.05 ? '#22c55e' : test.impact > -0.15 ? '#eab308' : '#ef4444',
                  }}>
                    {formatPercent(test.impact)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 重新分析按钮 */}
          <button
            onClick={analyzeRisk}
            disabled={loading}
            style={{
              width: '100%',
              height: '40px',
              marginTop: '16px',
              borderRadius: '8px',
              border: '1px solid #1f2937',
              background: 'transparent',
              color: '#9ca3af',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {loading ? '分析中...' : '重新分析'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default RiskDashboard;
