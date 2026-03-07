import { Node, Edge } from 'reactflow';
import { FlowNodeData } from '@/types';

export function flowToPython(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return `# 流程图为空
# 请在左侧添加节点来创建流程图`;
  }

  const sortedNodes = topologicalSort(nodes, edges);

  let code = `def main():\n`;
  code += generateMainCode(sortedNodes, edges);
  code += `\n\nif __name__ == "__main__":\n    main()`;

  return code;
}

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const inDegree = new Map(nodes.map(node => [node.id, 0]));
  const adjacency = new Map(nodes.map(node => [node.id, [] as string[]]));

  edges.forEach(edge => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  const result: Node[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }
    
    adjacency.get(nodeId)?.forEach(neighbor => {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }

  return result.length === nodes.length ? result : nodes;
}

function generateMainCode(nodes: Node[], edges: Edge[]): string {
  const startNode = nodes.find(n => (n.data as FlowNodeData).type === 'start');
  
  if (!startNode) {
    return `    pass`;
  }

  const result = generateNodeCode(startNode.id, nodes, edges, 1, new Set(), new Set());
  return result.code;
}

function generateNodeCode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  indentLevel: number,
  visited: Set<string>,
  loopGenerated?: Set<string>
): { code: string; varName: string } {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return { code: '', varName: '' };
  }

  const data = node.data as FlowNodeData;
  
  if (visited.has(nodeId)) {
    if (data.type === 'loop' && loopGenerated && loopGenerated.has(nodeId)) {
      return { code: '', varName: '' };
    }
    if (data.type !== 'loop') {
      return { code: '', varName: '' };
    }
  }
  
  visited.add(nodeId);
  
  const indent = '    '.repeat(indentLevel);
  let code = '';
  let varName = '';

  switch (data.type) {
    case 'start':
      code = `${indent}# 开始\n`;
      varName = 'None';
      break;

    case 'end':
      code = `${indent}# 结束\n`;
      varName = 'None';
      break;

    case 'input':
      if (data.inputVariables && data.inputVariables.length > 0) {
        data.inputVariables.forEach(variable => {
          const varName = variable.name?.trim() || 'x';
          const varValue = variable.value || 'None';
          code += `${indent}${varName} = ${varValue}\n`;
        });
        varName = data.inputVariables[0].name?.trim() || 'x';
      } else {
        varName = data.variableName?.trim() || 'x';
        const varValue = data.variableValue || 'None';
        code = `${indent}${varName} = ${varValue}\n`;
      }
      break;

    case 'process':
      let processCode = data.code || 'result = data';
      let match = processCode.match(/^(\w+)\s*=/);
      if (match) {
        varName = match[1];
      } else {
        processCode = 'result = ' + processCode;
        varName = 'result';
      }
      code = `${indent}${processCode}\n`;
      break;

    case 'output':
      if (data.outputVariables && data.outputVariables.length > 0) {
        const validVariables = data.outputVariables.filter(v => v && v.trim() !== '');
        if (validVariables.length > 0) {
          if (validVariables.length === 1) {
            code = `${indent}print(f"${validVariables[0]}={${validVariables[0]}}")\n`;
          } else {
            const formattedVars = validVariables.map(v => `f"${v}={${v}}"`).join(', ');
            code = `${indent}print(${formattedVars})\n`;
          }
          varName = validVariables[0];
        } else {
          varName = data.outputVariable?.trim() || 'x';
          code = `${indent}print(f"${varName}={${varName}}")\n`;
        }
      } else {
        varName = data.outputVariable?.trim() || 'x';
        code = `${indent}print(f"${varName}={${varName}}")\n`;
      }
      break;

    case 'decision':
      const condition = data.condition || 'True';
      const trueEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'left');
      const falseEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'right');

      code = `${indent}if ${condition}:\n`;
      if (trueEdges.length > 0) {
        const trueResult = generateNodeCode(trueEdges[0].target, nodes, edges, indentLevel + 1, new Set(visited), new Set(loopGenerated));
        code += trueResult.code;
        varName = trueResult.varName;
      } else {
        code += `${indent}    pass\n`;
      }

      code += `${indent}else:\n`;
      if (falseEdges.length > 0) {
        const falseResult = generateNodeCode(falseEdges[0].target, nodes, edges, indentLevel + 1, new Set(visited), new Set(loopGenerated));
        code += falseResult.code;
      } else {
        code += `${indent}    pass\n`;
      }
      break;

    case 'loop':
      const loopCond = data.loopCondition || 'True';
      const loopTrueEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'bottom');
      const loopFalseEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'right');

      code = `${indent}while ${loopCond}:\n`;
      if (loopTrueEdges.length > 0) {
        const loopVisited = new Set(visited);
        loopVisited.add(nodeId);
        const newLoopGenerated = new Set(loopGenerated);
        newLoopGenerated.add(nodeId);
        const trueResult = generateNodeCode(loopTrueEdges[0].target, nodes, edges, indentLevel + 1, loopVisited, newLoopGenerated);
        code += trueResult.code;
        varName = trueResult.varName;
      } else {
        code += `${indent}    pass\n`;
      }

      if (loopFalseEdges.length > 0) {
        const falseResult = generateNodeCode(loopFalseEdges[0].target, nodes, edges, indentLevel, new Set(visited), new Set(loopGenerated));
        code += falseResult.code;
      }
      break;
  }

  const outputEdges = edges.filter(e => e.source === nodeId && !e.sourceHandle);
  if (outputEdges.length > 0 && data.type !== 'decision' && data.type !== 'loop') {
    const nextResult = generateNodeCode(outputEdges[0].target, nodes, edges, indentLevel, visited, new Set(loopGenerated));
    code += nextResult.code;
  }

  return { code, varName };
}
