'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Play, Square, RotateCcw, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'output' | 'error' | 'input' | 'prompt' | 'system';
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  isRunning?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onInput?: (input: string) => void;
  title?: string;
  showControls?: boolean;
}

interface TerminalRef {
  addOutput: (content: string, type?: 'output' | 'error' | 'system') => void;
  clearTerminal: () => void;
}

const Terminal = React.forwardRef<TerminalRef, TerminalProps>(({
  isRunning = false,
  onStart,
  onStop,
  onRestart,
  onInput,
  title = '终端',
  showControls = true
}, ref) => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [lines, isWaitingForInput]);

  // 当等待输入时，自动聚焦输入框
  useEffect(() => {
    if (isWaitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWaitingForInput]);

  // 添加输出行
  const addOutput = useCallback((content: string, type: 'output' | 'error' | 'system' = 'output') => {
    const newLine: TerminalLine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date()
    };
    setLines(prev => [...prev, newLine]);
  }, []);

  // 等待用户输入
  const waitForInput = useCallback(() => {
    setIsWaitingForInput(true);
    setInputValue('');
  }, []);

  // 当运行状态变化时，如果正在运行，就显示输入框
  useEffect(() => {
    if (isRunning) {
      setIsWaitingForInput(true);
    } else {
      setIsWaitingForInput(false);
    }
  }, [isRunning]);

  // 处理用户输入提交
  const handleInputSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (isWaitingForInput && onInput) {
      const input = inputValue;
      
      // 显示用户输入
      const inputLine: TerminalLine = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'input',
        content: input,
        timestamp: new Date()
      };
      setLines(prev => [...prev, inputLine]);
      
      // 发送输入
      onInput(input);
      
      // 重置状态
      setIsWaitingForInput(false);
      setInputValue('');
    }
  }, [isWaitingForInput, inputValue, onInput]);

  // 清空终端
  const clearTerminal = useCallback(() => {
    setLines([]);
    setIsWaitingForInput(false);
    setInputValue('');
  }, []);

  // 获取行的样式类
  const getLineClassName = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'input':
        return 'text-green-400';
      case 'system':
        return 'text-blue-400';
      case 'prompt':
        return 'text-yellow-400';
      default:
        return 'text-gray-200';
    }
  };

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    addOutput,
    waitForInput,
    clearTerminal
  }), [addOutput, waitForInput, clearTerminal]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* 终端头部 */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            {!isRunning ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onStart}
                className="h-7 px-2 text-gray-400 hover:text-white"
              >
                <Play className="w-4 h-4 mr-1" />
                运行
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onStop}
                className="h-7 px-2 text-gray-400 hover:text-white"
              >
                <Square className="w-4 h-4 mr-1" />
                停止
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRestart}
              className="h-7 px-2 text-gray-400 hover:text-white"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              重运行
            </Button>

          </div>
        </div>
      )}

      {/* 终端内容 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 font-mono text-sm">
        <div className="space-y-0.5">
          {lines.map((line) => (
            <div 
              key={line.id} 
              className={`break-all whitespace-pre-wrap leading-relaxed ${getLineClassName(line.type)}`}
            >
              {line.content}
            </div>
          ))}
          
          {/* 等待输入时显示输入框 */}
          {isWaitingForInput && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">&gt; </span>
              <form onSubmit={handleInputSubmit} className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-green-400 w-full p-0"
                  autoFocus
                />
              </form>
            </div>
          )}
          
          {/* 如果没有内容且不在等待输入，显示提示 */}
          {lines.length === 0 && !isWaitingForInput && (
            <div className="text-gray-500 italic">
              终端已就绪。
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
