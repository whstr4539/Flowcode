import { loader } from '@monaco-editor/react';

// 配置 Monaco Editor 加载器
export function configureMonaco() {
  // 检测是否在 Electron 环境中
  const isElectron = typeof window !== 'undefined' && 
    (window.electronAPI || navigator.userAgent.toLowerCase().includes('electron'));
  
  // 检测是否为生产环境（打包后的应用）
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isElectron && isProduction) {
    // 在 Electron 生产环境中，使用本地路径
    // Monaco 的 worker 文件需要复制到 out 目录
    loader.config({
      paths: {
        vs: './monaco-editor/min/vs'
      }
    });
  } else {
    // 开发环境使用 CDN
    loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
      }
    });
  }
}

// 获取 Monaco 编辑器选项
export function getMonacoOptions() {
  return {
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    wordWrap: 'on' as const,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
  };
}
