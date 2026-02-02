/**
 * Markdown Text Component
 *
 * 用于渲染 Markdown 格式的消息内容
 * 支持代码高亮、表格、列表等
 */

'use client';

import React from 'react';

interface MarkdownTextProps {
  children: string;
}

/**
 * 简单的 Markdown 解析器
 * 注意：生产环境建议使用 react-markdown 等成熟的库
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  const parseMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 代码块
      if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <pre key={i} className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
            <code className="text-sm font-mono">{codeLines.join('\n')}</code>
          </pre>
        );
        i++;
        continue;
      }

      // 标题
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const content = match[2];
          const Tag = `h${level}` as keyof JSX.IntrinsicElements;
          elements.push(
            <Tag key={i} className={`font-bold mt-4 mb-2 ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'}`}>
              {content}
            </Tag>
          );
          i++;
          continue;
        }
      }

      // 列表
      if (line.match(/^\s*[-*]\s+/) || line.match(/^\s*\d+\.\s+/)) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].match(/^\s*[-*]\s+/) || lines[i].match(/^\s*\d+\.\s+/))) {
          listItems.push(lines[i].replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+\.\s+/, ''));
          i++;
        }
        elements.push(
          <ul key={i} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // 空行
      if (line.trim() === '') {
        elements.push(<br key={i} />);
        i++;
        continue;
      }

      // 普通段落
      elements.push(
        <p key={i} className="my-2">
          {parseInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  /**
   * 解析行内 Markdown
   */
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    let result: React.ReactNode = text;

    // 粗体
    result = React.Children.toArray(result).map((child) => {
      if (typeof child === 'string') {
        return child.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      }
      return child;
    });

    // 斜体
    result = React.Children.toArray(result).map((child) => {
      if (typeof child === 'string') {
        return child.replace(/\*(.+?)\*/g, '<em>$1</em>');
      }
      return child;
    });

    // 代码
    result = React.Children.toArray(result).map((child) => {
      if (typeof child === 'string') {
        return child.replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
      }
      return child;
    });

    // 链接
    result = React.Children.toArray(result).map((child) => {
      if (typeof child === 'string') {
        return child.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-cyan-600 hover:text-cyan-700 underline" target="_blank" rel="noopener noreferrer">$1</a>');
      }
      return child;
    });

    return <span dangerouslySetInnerHTML={{ __html: result as string }} />;
  };

  return <>{parseMarkdown(children)}</>;
}
