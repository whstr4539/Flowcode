'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Node, Edge, MarkerType } from 'reactflow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Download, Play, TestTube, FileCode, GitGraph, FileJson, RefreshCw, Image as ImageIcon, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import FlowchartEditor from '@/components/FlowchartEditor';
import CodeEditor from '@/components/CodeEditor';
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

  const handleRunCode = useCallback(async (code: string) => {
    setIsRunning(true);
    
    try {
      let data;
      
      if (typeof window !== 'undefined' && window.electronAPI) {
        data = await window.electronAPI.executePython(code);
      } else {
        const response = await fetch('/api/execute-python', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });
        data = await response.json();
      }
      
      const result: TestResult = {
        success: data.success,
        output: data.success 
          ? `>>> 执行代码...\n${data.output}`
          : `>>> 执行失败`,
        error: data.error,
        timestamp: new Date(),
      };
      
      setTestResults(prev => [result, ...prev].slice(0, 10));
    } catch (error) {
      const result: TestResult = {
        success: false,
        output: '执行失败',
        error: error instanceof Error ? error.message : '网络错误，请稍后重试',
        timestamp: new Date(),
      };
      
      setTestResults(prev => [result, ...prev].slice(0, 10));
    } finally {
      setIsRunning(false);
    }
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
            type: 'controlpoint',
            data: {
              ...edge.data,
              controlPoints: edge.data?.controlPoints,
            },
          }));
          setEdges(edgesWithControlPoints);
        } else {
          console.error('无效的连接线数据');
        }
        
        setPythonCode('');
        setTestResults([]);
        setIsFlowchartTestPassed(false);
        setActiveTab('flowchart');
        alert('导入成功！');
      } catch (err) {
        console.error('导入失败:', err);
        alert('导入失败，请确保文件格式正确');
      }
    };
    
    reader.onerror = () => {
      console.error('文件读取失败');
      alert('文件读取失败');
    };
    
    reader.readAsText(file);
    
    event.target.value = '';
  }, [setNodes, setEdges]);

  const handleExportPng = useCallback(async () => {
    const flowContainer = document.querySelector('.react-flow') as HTMLElement;
    if (!flowContainer) {
      alert('未找到流程图');
      return;
    }

    try {
      const edges = flowContainer.querySelectorAll('.react-flow__edge-path');
      const originalStyles: Array<{ 
        element: SVGPathElement; 
        strokeDasharray: string; 
        animation: string;
        stroke: string;
        strokeWidth: string;
      }> = [];
      
      edges.forEach(edge => {
        const path = edge as SVGPathElement;
        originalStyles.push({
          element: path,
          strokeDasharray: path.style.strokeDasharray || '',
          animation: path.style.animation || '',
          stroke: path.style.stroke || '',
          strokeWidth: path.style.strokeWidth || '',
        });
        path.style.strokeDasharray = 'none';
        path.style.animation = 'none';
        path.style.stroke = '#b1b1b7';
        path.style.strokeWidth = '2';
      });

      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args[0]?.toString() || '';
        if (errorMessage.includes('cssRules') && errorMessage.includes('CSSStyleSheet')) {
          return;
        }
        originalConsoleError.apply(console, args);
      };

      const dataUrl = await toPng(flowContainer, {
        width: flowContainer.offsetWidth,
        height: flowContainer.offsetHeight,
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node) => {
          const className = typeof node.className === 'string' ? node.className : String(node.className || '');
          return !className.includes('react-flow__minimap') && 
                 !className.includes('react-flow__controls') &&
                 !className.includes('react-flow__attribution') &&
                 !className.includes('react-flow__edge-label-renderer') &&
                 !className.includes('control-point-export-hidden');
        },
      });

      console.error = originalConsoleError;

      originalStyles.forEach(({ element, strokeDasharray, animation, stroke, strokeWidth }) => {
        element.style.strokeDasharray = strokeDasharray;
        element.style.animation = animation;
        element.style.stroke = stroke;
        element.style.strokeWidth = strokeWidth;
      });

      const link = document.createElement('a');
      link.download = 'flowchart.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
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

            <TabsContent value="flowchart" className="flex-1 p-0 m-0 overflow-hidden">
              <FlowchartEditor 
                initialNodes={nodes}
                initialEdges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-0 m-0 overflow-hidden">
              <CodeEditor 
                initialCode={pythonCode}
                onCodeChange={handleCodeChange}
                onRunCode={handleRunCode}
                isRunning={isRunning}
              />
            </TabsContent>

            <TabsContent value="test" className="flex-1 p-6 m-0 overflow-hidden flex flex-col">
              <div className="w-full space-y-6 flex-1 flex flex-col">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      测试控制面板
                    </CardTitle>
                    <CardDescription>
                      测试你的流程图和代码，查看执行结果
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
                      
                      <Button 
                        onClick={() => handleRunCode(pythonCode)}
                        disabled={isRunning || !pythonCode}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {isRunning ? '运行中...' : '运行代码'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col min-h-0 w-full">
                  <CardHeader>
                    <CardTitle>测试结果历史</CardTitle>
                    <CardDescription>
                      最近的测试结果（最多显示10条）
                    </CardDescription>
                  </CardHeader>
                  <div className="flex-1 flex flex-col border-t">
                    <div className="flex-1 p-4 flex items-center justify-center">
                      {testResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>还没有测试结果</p>
                          <p className="text-sm">点击上方按钮开始测试</p>
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
        </main>
      </div>
    </div>
  );
};

export default FlowCodePlatform;
