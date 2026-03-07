import type { Metadata } from 'next';
import FlowCodePlatform from '@/components/FlowCodePlatform';

export const metadata: Metadata = {
  title: 'FlowCode Platform - 流程图与代码平台',
  description: '一个功能强大的交互式平台，可以设计流程图、测试流程图、将流程图转换为Python代码，同时支持代码编辑和测试',
};

export default function Home() {
  return <FlowCodePlatform />;
}
