import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowCode Platform - 流程图与代码平台',
  description: '一个功能强大的交互式平台，可以设计流程图、测试流程图、将流程图转换为Python代码，同时支持代码编辑和测试',
  keywords: [
    'FlowCode',
    '流程图',
    '代码生成',
    'Python',
    '可视化编程',
  ],
  authors: [{ name: 'FlowCode Team' }],
  generator: 'FlowCode',
  openGraph: {
    title: 'FlowCode Platform - 流程图与代码平台',
    description: '流程图设计、测试与代码生成平台',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
