export type NodeType = 'start' | 'end' | 'process' | 'decision' | 'singleBranch' | 'input' | 'output' | 'loop' | 'function';

export interface FlowNodeData {
  label: string;
  type: NodeType;
  code?: string;
  condition?: string;
  inputs?: string[];
  outputs?: string[];
  variableName?: string;
  variableValue?: string;
  outputVariable?: string;
  loopCondition?: string;
  loopVariable?: string;
  loopBody?: string;
  inputVariables?: Array<{ name: string; type: string }>;
  outputVariables?: string[];
}

export interface FlowchartData {
  nodes: any[];
  edges: any[];
}

export interface TestResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: Date;
}

export interface AppState {
  activeTab: 'flowchart' | 'code' | 'test';
  flowchartData: FlowchartData;
  pythonCode: string;
  testResults: TestResult[];
  isExecuting: boolean;
}

export interface Variable {
  name: string;
  type: string;
  value?: string;
  sourceNodeId: string;
}
