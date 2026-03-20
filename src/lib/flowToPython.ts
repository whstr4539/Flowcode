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
          const varType = (variable as any).type || 'str';
          
          // 根据类型生成对应的输入语句
          switch (varType) {
            case 'str':
              code += `${indent}${varName} = input("请输入${varName}: ")\n`;
              break;
            case 'int':
              code += `${indent}${varName} = int(input("请输入${varName}(整数): "))\n`;
              break;
            case 'float':
              code += `${indent}${varName} = float(input("请输入${varName}(浮点数): "))\n`;
              break;
            case 'bool':
              code += `${indent}${varName} = input("请输入${varName}(True/False): ").lower() in ['true', '1', 'yes']\n`;
              break;
            case 'list':
              code += `${indent}${varName} = input("请输入${varName}(逗号分隔): ").split(',')\n`;
              code += `${indent}${varName} = [x.strip() for x in ${varName}]\n`;
              break;
            case 'dict':
              code += `${indent}import ast\n`;
              code += `${indent}${varName} = ast.literal_eval(input("请输入${varName}(字典格式): "))\n`;
              break;
            default:
              code += `${indent}${varName} = input("请输入${varName}: ")\n`;
          }
        });
        varName = data.inputVariables[0].name?.trim() || 'x';
      } else {
        varName = data.variableName?.trim() || 'x';
        code = `${indent}${varName} = input("请输入${varName}: ")\n`;
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

    case 'singleBranch':
      const singleBranchCondition = data.condition || 'True';
      // 是连接点在右边 (right)，否连接点在下方 (bottom)
      const singleBranchTrueEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'right');
      const singleBranchFalseEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'bottom');

      code = `${indent}if ${singleBranchCondition}:\n`;
      if (singleBranchTrueEdges.length > 0) {
        const singleBranchTrueResult = generateNodeCode(singleBranchTrueEdges[0].target, nodes, edges, indentLevel + 1, new Set(visited), new Set(loopGenerated));
        code += singleBranchTrueResult.code;
        varName = singleBranchTrueResult.varName;
      } else {
        code += `${indent}    pass\n`;
      }

      // 处理否分支，使用相同的缩进级别
      if (singleBranchFalseEdges.length > 0) {
        const singleBranchFalseResult = generateNodeCode(singleBranchFalseEdges[0].target, nodes, edges, indentLevel, new Set(visited), new Set(loopGenerated));
        code += singleBranchFalseResult.code;
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
  if (outputEdges.length > 0 && data.type !== 'decision' && data.type !== 'singleBranch' && data.type !== 'loop') {
    const nextResult = generateNodeCode(outputEdges[0].target, nodes, edges, indentLevel, visited, new Set(loopGenerated));
    code += nextResult.code;
  }

  return { code, varName };
}
