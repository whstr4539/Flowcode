'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  Node,
  Edge,
  Connection,
  useUpdateNodeInternals,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FlowNodeData, NodeType } from '@/types';

interface ControlPointEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: React.CSSProperties;
  markerEnd?: any;
  selected?: boolean;
  data?: {
    controlPoints?: { x: number; y: number }[];
  };
}

const ControlPointEdge: React.FC<ControlPointEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) => {
  const { setEdges, project, getNodes } = useReactFlow();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [guideLines, setGuideLines] = useState<{ horizontal: number | null; vertical: number | null }>({ horizontal: null, vertical: null });
  const SNAP_THRESHOLD = 8;
  
  if (typeof sourceX !== 'number' || typeof targetX !== 'number') {
    return <BaseEdge path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} markerEnd={markerEnd} style={style} />;
  }
  
  const edgeControlPoints = data?.controlPoints;
  const hasControlPoints = edgeControlPoints && edgeControlPoints.length > 0;
  
  let controlPoints = hasControlPoints ? edgeControlPoints : [];
  
  if (!hasControlPoints) {
    controlPoints = [
      { x: sourceX + (targetX - sourceX) * 0.25, y: sourceY + (targetY - sourceY) * 0.25 },
      { x: sourceX + (targetX - sourceX) * 0.5, y: sourceY + (targetY - sourceY) * 0.5 },
      { x: sourceX + (targetX - sourceX) * 0.75, y: sourceY + (targetY - sourceY) * 0.75 },
    ];
  }
  
  const getEdgePath = () => {
    if (!controlPoints || !Array.isArray(controlPoints)) {
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    if (controlPoints.length === 0) {
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    let path = `M ${sourceX} ${sourceY}`;
    for (const point of controlPoints) {
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
        continue;
      }
      path += ` L ${point.x} ${point.y}`;
    }
    path += ` L ${targetX} ${targetY}`;
    return path;
  };

  const edgePath = getEdgePath();

  if (!controlPoints) {
    return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
  }

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
    
    const nodes = getNodes();
    const allPoints: { x: number; y: number }[] = [];
    
    nodes.forEach(node => {
      allPoints.push({ x: node.position.x, y: node.position.y });
      allPoints.push({ x: node.position.x + (node.width || 120), y: node.position.y });
      allPoints.push({ x: node.position.x, y: node.position.y + (node.height || 60) });
      allPoints.push({ x: node.position.x + (node.width || 120), y: node.position.y + (node.height || 60) });
    });
    
    if (controlPoints) {
      controlPoints.forEach((point, i) => {
        if (i !== index) {
          allPoints.push(point);
        }
      });
    }
    
    allPoints.push({ x: sourceX, y: sourceY });
    allPoints.push({ x: targetX, y: targetY });
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const reactFlowEl = document.querySelector('.react-flow');
      if (!reactFlowEl) return;
      
      const rect = reactFlowEl.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const y = moveEvent.clientY - rect.top;
      
      const projected = project({ x, y });
      
      let snappedX = projected.x;
      let snappedY = projected.y;
      let horizontalGuide: number | null = null;
      let verticalGuide: number | null = null;
      
      for (const point of allPoints) {
        if (Math.abs(point.y - projected.y) < SNAP_THRESHOLD) {
          snappedY = point.y;
          horizontalGuide = point.y;
        }
        if (Math.abs(point.x - projected.x) < SNAP_THRESHOLD) {
          snappedX = point.x;
          verticalGuide = point.x;
        }
      }
      
      setGuideLines({ horizontal: horizontalGuide, vertical: verticalGuide });
      
      setEdges((eds) => eds.map((edge) => {
        if (edge.id !== id) return edge;
        let existingPoints = edge.data?.controlPoints;
        if (!existingPoints || !Array.isArray(existingPoints) || existingPoints.length < 3) {
          existingPoints = [
            { x: sourceX + (targetX - sourceX) * 0.25, y: sourceY + (targetY - sourceY) * 0.25 },
            { x: sourceX + (targetX - sourceX) * 0.5, y: sourceY + (targetY - sourceY) * 0.5 },
            { x: sourceX + (targetX - sourceX) * 0.75, y: sourceY + (targetY - sourceY) * 0.75 },
          ];
        }
        const newPoints = [...existingPoints];
        newPoints[index] = { x: snappedX, y: snappedY };
        return {
          ...edge,
          data: { ...edge.data, controlPoints: newPoints },
        };
      }));
    };
    
    const onMouseUp = () => {
      setDraggingIndex(null);
      setGuideLines({ horizontal: null, vertical: null });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        {selected && guideLines.horizontal !== null && (
          <div
            className="control-point-export-hidden"
            style={{
              position: 'absolute',
              left: 0,
              top: `${guideLines.horizontal}px`,
              width: '100%',
              height: 1,
              backgroundColor: '#ef4444',
              pointerEvents: 'none',
              zIndex: 999,
              opacity: 0.7,
            }}
          />
        )}
        {selected && guideLines.vertical !== null && (
          <div
            className="control-point-export-hidden"
            style={{
              position: 'absolute',
              left: `${guideLines.vertical}px`,
              top: 0,
              width: 1,
              height: '100%',
              backgroundColor: '#ef4444',
              pointerEvents: 'none',
              zIndex: 999,
              opacity: 0.7,
            }}
          />
        )}
        {selected && controlPoints.map((point, index) => {
          return (
            <div
              key={index}
              className="control-point-export-hidden"
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: draggingIndex === index ? '#ef4444' : '#3b82f6',
                border: '3px solid white',
                cursor: 'grab',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                zIndex: 1000,
                pointerEvents: 'all',
              }}
              onMouseDown={(e) => handleMouseDown(index, e)}
            />
          );
        })}
      </EdgeLabelRenderer>
    </>
  );
};

