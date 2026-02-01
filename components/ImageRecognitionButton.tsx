/**
 * Image Recognition Button Component
 *
 * 图片识别按钮组件
 * 支持上传基金截图识别基金信息
 */

'use client';

import React, { useState, useRef } from 'react';

interface FundRecognitionResult {
  fundCode: string | null;
  fundName: string | null;
  nav: string | null;
  change: string | null;
  type: string | null;
  confidence: number;
}

interface ImageRecognitionButtonProps {
  onFundRecognized?: (fund: FundRecognitionResult) => void;
  onAddFund?: (code: string) => void;
  existingFunds?: string[];
}

export function ImageRecognitionButton({
  onFundRecognized,
  onAddFund,
  existingFunds = [],
}: ImageRecognitionButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<FundRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    // 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/vision/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '识别失败');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        onFundRecognized?.(data.data);
      } else {
        throw new Error('无法识别图片中的基金信息');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败，请重试');
    } finally {
      setProcessing(false);
      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddFund = () => {
    if (result?.fundCode) {
      onAddFund?.(result.fundCode);
      setResult(null);
    }
  };

  const isAlreadyAdded = result?.fundCode && existingFunds.includes(result.fundCode);

  return (
    <div className="image-recognition-container" style={{ position: 'relative' }}>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        className="icon-button"
        style={{
          width: '44px',
          height: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          border: '1px solid #1f2937',
          background: processing ? '#1f2937' : '#0b1220',
          color: processing ? '#6b7280' : '#9ca3af',
          cursor: processing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!processing) {
            e.currentTarget.style.color = '#22d3ee';
            e.currentTarget.style.borderColor = '#22d3ee';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = processing ? '#6b7280' : '#9ca3af';
          e.currentTarget.style.borderColor = '#1f2937';
        }}
        title="截图识别添加基金"
      >
        {processing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* 识别结果弹窗 */}
      {result && (
        <div
          className="recognition-result-popup"
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '300px',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            zIndex: 200,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>
              识别结果
            </h4>
            <button
              onClick={() => setResult(null)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {result.fundCode ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>基金代码</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#22d3ee' }}>
                  {result.fundCode}
                </div>
              </div>

              {result.fundName && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>基金名称</div>
                  <div style={{ fontSize: '14px', color: '#e5e7eb' }}>{result.fundName}</div>
                </div>
              )}

              {result.nav && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>单位净值</div>
                  <div style={{ fontSize: '14px', color: '#e5e7eb' }}>{result.nav}</div>
                </div>
              )}

              {result.change && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>涨跌幅</div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: result.change.startsWith('+') ? '#f87171' : '#34d399',
                    }}
                  >
                    {result.change}
                  </div>
                </div>
              )}

              {result.type && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>基金类型</div>
                  <div style={{ fontSize: '14px', color: '#e5e7eb' }}>{result.type}</div>
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
                置信度: {(result.confidence * 100).toFixed(0)}%
              </div>

              {!isAlreadyAdded ? (
                <button
                  onClick={handleAddFund}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #0ea5e9, #22d3ee)',
                    color: '#05263b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  添加到监控列表
                </button>
              ) : (
                <div
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    background: 'rgba(52, 211, 153, 0.1)',
                    color: '#34d399',
                    fontSize: '13px',
                  }}
                >
                  已在监控列表中
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#f87171', fontSize: '14px', textAlign: 'center' }}>
              无法识别图片中的基金信息
              <br />
              请上传清晰的基金截图
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="recognition-error"
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            padding: '12px 16px',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid #f87171',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            zIndex: 200,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default ImageRecognitionButton;
