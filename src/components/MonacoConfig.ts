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