interface CustomNodeProps {
  data: FlowNodeData;
  selected: boolean;
}

const StartNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div className={`bg-green-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-green-700'}`} style={{ 
    width: '120px', 
    height: '60px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center', 
    boxSizing: 'border-box',
    borderRadius: '30px',
    border: selected ? '4px solid #3b82f6' : '3px solid #15803d'
  }}>
    <Handle 
      type="source" 
      position={Position.Bottom} 
      className="w-3 h-3 !bg-green-700" 
      style={{ bottom: '-6px' }}
    />
    <div className="font-bold text-sm text-center">开始</div>
  </div>
);

const EndNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div className={`bg-red-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-red-700'}`} style={{ 
    width: '120px', 
    height: '60px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center', 
    boxSizing: 'border-box',
    borderRadius: '30px',
    border: selected ? '4px solid #3b82f6' : '3px solid #b91c1c'
  }}>
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-3 h-3 !bg-red-700" 
      style={{ top: '-6px' }}
    />
    <div className="font-bold text-sm text-center">结束</div>
  </div>
);

const ProcessNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div className={`bg-blue-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-blue-700'}`} style={{ 
    width: '180px', 
    height: '70px', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center', 
    boxSizing: 'border-box',
    border: selected ? '4px solid #3b82f6' : '3px solid #1d4ed8'
  }}>
    <Handle 
      type="target" 
      position={Position.Top} 
      className="w-3 h-3 !bg-blue-700" 
      style={{ top: '-6px' }}
    />
    <div className="font-bold text-sm text-center">处理</div>
    <div className="text-xs text-center font-mono truncate max-w-[140px]">{data.code || data.label}</div>
    <Handle 
      type="source" 
      position={Position.Bottom} 
      className="w-3 h-3 !bg-blue-700" 
      style={{ bottom: '-6px' }}
    />
  </div>
);

const DecisionNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div style={{ 
    width: '150px', 
    height: '70px', 
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <Handle 
      type="target" 
      position={Position.Top} 
      id="top" 
      className="w-3 h-3 !bg-yellow-700" 
      style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <div className={`bg-yellow-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-yellow-700'}`} style={{ 
      width: '180px', 
      height: '60px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      boxSizing: 'border-box',
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      position: 'absolute',
      border: selected ? '4px solid #3b82f6' : '3px solid #a16207'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="font-bold text-sm text-center">判断</div>
        <div className="text-xs text-center font-mono truncate max-w-[140px]">{data.condition || data.label}</div>
      </div>
    </div>
    <Handle 
      type="source" 
      position={Position.Right} 
      id="right" 
      className="w-3 h-3 !bg-yellow-700" 
      style={{ right: '-22px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <div style={{ position: 'absolute', right: '-46px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#a16207', whiteSpace: 'nowrap' }}>否</div>
    <Handle 
      type="source" 
      position={Position.Left} 
      id="left" 
      className="w-3 h-3 !bg-yellow-700" 
      style={{ left: '-22px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <div style={{ position: 'absolute', left: '-46px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#a16207', whiteSpace: 'nowrap' }}>是</div>
  </div>
);

const SingleBranchNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div style={{ 
    width: '150px', 
    height: '70px', 
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <Handle 
      type="target" 
      position={Position.Top} 
      id="top" 
      className="w-3 h-3 !bg-cyan-700" 
      style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <div className={`bg-cyan-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-cyan-700'}`} style={{ 
      width: '180px', 
      height: '60px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      boxSizing: 'border-box',
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      position: 'absolute',
      border: selected ? '4px solid #3b82f6' : '3px solid #0e7490'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="font-bold text-sm text-center">单分支</div>
        <div className="text-xs text-center font-mono truncate max-w-[140px]">{data.condition || data.label}</div>
      </div>
    </div>
    <Handle 
      type="source" 
      position={Position.Right} 
      id="right" 
      className="w-3 h-3 !bg-cyan-700" 
      style={{ right: '-22px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <div style={{ position: 'absolute', right: '-46px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#0e7490', whiteSpace: 'nowrap' }}>是</div>
    <Handle 
      type="source" 
      position={Position.Bottom} 
      id="bottom" 
      className="w-3 h-3 !bg-cyan-700" 
      style={{ bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <div style={{ position: 'absolute', bottom: '-26px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#0e7490', whiteSpace: 'nowrap' }}>否</div>
  </div>
);

const InputNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const getAssignmentStatements = () => {
    if (data.inputVariables && data.inputVariables.length > 0) {
      return data.inputVariables
        .map(v => v.name ? `${v.name}: ${v.type || 'str'}` : '')
        .filter(s => s)
        .join('\n');
    }
    return data.label || '';
  };

  return (
    <div style={{ 
      width: '180px', 
      height: '70px', 
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-purple-700" 
        style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
      />
      <div className={`bg-purple-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-purple-700'}`} style={{ 
        width: '180px', 
        height: '60px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        boxSizing: 'border-box',
        transform: 'skewX(-20deg)',
        border: selected ? '4px solid #3b82f6' : '3px solid #7e22ce'
      }}>
        <div style={{ transform: 'skewX(20deg)', textAlign: 'center', padding: '0 10px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="font-bold text-sm text-center">输入</div>
          <div className="text-xs text-center font-mono whitespace-pre-line">{getAssignmentStatements()}</div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-purple-700" 
        style={{ bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
      />
    </div>
  );
};

const OutputNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const getOutputVariables = () => {
    if (data.outputVariables && data.outputVariables.length > 0) {
      return data.outputVariables.filter(v => v).join(', ');
    }
    return data.label || '';
  };

  return (
    <div style={{ 
      width: '180px', 
      height: '70px', 
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-pink-700" 
        style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
      />
      <div className={`bg-pink-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-pink-700'}`} style={{ 
        width: '180px', 
        height: '60px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        boxSizing: 'border-box',
        transform: 'skewX(-20deg)',
        border: selected ? '4px solid #3b82f6' : '3px solid #be185d'
      }}>
        <div style={{ transform: 'skewX(20deg)', textAlign: 'center', padding: '0 10px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div className="font-bold text-sm text-center">输出</div>
          <div className="text-xs text-center font-mono truncate max-w-[140px]">{getOutputVariables()}</div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-pink-700" 
        style={{ bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
      />
    </div>
  );
};

const LoopNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div style={{ 
    width: '150px', 
    height: '70px', 
    boxSizing: 'border-box',
    position: 'relative',
    backgroundColor: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <Handle 
      type="target" 
      position={Position.Top} 
      id="top" 
      className="w-3 h-3 !bg-orange-700" 
      style={{ top: '-2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <Handle 
      type="target" 
      position={Position.Left} 
      id="left" 
      className="w-3 h-3 !bg-orange-700" 
      style={{ left: '-22px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <div className={`bg-orange-500 text-white shadow-lg ${selected ? 'border-4 border-blue-500' : 'border-3 border-orange-700'}`} style={{ 
      width: '180px', 
      height: '60px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      boxSizing: 'border-box',
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      position: 'absolute',
      border: selected ? '4px solid #3b82f6' : '3px solid #c2410c'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="font-bold text-sm text-center">循环</div>
        <div className="text-xs text-center font-mono truncate max-w-[140px]">{data.loopCondition || data.label}</div>
      </div>
    </div>
    <Handle 
      type="source" 
      position={Position.Right} 
      id="right" 
      className="w-3 h-3 !bg-orange-700" 
      style={{ right: '-22px', top: '50%', transform: 'translateY(-50%)' }}
    />
    <div style={{ position: 'absolute', right: '-46px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#c2410c', whiteSpace: 'nowrap' }}>否</div>
    <Handle 
      type="source" 
      position={Position.Bottom} 
      id="bottom" 
      className="w-3 h-3 !bg-orange-700" 
      style={{ bottom: '-2px', left: '50%', transform: 'translateX(-50%)' }}
    />
    <div style={{ position: 'absolute', bottom: '-26px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold', color: '#c2410c', whiteSpace: 'nowrap' }}>是</div>
  </div>
);

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
  singleBranch: SingleBranchNode,
  input: InputNode,
  output: OutputNode,
  loop: LoopNode,
};

const edgeTypes = {
  controlpoint: ControlPointEdge,
};

const defaultInitialNodes: Node<FlowNodeData>[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 20 },
    data: { label: '开始', type: 'start' },
  },
];

const defaultInitialEdges: Edge[] = [];

interface FlowchartEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

const FlowchartEditor: React.FC<FlowchartEditorProps> = ({ 
  initialNodes = defaultInitialNodes,
  initialEdges = defaultInitialEdges,
  onNodesChange, 
  onEdgesChange
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNodeData> | null>(null);
  const [editingNodeData, setEditingNodeData] = useState<FlowNodeData | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const isInitializingRef = useRef(true);
  const prevNodesRef = useRef<Node[]>(initialNodes);
  const prevEdgesRef = useRef<Edge[]>(initialEdges);

  const availableVariables = useMemo(() => {
    const variables: string[] = [];
    nodes
      .filter(node => node.data.type === 'input')
      .forEach(node => {
        if (node.data.inputVariables && node.data.inputVariables.length > 0) {
          node.data.inputVariables.forEach((variable: { name?: string }) => {
            if (variable.name) {
              variables.push(variable.name);
            }
          });
        } else if (node.data.variableName) {
          variables.push(node.data.variableName);
        }
      });
    return variables;
  }, [nodes]);

  useEffect(() => {
    if (isInitializingRef.current) {
      isInitializingRef.current = false;
      return;
    }

    const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(prevNodesRef.current);
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(prevEdgesRef.current);

    if (nodesChanged) {
      prevNodesRef.current = nodes;
      onNodesChange?.(nodes);
    }

    if (edgesChanged) {
      prevEdgesRef.current = edges;
      onEdgesChange?.(edges);
    }
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  useEffect(() => {
    if (!isInitializingRef.current) {
      const edgesWithControlPoints = initialEdges.map(edge => {
        return {
          ...edge,
          type: 'controlpoint',
          data: {
            ...edge.data,
            controlPoints: edge.data?.controlPoints,
          },
        };
      });
      setNodes(initialNodes);
      setEdges(edgesWithControlPoints);
      prevNodesRef.current = initialNodes;
      prevEdgesRef.current = edgesWithControlPoints;
    }
  }, [initialNodes, initialEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `edge_${params.source}_${params.target}_${Date.now()}`,
        type: 'controlpoint',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
        data: { controlPoints: null },
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeId = `node_${Date.now()}`;
      const newNode: Node<FlowNodeData> = {
        id: nodeId,
        type: type as any,
        position,
        data: { label: getDefaultLabel(type as NodeType), type: type as NodeType },
      };

      setNodes((nds) => nds.concat(newNode));
      
      setTimeout(() => {
        updateNodeInternals(nodeId);
      }, 100);
    },
    [reactFlowInstance, setNodes, updateNodeInternals]
  );

  const getDefaultLabel = (type: NodeType): string => {
    const labels: Record<string, string> = {
      start: '开始',
      end: '结束',
      process: '处理',
      decision: '判断',
      input: '输入',
      output: '输出',
      loop: '循环',
      function: '函数',
    };
    return labels[type] || '节点';
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNode(node);
    setEditingNodeData({ ...node.data });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setEditingNodeData(null);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setEditingNodeData(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const updateSelectedNodeLabel = useCallback((label: string) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return { ...node, data: { ...node.data, label } };
          }
          return node;
        })
      );
    }
  }, [selectedNode, setNodes]);

  const updateSelectedNodeData = useCallback((key: string, value: any) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return { ...node, data: { ...node.data, [key]: value } };
          }
          return node;
        })
      );
    }
  }, [selectedNode, setNodes]);

  const clearFlowchart = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">流程图编辑器</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearFlowchart}>
            <Trash2 className="w-4 h-4 mr-2" />
            清空
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-40 border-r bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
          <div className="p-4 border-b bg-white dark:bg-gray-800">
            <h3 className="font-semibold text-sm">节点库</h3>
          </div>
          
          <div className="h-[160px] overflow-y-auto p-4">
            <div className="space-y-3">
              <NodeButton type="start" label="开始" onDragStart={onDragStart} color="bg-green-500" />
              <NodeButton type="end" label="结束" onDragStart={onDragStart} color="bg-red-500" />
              <NodeButton type="process" label="处理" onDragStart={onDragStart} color="bg-blue-500" />
              <NodeButton type="decision" label="判断" onDragStart={onDragStart} color="bg-yellow-500" />
              <NodeButton type="singleBranch" label="单分支" onDragStart={onDragStart} color="bg-cyan-500" />
              <NodeButton type="input" label="输入" onDragStart={onDragStart} color="bg-purple-500" />
              <NodeButton type="output" label="输出" onDragStart={onDragStart} color="bg-pink-500" />
              <NodeButton type="loop" label="循环" onDragStart={onDragStart} color="bg-orange-500" />
            </div>
          </div>
          
          {selectedNode && editingNodeData && (
            <div className="border-t bg-white dark:bg-gray-800 max-h-[400px] overflow-y-auto">
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">节点属性</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  类型: {selectedNode.data.type}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {selectedNode.id}
                </div>
                
                <input
                  type="text"
                  value={editingNodeData.label || ''}
                  onChange={(e) => {
                    setEditingNodeData({ ...editingNodeData, label: e.target.value });
                  }}
                  onBlur={() => {
                    updateSelectedNodeLabel(editingNodeData.label || '');
                  }}
                  className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="节点标签"
                />

                {editingNodeData.type === 'input' && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                        变量设置
                      </h4>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        变量个数
                      </label>
                      <select
                        value={editingNodeData.inputVariables?.length || 1}
                        onChange={(e) => {
                          const count = parseInt(e.target.value);
                          const currentVariables = editingNodeData.inputVariables || [];
                          const newVariables: Array<{ name: string; type: string }> = [];
                          for (let i = 0; i < count; i++) {
                            if (currentVariables[i]) {
                              newVariables.push(currentVariables[i]);
                            } else {
                              newVariables.push({ name: `var${i + 1}`, type: 'str' });
                            }
                          }
                          setEditingNodeData({ ...editingNodeData, inputVariables: newVariables });
                          updateSelectedNodeData('inputVariables', newVariables);
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="1">1 个变量</option>
                        <option value="2">2 个变量</option>
                        <option value="3">3 个变量</option>
                      </select>
                      
                      {(editingNodeData.inputVariables || [{ name: 'var1', type: 'str' }]).map((variable, index) => (
                        <div key={index} className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            变量 {index + 1} 名称
                          </label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => {
                              const newVariables = [...(editingNodeData.inputVariables || [{ name: 'var1', type: 'str' }])];
                              newVariables[index] = { ...newVariables[index], name: e.target.value };
                              setEditingNodeData({ ...editingNodeData, inputVariables: newVariables });
                            }}
                            onBlur={() => {
                              updateSelectedNodeData('inputVariables', editingNodeData.inputVariables || [{ name: 'var1', type: 'str' }]);
                            }}
                            className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder={`例如: variable${index + 1}`}
                          />
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            变量 {index + 1} 类型
                          </label>
                          <select
                            value={variable.type}
                            onChange={(e) => {
                              const newVariables = [...(editingNodeData.inputVariables || [{ name: 'var1', type: 'str' }])];
                              newVariables[index] = { ...newVariables[index], type: e.target.value };
                              setEditingNodeData({ ...editingNodeData, inputVariables: newVariables });
                            }}
                            onBlur={() => {
                              updateSelectedNodeData('inputVariables', editingNodeData.inputVariables || [{ name: 'var1', type: 'str' }]);
                            }}
                            className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="str">字符串 (str)</option>
                            <option value="int">整数 (int)</option>
                            <option value="float">浮点数 (float)</option>
                            <option value="bool">布尔值 (bool)</option>
                            <option value="list">列表 (list)</option>
                            <option value="dict">字典 (dict)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {editingNodeData.type === 'output' && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                        输出设置
                      </h4>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        输出变量个数
                      </label>
                      <select
                        value={editingNodeData.outputVariables?.length || 1}
                        onChange={(e) => {
                          const count = parseInt(e.target.value);
                          const currentVariables = editingNodeData.outputVariables || [];
                          const newVariables: string[] = [];
                          for (let i = 0; i < count; i++) {
                            if (currentVariables[i]) {
                              newVariables.push(currentVariables[i]);
                            } else {
                              newVariables.push('');
                            }
                          }
                          setEditingNodeData({ ...editingNodeData, outputVariables: newVariables });
                          updateSelectedNodeData('outputVariables', newVariables);
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="1">1 个变量</option>
                        <option value="2">2 个变量</option>
                        <option value="3">3 个变量</option>
                      </select>
                      
                      {(editingNodeData.outputVariables || ['']).map((variable, index) => (
                        <div key={index} className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <label className="text-xs text-gray-500 dark:text-gray-400">
                            输出变量 {index + 1}
                          </label>
                          <select
                            value={variable}
                            onChange={(e) => {
                              const newVariables = [...(editingNodeData.outputVariables || [''])];
                              newVariables[index] = e.target.value;
                              setEditingNodeData({ ...editingNodeData, outputVariables: newVariables });
                            }}
                            onBlur={() => {
                              updateSelectedNodeData('outputVariables', editingNodeData.outputVariables || ['']);
                            }}
                            className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">选择变量</option>
                            {availableVariables.map((availableVar) => (
                              <option key={availableVar} value={availableVar}>
                                {availableVar}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {availableVariables.length === 0 && '请先添加输入节点定义变量'}
                      </div>
                    </div>
                  </>
                )}

                {editingNodeData.type === 'decision' && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                      判断条件
                      </h4>
                      <textarea
                        value={editingNodeData.condition || ''}
                        onChange={(e) => {
                          setEditingNodeData({ ...editingNodeData, condition: e.target.value });
                        }}
                        onBlur={() => {
                          updateSelectedNodeData('condition', editingNodeData.condition || '');
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="例如: x > 10"
                        rows={3}
                      />
                    </div>
                  </>
                )}
                {editingNodeData.type === 'singleBranch' && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                        单分支条件
                      </h4>
                      <textarea
                        value={editingNodeData.condition || ''}
                        onChange={(e) => {
                          setEditingNodeData({ ...editingNodeData, condition: e.target.value });
                        }}
                        onBlur={() => {
                          updateSelectedNodeData('condition', editingNodeData.condition || '');
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="例如: x > 10"
                        rows={3}
                      />
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        右连接点: 条件为真时执行<br/>
                        下连接点: 条件为假时执行
                      </div>
                    </div>
                  </>
                )}

                {editingNodeData.type === 'loop' && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                      循环设置
                      </h4>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        循环条件
                      </label>
                      <textarea
                        value={editingNodeData.loopCondition || ''}
                        onChange={(e) => {
                          setEditingNodeData({ ...editingNodeData, loopCondition: e.target.value });
                        }}
                        onBlur={() => {
                          updateSelectedNodeData('loopCondition', editingNodeData.loopCondition || '');
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="例如: i < 10"
                        rows={3}
                      />
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        上连接点: 上一个节点连接<br/>
                        左连接点: 循环体最后一个节点返回<br/>
                        下连接点: 条件为真时执行循环体<br/>
                        右连接点: 条件为假时退出循环
                      </div>
                    </div>
                  </>
                )}

                {(editingNodeData.type === 'process') && (
                  <>
                    <div className="space-y-2 pt-2 border-t pt-3">
                      <h4 className="font-medium text-xs text-gray-600 dark:text-gray-300">
                        代码
                      </h4>
                      <textarea
                        value={editingNodeData.code || ''}
                        onChange={(e) => {
                          setEditingNodeData({ ...editingNodeData, code: e.target.value });
                        }}
                        onBlur={() => {
                          updateSelectedNodeData('code', editingNodeData.code || '');
                        }}
                        className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono"
                        placeholder="Python代码"
                        rows={4}
                      />
                    </div>
                  </>
                )}

                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={deleteSelectedNode}
                  className="w-full mt-2"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除节点
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" ref={reactFlowWrapper} id="flowchart-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeInternal}
            onEdgesChange={onEdgesChangeInternal}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-50 dark:bg-gray-900"
            defaultEdgeOptions={{
              type: 'controlpoint',
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: {
                strokeWidth: 2,
              },
            }}
            elevateEdgesOnSelect
            elevateNodesOnSelect
          >
            <Background gap={16} size={1} />
            <Controls className="bg-white dark:bg-gray-800 border dark:border-gray-700" />
            <MiniMap 
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  start: '#22c55e',
                  end: '#ef4444',
                  process: '#3b82f6',
                  decision: '#eab308',
                  input: '#a855f7',
                  output: '#ec4899',
                  loop: '#f97316',
                };
                return colors[node.type as string] || '#6b7280';
              }}
              className="bg-white dark:bg-gray-800 border dark:border-gray-700"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

interface NodeButtonProps {
  type: NodeType;
  label: string;
  onDragStart: (event: React.DragEvent, type: NodeType) => void;
  color: string;
}

const NodeButton: React.FC<NodeButtonProps> = ({ type, label, onDragStart, color }) => (
  <div
    className={`${color} text-white px-3 py-2.5 rounded-md cursor-grab text-sm font-medium text-center shadow-sm hover:opacity-90 transition-opacity active:cursor-grabbing`}
    onDragStart={(event) => onDragStart(event, type)}
    draggable
  >
    {label}
  </div>
);

const FlowchartEditorWithProvider: React.FC<FlowchartEditorProps> = (props) => (
  <ReactFlowProvider>
    <FlowchartEditor {...props} />
  </ReactFlowProvider>
);

export default FlowchartEditorWithProvider;
