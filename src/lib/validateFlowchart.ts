import { Node, Edge } from 'reactflow';
import { FlowNodeData } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFlowchart(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (nodes.length === 0) {
    errors.push('流程图为空，请添加节点');
    return { isValid: false, errors, warnings };
  }

  const startNodes = nodes.filter(n => (n.data as FlowNodeData).type === 'start');
  const endNodes = nodes.filter(n => (n.data as FlowNodeData).type === 'end');

  if (startNodes.length === 0) {
    errors.push('缺少开始节点，请添加一个开始节点');
  } else if (startNodes.length > 1) {
    warnings.push('存在多个开始节点，建议只保留一个');
  }

  if (endNodes.length === 0) {
    errors.push('缺少结束节点，请添加一个结束节点');
  } else if (endNodes.length > 1) {
    warnings.push('存在多个结束节点，建议只保留一个');
  }

  if (startNodes.length > 0 && endNodes.length > 0) {
    const connectivityResult = checkConnectivity(nodes, edges);
    if (!connectivityResult.isConnected) {
      errors.push('流程图不是连通图，存在未连接的节点');
      errors.push(`未连接的节点: ${connectivityResult.unreachableNodes.join(', ')}`);
    }

    if (connectivityResult.hasDeadEnds) {
      warnings.push('存在死胡同节点（没有后续连接的节点）');
      warnings.push(`死胡同节点: ${connectivityResult.deadEndNodes.join(', ')}`);
    }
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}

function checkConnectivity(nodes: Node[], edges: Edge[]): {
  isConnected: boolean;
  unreachableNodes: string[];
  hasDeadEnds: boolean;
  deadEndNodes: string[];
} {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, string[]>();

  nodes.forEach(node => {
    adjacency.set(node.id, []);
  });

  edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target);
  });

  const startNodes = nodes.filter(n => (n.data as FlowNodeData).type === 'start');
  
  if (startNodes.length === 0) {
    return {
      isConnected: false,
      unreachableNodes: nodes.map(n => n.id),
      hasDeadEnds: false,
      deadEndNodes: []
    };
  }

  const visited = new Set<string>();
  const queue: string[] = [startNodes[0].id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }

  const unreachableNodes = nodes
    .filter(n => !visited.has(n.id))
    .map(n => n.id);

  const deadEndNodes: string[] = [];
  nodes.forEach(node => {
    const nodeData = node.data as FlowNodeData;
    if (nodeData.type !== 'end' && nodeData.type !== 'decision' && nodeData.type !== 'loop') {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      if (outgoingEdges.length === 0) {
        deadEndNodes.push(node.id);
      }
    }
  });

  return {
    isConnected: unreachableNodes.length === 0,
    unreachableNodes,
    hasDeadEnds: deadEndNodes.length > 0,
    deadEndNodes
  };
}

export function formatValidationResult(result: ValidationResult): string {
  let output = '>>> 流程图验证结果\n\n';

  if (result.isValid) {
    output += '✓ 验证通过！\n\n';
  } else {
    output += '✗ 验证失败\n\n';
  }

  if (result.errors.length > 0) {
    output += '错误:\n';
    result.errors.forEach((error, index) => {
      output += `  ${index + 1}. ${error}\n`;
    });
    output += '\n';
  }

  if (result.warnings.length > 0) {
    output += '警告:\n';
    result.warnings.forEach((warning, index) => {
      output += `  ${index + 1}. ${warning}\n`;
    });
    output += '\n';
  }

  if (result.isValid && result.warnings.length === 0) {
    output += '流程图结构完整，可以正常转换为代码。';
  }

  return output;
}
