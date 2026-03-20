'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ArrowRightLeft, Download, Play, TestTube, FileCode, GitGraph, FileJson, RefreshCw, Image as ImageIcon, Upload, CheckCircle, XCircle, AlertCircle, Terminal as TerminalIcon } from 'lucide-react';
import FlowchartEditor from '@/components/FlowchartEditor';
import CodeEditor from '@/components/CodeEditor';
import Terminal from '@/components/Terminal';
import { flowToPython } from '@/lib/flowToPython';
import { validateFlowchart, formatValidationResult } from '@/lib/validateFlowchart';
import { TestResult, FlowchartData } from '@/types';
import { toPng } from 'html-to-image';

const defaultInitialNodes: Node[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 20 },
    data: { label: '开始', type: 'start' },
  },
];

const defaultInitialEdges: Edge[] = [];

const FlowCodePlatform: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('flowchart');
  const [nodes, setNodes] = useState<Node[]>(defaultInitialNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultInitialEdges);
  const [pythonCode, setPythonCode] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFlowchartTestPassed, setIsFlowchartTestPassed] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  // 确保只在客户端渲染Tabs等组件
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 终端相关状态
  const [terminalSessionId, setTerminalSessionId] = useState<string>('');
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const terminalRef = useRef<any>(null);

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
    setIsFlowchartTestPassed(false);
  }, []);

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
    setIsFlowchartTestPassed(false);
  }, []);

  const handleConvertToCode = useCallback(async () => {
    if (!isFlowchartTestPassed) {
      alert('请先测试流程图，确保测试通过后再生成代码！');
      setActiveTab('test');
      return;
    }

    setIsConverting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const code = flowToPython(nodes, edges);
      setPythonCode(code);
      setActiveTab('code');
    } catch (error) {
      console.error('转换失败:', error);
    } finally {
      setIsConverting(false);
    }
  }, [nodes, edges, isFlowchartTestPassed]);

  const handleCodeChange = useCallback((code: string) => {
    setPythonCode(code);
  }, []);

  const handleTestFlowchart = useCallback(async () => {
    setIsTesting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const validationResult = validateFlowchart(nodes, edges);
      const formattedOutput = formatValidationResult(validationResult);
      
      const result: TestResult = {
        success: validationResult.isValid,
        output: formattedOutput,
        timestamp: new Date(),
      };
      
      setTestResults(prev => [result, ...prev].slice(0, 10));
      setIsFlowchartTestPassed(validationResult.isValid);
      setActiveTab('test');
    } catch (error) {
      const result: TestResult = {
        success: false,
        output: '测试失败',
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date(),
      };
      
      setTestResults(prev => [result, ...prev].slice(0, 10));
      setIsFlowchartTestPassed(false);
    } finally {
      setIsTesting(false);
    }
  }, [nodes, edges]);

  // 终端执行代码
  const handleTerminalStart = useCallback(async () => {
    if (!pythonCode) return;
    
    // 清空终端
    if (terminalRef.current?.clearTerminal) {
      terminalRef.current.clearTerminal();
    }

    // 显示终端
    setShowTerminal(true);

    try {
      const response = await fetch('/api/execute-interactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: pythonCode }),
      });

      if (!response.ok) {
        throw new Error('启动执行失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      setIsRunning(true);

      // 读取SSE流
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handleTerminalEvent(data);
                } catch (e) {
                  console.error('解析SSE数据失败:', e);
                }
              }
            }
          }
        } catch (e) {
          console.error('读取流失败:', e);
        }
      };

      readStream();

    } catch (error) {
      console.error('启动终端执行失败:', error);
      if (terminalRef.current?.addOutput) {
        terminalRef.current.addOutput(`错误: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      }
      setIsRunning(false);
    }
  }, [pythonCode]);

  // 处理终端事件
  const handleTerminalEvent = useCallback((event: any) => {
    if (!terminalRef.current) return;

    switch (event.type) {
      case 'start':
        setTerminalSessionId(event.sessionId);
        terminalRef.current.addOutput('>>> 开始执行代码...\n', 'system');
        break;
      case 'output':
        terminalRef.current.addOutput(event.content, 'output');
        break;
      case 'error':
        terminalRef.current.addOutput(event.content, 'error');
        break;
      case 'exit':
        terminalRef.current.addOutput(`\n>>> 执行完成 (退出码: ${event.code})`, 'system');
        setIsRunning(false);
        setTerminalSessionId('');
        break;
    }
  }, []);

  // 停止终端执行
  const handleTerminalStop = useCallback(async () => {
    if (terminalSessionId) {
      try {
        await fetch(`/api/execute-interactive?sessionId=${terminalSessionId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('停止执行失败:', error);
      }
    }
  }, [terminalSessionId]);

  // 发送输入到终端
  const handleTerminalInput = useCallback(async (input: string) => {
    if (terminalSessionId) {
      try {
        await fetch('/api/execute-interactive', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: terminalSessionId, input }),
        });
      } catch (error) {
        console.error('发送输入失败:', error);
      }
    }
  }, [terminalSessionId]);

  const handleExportFlowchart = useCallback(() => {
    const data: FlowchartData = {
      nodes: nodes,
      edges: edges,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowchart.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleExportCode = useCallback(() => {
    const blob = new Blob([pythonCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'generated_code.py';
    link.click();
    URL.revokeObjectURL(url);
  }, [pythonCode]);

  const handleImportFlowchart = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('没有选择文件');
      return;
    }

    console.log('开始导入文件:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as FlowchartData;
        console.log('解析的数据:', data);
        
        if (data.nodes && Array.isArray(data.nodes)) {
          console.log('设置节点:', data.nodes.length);
          setNodes(data.nodes);
        } else {
          console.error('无效的节点数据');
        }
        
        if (data.edges && Array.isArray(data.edges)) {
          console.log('设置连接线:', data.edges.length);
          const edgesWithControlPoints = data.edges.map((edge: Edge) => ({
            ...edge,
          }));
          setEdges(edgesWithControlPoints);
        } else {
          console.error('无效的连接线数据');
        }
        
        setIsFlowchartTestPassed(false);
        console.log('导入成功');
        
        // 重置input的值，允许连续导入相同文件
        event.target.value = '';
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
        // 出错时也要重置input
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }, []);

  const handleExportPng = useCallback(async () => {
    const element = document.getElementById('flowchart-container');
    if (!element) {
      alert('无法找到流程图容器');
      return;
    }

    // 保存所有需要恢复的样式
    const savedStyles: Array<{ element: HTMLElement; originalStyle: string }> = [];
    
    try {
      // 1. 隐藏缩略图
      const miniMap = element.querySelector('.react-flow__minimap') as HTMLElement;
      if (miniMap) {
        savedStyles.push({ element: miniMap, originalStyle: miniMap.style.cssText });
        miniMap.style.display = 'none';
      }

      // 2. 隐藏控制按钮
      const controls = element.querySelector('.react-flow__controls') as HTMLElement;
      if (controls) {
        savedStyles.push({ element: controls, originalStyle: controls.style.cssText });
        controls.style.display = 'none';
      }

      // 3. 隐藏背景网格
      const background = element.querySelector('.react-flow__background') as HTMLElement;
      if (background) {
        savedStyles.push({ element: background, originalStyle: background.style.cssText });
        background.style.display = 'none';
      }

      // 4. 隐藏节点手柄
      const handles = element.querySelectorAll('.react-flow__handle');
      handles.forEach((handle) => {
        const handleEl = handle as HTMLElement;
        savedStyles.push({ element: handleEl, originalStyle: handleEl.style.cssText });
        handleEl.style.display = 'none';
      });

      // 5. 隐藏选择框
      const selection = element.querySelector('.react-flow__selection') as HTMLElement;
      if (selection) {
        savedStyles.push({ element: selection, originalStyle: selection.style.cssText });
        selection.style.display = 'none';
      }

      // 6. 处理连接线 - 移除动画并确保可见
      const edges = element.querySelectorAll('.react-flow__edge');
      edges.forEach((edge) => {
        const edgeEl = edge as HTMLElement;
        savedStyles.push({ element: edgeEl, originalStyle: edgeEl.style.cssText });
        
        // 移除连接线的动画
        edgeEl.style.animation = 'none';
        edgeEl.style.transition = 'none';
        edgeEl.style.opacity = '1';
        edgeEl.style.visibility = 'visible';
        
        // 处理连接线中的path元素
        const paths = edgeEl.querySelectorAll('path');
        paths.forEach((path) => {
          const pathEl = path as unknown as HTMLElement;
          savedStyles.push({ element: pathEl, originalStyle: pathEl.style.cssText });
          
          // 确保实线显示
          pathEl.style.strokeDasharray = 'none';
          pathEl.style.animation = 'none';
          pathEl.style.opacity = '1';
          pathEl.style.visibility = 'visible';
        });
      });

      // 等待所有样式生效
      await new Promise(resolve => setTimeout(resolve, 300));

      // 导出PNG
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = 'flowchart.png';
      link.href = dataUrl;
      link.click();
      
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      // 恢复所有原始样式
      savedStyles.forEach(({ element, originalStyle }) => {
        element.style.cssText = originalStyle;
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('确定要重置所有内容吗？这将清除当前的流程图和代码。')) {
      setNodes(defaultInitialNodes);
      setEdges(defaultInitialEdges);
      setPythonCode('');
      setTestResults([]);
      setIsFlowchartTestPassed(false);
      setActiveTab('flowchart');
    }
  }, []);

  const stats = useMemo(() => {
    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      codeLines: pythonCode.split('\n').length,
      testCount: testResults.length,
    };
  }, [nodes, edges, pythonCode, testResults]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitGraph className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                FlowCode Platform
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              流程图设计、测试与代码生成平台
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r bg-white dark:bg-gray-800 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                快速操作
              </h3>
              <div className="space-y-2">
                <Button 
                  onClick={handleConvertToCode}
                  disabled={isConverting || nodes.length === 0}
                  className="w-full justify-start"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {isConverting ? '转换中...' : '转换为代码'}
                </Button>
                {isFlowchartTestPassed && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 ml-6">
                    <CheckCircle className="w-4 h-4" />
                    <span>流程图测试已通过</span>
                  </div>
                )}
                {!isFlowchartTestPassed && nodes.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 ml-6">
                    <AlertCircle className="w-4 h-4" />
                    <span>需要先测试流程图</span>
                  </div>
                )}
                
                <Button 
                  onClick={handleTestFlowchart}
                  disabled={isTesting || nodes.length === 0}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {isTesting ? '测试中...' : '测试流程图'}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                导出选项
              </h3>
              <div className="space-y-2">
                <Button 
                  onClick={handleExportFlowchart}
                  disabled={nodes.length === 0}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  导出流程图
                </Button>
                
                <Button 
                  onClick={handleExportCode}
                  disabled={!pythonCode}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  导出代码
                </Button>

                <Button 
                  onClick={handleExportPng}
                  disabled={nodes.length === 0}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  导出PNG
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                导入选项
              </h3>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFlowchart}
                  className="hidden"
                  id="import-flowchart"
                />
                <Button 
                  onClick={() => document.getElementById('import-flowchart')?.click()}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  导入流程图
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                项目统计
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">节点数:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.nodeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">连接数:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.edgeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">代码行数:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.codeLines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">测试次数:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.testCount}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {!isClient ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-6 bg-white dark:bg-gray-800">
              <TabsList className="h-14">
                <TabsTrigger value="flowchart" className="gap-2">
                  <GitGraph className="w-4 h-4" />
                  流程图编辑器
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <FileCode className="w-4 h-4" />
                  代码编辑器
                </TabsTrigger>
                <TabsTrigger value="test" className="gap-2">
                  <TestTube className="w-4 h-4" />
                  测试面板
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="flowchart" className="flex-1 p-0 m-0 overflow-hidden" suppressHydrationWarning>
              <FlowchartEditor 
                initialNodes={nodes}
                initialEdges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-0 m-0 overflow-hidden flex-col" suppressHydrationWarning>
              <div className="flex flex-col h-full">
                {/* 代码编辑器区域 */}
                <div className={showTerminal ? "flex-1 min-h-0" : "flex-1"}>
                  <CodeEditor 
                    initialCode={pythonCode}
                    onCodeChange={handleCodeChange}
                    isRunning={isRunning}
                    showTerminal={showTerminal}
                    onToggleTerminal={() => setShowTerminal(!showTerminal)}
                  />
                </div>
                
                {/* 终端区域 */}
                {showTerminal && (
                  <div className="h-1/2 border-t bg-gray-900 min-h-[200px]">
                    <Terminal
                      ref={terminalRef}
                      isRunning={isRunning}
                      onStart={handleTerminalStart}
                      onStop={handleTerminalStop}
                      onRestart={handleTerminalStart}
                      onInput={handleTerminalInput}
                      title="Python 终端"
                      showControls={true}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="test" className="flex-1 p-6 m-0 overflow-hidden flex flex-col" suppressHydrationWarning>
              <div className="w-full space-y-4 flex-1 flex flex-col">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      测试控制面板
                    </CardTitle>
                    <CardDescription>
                      测试你的流程图和代码，在终端中查看执行结果
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={handleTestFlowchart}
                        disabled={isTesting || nodes.length === 0}
                        className="gap-2"
                      >
                        <GitGraph className="w-4 h-4" />
                        {isTesting ? '测试中...' : '测试流程图'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 测试结果历史 */}
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>测试结果历史</CardTitle>
                    <CardDescription>
                      最近的测试结果（最多显示10条）
                    </CardDescription>
                  </CardHeader>
                  <div className="border-t">
                    <div className="p-4">
                      {testResults.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p>还没有测试结果</p>
                        </div>
                      ) : (
                        <Card className={`border-l-4 ${testResults[currentPage].success ? 'border-l-green-500' : 'border-l-red-500'} w-full`}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-medium ${testResults[currentPage].success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResults[currentPage].success ? '✓ 测试通过' : '✗ 测试失败'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {testResults[currentPage].timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto whitespace-pre-wrap max-h-48">
                              {testResults[currentPage].output}
                              {testResults[currentPage].error && (
                                <span className="text-red-500 block mt-2">
                                  错误: {testResults[currentPage].error}
                                </span>
                              )}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    {testResults.length > 1 && (
                      <div className="border-t p-4 flex justify-between items-center">
                        <Button 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
                          disabled={currentPage === 0}
                          variant="outline"
                          size="sm"
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-gray-500">
                          第 {currentPage + 1} 页，共 {testResults.length} 页
                        </span>
                        <Button 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, testResults.length - 1))}
                          disabled={currentPage === testResults.length - 1}
                          variant="outline"
                          size="sm"
                        >
                          下一页
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </main>
      </div>
    </div>
  );
};

export default FlowCodePlatform;
