'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Download, Copy, Trash2, Check, Terminal as TerminalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getMonacoOptions } from './MonacoConfig';

interface CodeEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  isRunning?: boolean;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
}

const defaultCode = `# Python 代码编辑器
# 在这里编写或粘贴你的 Python 代码
# 点击"运行代码"按钮执行，结果将在"测试面板"中显示

def greet(name):
    """一个简单的问候函数"""
    return f"你好, {name}!"

def calculate_sum(numbers):
    """计算数字列表的和"""
    return sum(numbers)

def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# 示例用法
if __name__ == "__main__":
    print(greet("世界"))
    print(f"1-5的和: {calculate_sum([1, 2, 3, 4, 5])}")
    print(f"斐波那契数列第10项: {fibonacci(10)}")
`;

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode = defaultCode,
  onCodeChange,
  isRunning = false,
  showTerminal = false,
  onToggleTerminal,
}) => {
  const [code, setCode] = useState<string>(initialCode);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: function(model: any, position: any) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        
        return {
          suggestions: [
            {
              label: 'print',
              kind: monaco.languages.CompletionItemKind.Function,
              documentation: '打印输出',
              insertText: 'print(${1:value})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'def',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: '定义函数',
              insertText: 'def ${1:function_name}(${2:params}):\n    ${3:# 函数体}\n    return ${4:value}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'if',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: '条件语句',
              insertText: 'if ${1:condition}:\n    ${2:# 条件为真时执行}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'for',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'for 循环',
              insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:# 循环体}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'while',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'while 循环',
              insertText: 'while ${1:condition}:\n    ${2:# 循环体}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'import',
              kind: monaco.languages.CompletionItemKind.Keyword,
              documentation: '导入模块',
              insertText: 'import ${1:module}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'class',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: '定义类',
              insertText: 'class ${1:ClassName}:\n    def __init__(self, ${2:params}):\n        ${3:# 初始化}\n    \n    def ${4:method}(self):\n        ${5:# 方法体}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
            {
              label: 'try',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: '异常处理',
              insertText: 'try:\n    ${1:# 可能出错的代码}\nexcept ${2:Exception} as e:\n    ${3:# 处理异常}\nfinally:\n    ${4:# 总是执行}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
            },
          ],
        };
      },
    });
  }, []);



  const handleDownloadCode = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'code.py';
    link.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, [code]);

  const handleClearCode = useCallback(() => {
    setCode('');
  }, []);

  const editorOptions = getMonacoOptions();

  if (!isMounted) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Python 代码编辑器</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">加载编辑器中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Python 代码编辑器</h2>
        </div>
        <div className="flex items-center gap-2">
          {onToggleTerminal && (
            <Button
              variant={showTerminal ? "default" : "secondary"}
              size="sm"
              onClick={onToggleTerminal}
              className="gap-2"
            >
              <TerminalIcon className="w-4 h-4" />
              终端
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyCode}
            className="gap-2"
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? '已复制' : '复制'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadCode}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            下载
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearCode}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </Button>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={editorOptions}
            theme="vs-dark"
            loading={
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">加载编辑器中...</p>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
