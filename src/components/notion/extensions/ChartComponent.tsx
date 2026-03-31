import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ZAxis,
} from 'recharts';
import {
  Settings2,
  Plus,
  Trash2,
  BarChart2,
  TrendingUp,
  PieChart as PieChartIcon,
  X,
  Circle,
  Waves,
  Hexagon,
  BoxSelect,
  BarChart3,
  Activity,
  FunctionSquare,
  Palette,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ============ Color Palettes ============
const PALETTES = [
  ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981'],
  ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'],
  ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6'],
  ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6'],
  ['#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'],
  ['#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519', '#1c1917'],
];

const CHART_TYPES = [
  { key: 'bar', label: 'Barras', icon: BarChart2 },
  { key: 'line', label: 'Líneas', icon: TrendingUp },
  { key: 'pie', label: 'Torta', icon: PieChartIcon },
  { key: 'scatter', label: 'Dispersión', icon: Circle },
  { key: 'area', label: 'Área', icon: Waves },
  { key: 'radar', label: 'Radar', icon: Hexagon },
  { key: 'box', label: 'Caja', icon: BoxSelect },
  { key: 'histogram', label: 'Histograma', icon: BarChart3 },
  { key: 'bubble', label: 'Burbujas', icon: Activity },
  { key: 'function', label: 'Función', icon: FunctionSquare },
] as const;

// ============ Tooltip Styles ============
const tooltipStyle = {
  backgroundColor: 'hsl(222 47% 11%)',
  borderColor: 'hsl(217 33% 17%)',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

// ============ Function Evaluator ============
const evaluateFunction = (expr: string, x: number): number | null => {
  try {
    const sanitized = expr
      .replace(/\^/g, '**')
      .replace(/sen\(/gi, 'Math.sin(')
      .replace(/sin\(/gi, 'Math.sin(')
      .replace(/cos\(/gi, 'Math.cos(')
      .replace(/tan\(/gi, 'Math.tan(')
      .replace(/log\(/gi, 'Math.log10(')
      .replace(/ln\(/gi, 'Math.log(')
      .replace(/sqrt\(/gi, 'Math.sqrt(')
      .replace(/abs\(/gi, 'Math.abs(')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-zA-Z])/g, 'Math.E')
      .replace(/asin\(/gi, 'Math.asin(')
      .replace(/acos\(/gi, 'Math.acos(')
      .replace(/atan\(/gi, 'Math.atan(')
      .replace(/ceil\(/gi, 'Math.ceil(')
      .replace(/floor\(/gi, 'Math.floor(')
      .replace(/round\(/gi, 'Math.round(')
      .replace(/exp\(/gi, 'Math.exp(')
      .replace(/(\d)(x)/g, '$1*x')
      .replace(/(x)(\d)/g, 'x*$2')
      .replace(/\)(x)/g, ')*x')
      .replace(/(x)\(/g, 'x*(');
    const fn = new Function('x', `"use strict"; return (${sanitized});`);
    const result = fn(x);
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
};

// ============ Box Plot Helpers ============
const computeBoxPlotStats = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const min = Math.max(sorted[0], q1 - 1.5 * iqr);
  const max = Math.min(sorted[n - 1], q3 + 1.5 * iqr);
  const outliers = sorted.filter(v => v < min || v > max);
  return { min, q1, median, q3, max, outliers, rawMin: sorted[0], rawMax: sorted[n - 1] };
};

// ============ Custom Box Plot Renderer (High Precision) ============
const CustomBoxPlot = ({ data, title, color }: { data: number[], title?: string, color?: string }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    
    // Linear interpolation for quartiles
    const getQuartile = (arr: number[], q: number) => {
      const pos = (arr.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      } else {
        return arr[base];
      }
    };

    const q1 = getQuartile(sorted, 0.25);
    const q2 = getQuartile(sorted, 0.5); // Mediana
    const q3 = getQuartile(sorted, 0.75);
    const ri = q3 - q1;
    
    const ref1 = q1 - 3 * ri;
    const ref2 = q1 - 1.5 * ri;
    const ref3 = q3 + 1.5 * ri;
    const ref4 = q3 + 3 * ri;
    
    const normalData = sorted.filter(v => v >= ref2 && v <= ref3);
    const minN = normalData.length > 0 ? normalData[0] : q1;
    const maxN = normalData.length > 0 ? normalData[normalData.length - 1] : q3;
    
    const atipicos = sorted.filter(v => (v >= ref1 && v < ref2) || (v > ref3 && v <= ref4));
    const anomalos = sorted.filter(v => v < ref1 || v > ref4);
    
    // Range for scaling
    const margin = (Math.max(...sorted) - Math.min(...sorted)) * 0.1 || 10;
    const xMin = Math.min(Math.min(...sorted), ref1) - margin;
    const xMax = Math.max(Math.max(...sorted), ref4) + margin;

    return { mean, q1, q2, q3, ri, ref1, ref2, ref3, ref4, minN, maxN, atipicos, anomalos, xMin, xMax, all: sorted };
  }, [data]);

  if (!stats) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">No hay datos suficientes para calcular la estadística.</div>;

  const { mean, q1, q2, q3, ref1, ref2, ref3, ref4, minN, maxN, atipicos, anomalos, xMin, xMax } = stats;

  const W = 600;
  const H = 240;
  const paddingX = 50;
  const paddingY = 60;
  const boxY = H / 2;
  const boxHeight = 40;

  const scaleX = (v: number) => paddingX + ((v - xMin) / (xMax - xMin)) * (W - 2 * paddingX);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 overflow-hidden bg-background/20 rounded-lg border border-border/20 shadow-inner">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-full" preserveAspectRatio="xMidYMid meet">
        {/* Style Definitions */}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Reference Lines (Dashed Vertical) */}
        {[ref1, ref2, ref3, ref4].map((ref, i) => (
          <g key={i}>
            <line 
                x1={scaleX(ref)} y1={paddingY - 10} 
                x2={scaleX(ref)} y2={H - paddingY + 20} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1} 
                strokeDasharray="4 4" 
                opacity={0.4} 
            />
            <text x={scaleX(ref)} y={H - paddingY + 35} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))" className="font-mono">
                Ref{i+1} ({ref.toFixed(1)})
            </text>
          </g>
        ))}

        {/* Main Axis (Bottom) */}
        <line x1={paddingX} y1={H - paddingY + 10} x2={W - paddingX} y2={H - paddingY + 10} stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.5} />
        
        {/* Labels for Q1, Q2, Q3 */}
        <g>
            <text x={scaleX(q1)} y={H - paddingY + 35} textAnchor="middle" fontSize={10} fontWeight="bold" fill="hsl(var(--primary))">Q1 ({q1.toFixed(1)})</text>
            <text x={scaleX(q2)} y={H - paddingY + 48} textAnchor="middle" fontSize={10} fontWeight="bold" fill="hsl(var(--primary))">Q2 ({q2.toFixed(1)})</text>
            <text x={scaleX(q3)} y={H - paddingY + 35} textAnchor="middle" fontSize={10} fontWeight="bold" fill="hsl(var(--primary))">Q3 ({q3.toFixed(1)})</text>
            {/* Ticks for Qs */}
            <line x1={scaleX(q1)} y1={H - paddingY + 10} x2={scaleX(q1)} y2={H - paddingY + 15} stroke="hsl(var(--primary))" strokeWidth={1.5} />
            <line x1={scaleX(q2)} y1={H - paddingY + 10} x2={scaleX(q2)} y2={H - paddingY + 15} stroke="hsl(var(--primary))" strokeWidth={1.5} />
            <line x1={scaleX(q3)} y1={H - paddingY + 10} x2={scaleX(q3)} y2={H - paddingY + 15} stroke="hsl(var(--primary))" strokeWidth={1.5} />
        </g>

        {/* Annotations for Apartados (Top) */}
        {/* Left Apartados */}
        {(ref1 > xMin || ref2 > xMin) && (
            <g>
                <text x={scaleX((ref1 + ref2) / 2)} y={paddingY - 35} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" className="uppercase tracking-widest font-bold">Apartados</text>
                <line x1={scaleX(xMin + 5)} y1={paddingY - 30} x2={scaleX(ref2)} y2={paddingY - 30} stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} />
                <text x={scaleX((xMin + ref1) / 2)} y={paddingY - 18} textAnchor="middle" fontSize={8} fill="hsl(var(--destructive))">Anómalo</text>
                <text x={scaleX((ref1 + ref2) / 2)} y={paddingY - 18} textAnchor="middle" fontSize={8} fill="hsl(var(--warning))">Atípico</text>
            </g>
        )}
        {/* Right Apartados */}
        {(ref3 < xMax || ref4 < xMax) && (
            <g>
                <text x={scaleX((ref3 + ref4) / 2)} y={paddingY - 35} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))" className="uppercase tracking-widest font-bold">Apartados</text>
                <line x1={scaleX(ref3)} y1={paddingY - 30} x2={scaleX(xMax - 5)} y2={paddingY - 30} stroke="hsl(var(--muted-foreground))" strokeWidth={0.8} />
                <text x={scaleX((ref3 + ref4) / 2)} y={paddingY - 18} textAnchor="middle" fontSize={8} fill="hsl(var(--warning))">Atípico</text>
                <text x={scaleX((ref4 + xMax) / 2)} y={paddingY - 18} textAnchor="middle" fontSize={8} fill="hsl(var(--destructive))">Anómalo</text>
            </g>
        )}

        {/* Whiskers */}
        <line x1={scaleX(minN)} y1={boxY} x2={scaleX(q1)} y2={boxY} stroke={color || "hsl(var(--primary))"} strokeWidth={1.5} />
        <line x1={scaleX(maxN)} y1={boxY} x2={scaleX(q3)} y2={boxY} stroke={color || "hsl(var(--primary))"} strokeWidth={1.5} />
        {/* Whisker caps (T-shape) */}
        <line x1={scaleX(minN)} y1={boxY - 8} x2={scaleX(minN)} y2={boxY + 8} stroke={color || "hsl(var(--primary))"} strokeWidth={2} />
        <line x1={scaleX(maxN)} y1={boxY - 8} x2={scaleX(maxN)} y2={boxY + 8} stroke={color || "hsl(var(--primary))"} strokeWidth={2} />

        {/* The Box */}
        <rect 
            x={scaleX(q1)} y={boxY - boxHeight / 2} 
            width={scaleX(q3) - scaleX(q1)} height={boxHeight} 
            fill={`${color || "#8b5cf6"}15`} 
            stroke={color || "hsl(var(--primary))"} 
            strokeWidth={2} 
            filter="url(#shadow)"
        />
        
        {/* Median Line */}
        <line 
            x1={scaleX(q2)} y1={boxY - boxHeight / 2} 
            x2={scaleX(q2)} y2={boxY + boxHeight / 2} 
            stroke={color || "hsl(var(--primary))"} 
            strokeWidth={3} 
        />

        {/* Mean Marker (+) */}
        <g transform={`translate(${scaleX(mean)}, ${boxY})`}>
            <line x1={-5} y1={0} x2={5} y2={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
            <line x1={0} y1={-5} x2={0} y2={5} stroke="hsl(var(--foreground))" strokeWidth={2} />
            <text y={-10} textAnchor="middle" fontSize={8} fontWeight="bold" fill="hsl(var(--foreground))">$\overline{x}$</text>
        </g>

        {/* Markers for Outliers and Extreme Values */}
        {atipicos.map((v, i) => (
          <circle 
            key={`atipico-${i}`} 
            cx={scaleX(v)} cy={boxY} r={4} 
            fill="transparent" 
            stroke="hsl(var(--warning))" 
            strokeWidth={1.5} 
          />
        ))}
        {anomalos.map((v, i) => (
          <g key={`anomalo-${i}`} transform={`translate(${scaleX(v)}, ${boxY})`}>
             <text textAnchor="middle" dy={6} fontSize={16} fill="hsl(var(--destructive))" fontWeight="bold">*</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ============ Function Plot Component ============
const FunctionPlotCanvas = ({ functions, xMin, xMax, yMin, yMax, showGrid, showAxes }: {
  functions: { expr: string; color: string; label: string }[];
  xMin: number; xMax: number; yMin: number; yMax: number;
  showGrid: boolean; showAxes: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; fxs: { label: string; value: number; color: string }[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toScreenY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      const xStep = Math.pow(10, Math.floor(Math.log10(xMax - xMin)) - 1) * 2;
      const yStep = Math.pow(10, Math.floor(Math.log10(yMax - yMin)) - 1) * 2;
      for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
        const sx = toScreenX(gx);
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      }
      for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax; gy += yStep) {
        const sy = toScreenY(gy);
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
      }
    }

    // Axes
    if (showAxes) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1.5;
      // X axis
      if (yMin <= 0 && yMax >= 0) {
        const ay = toScreenY(0);
        ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke();
      }
      // Y axis
      if (xMin <= 0 && xMax >= 0) {
        const ax = toScreenX(0);
        ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke();
      }

      // Tick marks & labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const xTickStep = Math.pow(10, Math.floor(Math.log10(xMax - xMin)));
      const yTickStep = Math.pow(10, Math.floor(Math.log10(yMax - yMin)));
      for (let tx = Math.ceil(xMin / xTickStep) * xTickStep; tx <= xMax; tx += xTickStep) {
        if (Math.abs(tx) < 1e-10) continue;
        const sx = toScreenX(tx);
        const ay = yMin <= 0 && yMax >= 0 ? toScreenY(0) : H - 5;
        ctx.fillText(tx.toFixed(Math.abs(tx) < 1 ? 2 : 0), sx, ay + 14);
      }
      ctx.textAlign = 'right';
      for (let ty = Math.ceil(yMin / yTickStep) * yTickStep; ty <= yMax; ty += yTickStep) {
        if (Math.abs(ty) < 1e-10) continue;
        const sy = toScreenY(ty);
        const ax = xMin <= 0 && xMax >= 0 ? toScreenX(0) : 5;
        ctx.fillText(ty.toFixed(Math.abs(ty) < 1 ? 2 : 0), ax - 4, sy + 4);
      }
    }

    // Draw functions
    const steps = Math.min(W * 2, 1000);
    const dx = (xMax - xMin) / steps;

    functions.forEach(fn => {
      if (!fn.expr.trim()) return;
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;

      for (let i = 0; i <= steps; i++) {
        const xVal = xMin + i * dx;
        const yVal = evaluateFunction(fn.expr, xVal);
        if (yVal === null || yVal < yMin * 2 || yVal > yMax * 2) {
          started = false;
          continue;
        }
        const sx = toScreenX(xVal);
        const sy = toScreenY(yVal);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    });
  }, [functions, xMin, xMax, yMin, yMax, showGrid, showAxes]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const obs = new ResizeObserver(() => draw());
    if (canvasRef.current) obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const x = xMin + (mx / rect.width) * (xMax - xMin);
    const fxs = functions.filter(fn => fn.expr.trim()).map(fn => {
      const val = evaluateFunction(fn.expr, x);
      return { label: fn.label || fn.expr, value: val ?? NaN, color: fn.color };
    }).filter(f => isFinite(f.value));
    if (fxs.length > 0) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, fxs });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-[#0f172a] border border-[#1e293b] rounded-lg p-2 shadow-2xl text-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10, minWidth: 100 }}
        >
          {tooltip.fxs.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
              <span className="text-slate-400">{f.label}:</span>
              <span className="text-white font-mono">{f.value.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ Main Chart Component ============
export const ChartComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const { type, data, title, colors, functions: fnList, xRange, yRange } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'style' | 'functions'>('data');
  const [paletteIdx, setPaletteIdx] = useState(0);

  const currentColors: string[] = colors || PALETTES[0];
  const currentFunctions: { expr: string; color: string; label: string }[] = fnList || [
    { expr: 'sin(x)', color: '#8b5cf6', label: 'f(x)' },
  ];
  const currentXRange: [number, number] = xRange || [-10, 10];
  const currentYRange: [number, number] = yRange || [-5, 5];

  const handleDataChange = (index: number, field: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: field === 'name' ? value : Number(value) || 0 };
    updateAttributes({ data: newData });
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...currentColors];
    newColors[index] = color;
    updateAttributes({ colors: newColors });
  };

  const addRow = () => {
    const defaults: Record<string, any> = {
      scatter: { name: `P${data.length + 1}`, x: Math.random() * 10, y: Math.random() * 10 },
      bubble: { name: `B${data.length + 1}`, x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 50 + 10 },
      radar: { name: `Eje${data.length + 1}`, value: Math.floor(Math.random() * 100) },
      box: { name: `Serie${data.length + 1}`, values: Array.from({ length: 10 }, () => Math.floor(Math.random() * 100)) },
      histogram: { name: `${data.length * 10}-${(data.length + 1) * 10}`, value: Math.floor(Math.random() * 50) },
    };
    updateAttributes({
      data: [...data, defaults[type] || { name: `Item ${data.length + 1}`, value: Math.floor(Math.random() * 100) }],
    });
  };

  const removeRow = (index: number) => {
    if (data.length <= 1) return;
    updateAttributes({ data: data.filter((_: any, i: number) => i !== index) });
  };

  const addFunction = () => {
    const newFns = [...currentFunctions, { expr: '', color: PALETTES[0][(currentFunctions.length) % 6], label: `g${currentFunctions.length}(x)` }];
    updateAttributes({ functions: newFns });
  };

  const updateFunction = (index: number, field: string, value: string) => {
    const newFns = [...currentFunctions];
    newFns[index] = { ...newFns[index], [field]: value };
    updateAttributes({ functions: newFns });
  };

  const removeFunction = (index: number) => {
    if (currentFunctions.length <= 1) return;
    updateAttributes({ functions: currentFunctions.filter((_: any, i: number) => i !== index) });
  };

  const cyclePalette = () => {
    const next = (paletteIdx + 1) % PALETTES.length;
    setPaletteIdx(next);
    updateAttributes({ colors: PALETTES[next] });
  };

  const changeChartType = (newType: string) => {
    let newData = data;
    // Convert data format if needed
    if (newType === 'scatter' && !data[0]?.x) {
      newData = data.map((d: any, i: number) => ({ name: d.name, x: i + 1, y: d.value || 0 }));
    } else if (newType === 'bubble' && !data[0]?.z) {
      newData = data.map((d: any, i: number) => ({ name: d.name, x: d.x ?? i + 1, y: d.y ?? d.value ?? 0, z: 20 }));
    } else if (newType === 'box' && !data[0]?.values) {
      newData = data.map((d: any) => ({ name: d.name, values: [d.value || 0, (d.value || 0) * 0.5, (d.value || 0) * 1.5, (d.value || 0) * 0.8, (d.value || 0) * 1.2] }));
    } else if (newType === 'radar' && data[0]?.x !== undefined) {
      newData = data.map((d: any) => ({ name: d.name, value: d.y ?? d.value ?? 0 }));
    } else if (['bar', 'line', 'pie', 'area', 'histogram'].includes(newType) && data[0]?.x !== undefined && !data[0]?.value) {
      newData = data.map((d: any) => ({ name: d.name, value: d.y ?? 0 }));
    }

    updateAttributes({ type: newType, data: newData });
    if (newType === 'function') setActiveTab('functions');
    else setActiveTab('data');
  };

  const renderChart = () => {
    const chartData = data || [];

    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={currentColors[0] || "#8b5cf6"} strokeWidth={3} dot={{ r: 5, fill: currentColors[0], strokeWidth: 2 }} activeDot={{ r: 7, strokeWidth: 0 }} />
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={90}
              innerRadius={30}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis type="number" dataKey="x" name="X" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis type="number" dataKey="y" name="Y" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <ZAxis range={[60, 300]} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name={title || 'Datos'} data={chartData} fill={currentColors[0]}>
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentColors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentColors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="value" stroke={currentColors[0]} fill="url(#areaGrad)" strokeWidth={2.5} dot={{ r: 4, fill: currentColors[0] }} />
          </AreaChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" opacity={0.3} />
            <PolarAngleAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Radar name={title || 'Datos'} dataKey="value" stroke={currentColors[0]} fill={currentColors[0]} fillOpacity={0.25} strokeWidth={2} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
          </RadarChart>
        );

      case 'box': {
        const firstSerie = chartData[0];
        if (!firstSerie || !firstSerie.values) return null;
        return (
          <CustomBoxPlot 
            data={firstSerie.values} 
            title={firstSerie.name} 
            color={currentColors[0]} 
          />
        );
      }

      case 'histogram':
        return (
          <BarChart data={chartData} barCategoryGap="1%">
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'bubble':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis type="number" dataKey="x" name="X" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis type="number" dataKey="y" name="Y" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <ZAxis type="number" dataKey="z" range={[40, 400]} name="Tamaño" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name={title || 'Datos'} data={chartData} fill={currentColors[0]}>
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} opacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        );

      case 'function':
        return null; // Rendered separately

      case 'bar':
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  // ============ Data Editor Rows ============
  const renderDataEditor = () => {
    if (type === 'scatter') {
      return data.map((row: any, i: number) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            type="color"
            value={currentColors[i % currentColors.length]}
            onChange={(e) => handleColorChange(i % currentColors.length, e.target.value)}
            className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0"
            title="Color"
          />
          <Input value={row.name} onChange={(e) => handleDataChange(i, 'name', e.target.value)} placeholder="Nombre" className="h-7 text-[11px] flex-1 min-w-0" />
          <Input type="number" value={row.x} onChange={(e) => handleDataChange(i, 'x', e.target.value)} placeholder="X" className="h-7 text-[11px] w-16" />
          <Input type="number" value={row.y} onChange={(e) => handleDataChange(i, 'y', e.target.value)} placeholder="Y" className="h-7 text-[11px] w-16" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => removeRow(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ));
    }

    if (type === 'bubble') {
      return data.map((row: any, i: number) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input type="color" value={currentColors[i % currentColors.length]} onChange={(e) => handleColorChange(i % currentColors.length, e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" />
          <Input value={row.name} onChange={(e) => handleDataChange(i, 'name', e.target.value)} placeholder="Nombre" className="h-7 text-[11px] flex-1 min-w-0" />
          <Input type="number" value={row.x} onChange={(e) => handleDataChange(i, 'x', e.target.value)} placeholder="X" className="h-7 text-[11px] w-14" />
          <Input type="number" value={row.y} onChange={(e) => handleDataChange(i, 'y', e.target.value)} placeholder="Y" className="h-7 text-[11px] w-14" />
          <Input type="number" value={row.z} onChange={(e) => handleDataChange(i, 'z', e.target.value)} placeholder="Tam" className="h-7 text-[11px] w-14" />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => removeRow(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ));
    }

    if (type === 'box') {
      return data.map((row: any, i: number) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-1.5 items-center">
            <input type="color" value={currentColors[i % currentColors.length]} onChange={(e) => handleColorChange(i % currentColors.length, e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" />
            <Input value={row.name} onChange={(e) => handleDataChange(i, 'name', e.target.value)} placeholder="Serie" className="h-7 text-[11px] flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => removeRow(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={(row.values || []).join(', ')}
            onChange={(e) => {
              const vals = e.target.value.split(',').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
              const newData = [...data];
              newData[i] = { ...newData[i], values: vals };
              updateAttributes({ data: newData });
            }}
            placeholder="Valores separados por coma: 10, 20, 30..."
            className="h-7 text-[11px] ml-7"
          />
        </div>
      ));
    }

    // Default: name + value
    return data.map((row: any, i: number) => (
      <div key={i} className="flex gap-1.5 items-center">
        <input
          type="color"
          value={currentColors[i % currentColors.length]}
          onChange={(e) => handleColorChange(i % currentColors.length, e.target.value)}
          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0"
          title="Color"
        />
        <Input value={row.name} onChange={(e) => handleDataChange(i, 'name', e.target.value)} placeholder="Etiqueta" className="h-7 text-[11px] flex-1 min-w-0" />
        <Input type="number" value={row.value} onChange={(e) => handleDataChange(i, 'value', e.target.value)} placeholder="Valor" className="h-7 text-[11px] w-20" />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => removeRow(i)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ));
  };

  // ============ Function Editor ============
  const renderFunctionEditor = () => (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <span className="text-[10px] uppercase font-bold text-muted-foreground">Rango X:</span>
        <Input type="number" value={currentXRange[0]} onChange={(e) => updateAttributes({ xRange: [Number(e.target.value), currentXRange[1]] })} className="h-7 text-[11px] w-16" />
        <span className="text-muted-foreground text-xs">a</span>
        <Input type="number" value={currentXRange[1]} onChange={(e) => updateAttributes({ xRange: [currentXRange[0], Number(e.target.value)] })} className="h-7 text-[11px] w-16" />
        <span className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Y:</span>
        <Input type="number" value={currentYRange[0]} onChange={(e) => updateAttributes({ yRange: [Number(e.target.value), currentYRange[1]] })} className="h-7 text-[11px] w-16" />
        <span className="text-muted-foreground text-xs">a</span>
        <Input type="number" value={currentYRange[1]} onChange={(e) => updateAttributes({ yRange: [currentYRange[0], Number(e.target.value)] })} className="h-7 text-[11px] w-16" />
      </div>

      <div className="space-y-2">
        {currentFunctions.map((fn, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input type="color" value={fn.color} onChange={(e) => updateFunction(i, 'color', e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent p-0" />
            <Input value={fn.label} onChange={(e) => updateFunction(i, 'label', e.target.value)} placeholder="f(x)" className="h-7 text-[11px] w-16" />
            <span className="text-muted-foreground text-xs">=</span>
            <Input value={fn.expr} onChange={(e) => updateFunction(i, 'expr', e.target.value)} placeholder="sin(x), x^2, 2*x+1..." className="h-7 text-[11px] flex-1 font-mono" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-destructive" onClick={() => removeFunction(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={addFunction} className="h-7 gap-1.5 border-dashed text-[10px]">
          <Plus className="h-3 w-3" /> Agregar función
        </Button>
        <div className="text-[10px] text-muted-foreground">
          Usa: sin, cos, tan, log, ln, sqrt, abs, pi, e, ^
        </div>
      </div>
    </div>
  );

  const chartTypeInfo = CHART_TYPES.find(t => t.key === type) || CHART_TYPES[0];

  return (
    <NodeViewWrapper className="notion-chart-container my-6 group relative" data-drag-handle>
      <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:border-border/60">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border/20 bg-gradient-to-r from-secondary/30 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${currentColors[0]}20` }}>
              {React.createElement(chartTypeInfo.icon, { className: 'h-3.5 w-3.5', style: { color: currentColors[0] } })}
            </div>
            <Input
              value={title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              className="bg-transparent border-none font-semibold text-sm h-7 focus-visible:ring-0 p-0 w-full"
              placeholder="Título del gráfico..."
            />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(!isEditing)}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-4 h-[340px] w-full">
          {type === 'function' ? (
            <FunctionPlotCanvas
              functions={currentFunctions}
              xMin={currentXRange[0]}
              xMax={currentXRange[1]}
              yMin={currentYRange[0]}
              yMax={currentYRange[1]}
              showGrid={true}
              showAxes={true}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()!}
            </ResponsiveContainer>
          )}
        </div>

        {/* Editor Panel */}
        {isEditing && (
          <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300">
            {/* Chart Type Picker */}
            <div className="px-4 pt-3 pb-2 border-b border-border/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Tipo de gráfico</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {CHART_TYPES.map(ct => (
                  <Button
                    key={ct.key}
                    variant={type === ct.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeChartType(ct.key)}
                    className={cn("h-7 gap-1 text-[10px] px-2", type === ct.key && "shadow-md")}
                  >
                    <ct.icon className="h-3 w-3" />
                    {ct.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            {type !== 'function' && (
              <div className="flex border-b border-border/20">
                <button
                  className={cn("flex-1 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors", activeTab === 'data' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}
                  onClick={() => setActiveTab('data')}
                >
                  Datos
                </button>
                <button
                  className={cn("flex-1 py-2 text-[10px] uppercase font-bold tracking-wider transition-colors", activeTab === 'style' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}
                  onClick={() => setActiveTab('style')}
                >
                  Estilo
                </button>
              </div>
            )}

            <div className="p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
              {type === 'function' ? (
                renderFunctionEditor()
              ) : activeTab === 'data' ? (
                <div className="space-y-2">
                  {renderDataEditor()}
                  <Button variant="outline" size="sm" onClick={addRow} className="h-7 gap-1.5 border-dashed w-full mt-2 text-[10px]">
                    <Plus className="h-3 w-3" /> Agregar {type === 'box' ? 'Serie' : 'Fila'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Paleta de colores</span>
                    <div className="grid grid-cols-6 gap-2">
                      {PALETTES.map((pal, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => { setPaletteIdx(pIdx); updateAttributes({ colors: pal }); }}
                          className={cn("flex gap-0.5 p-1.5 rounded-lg border transition-all", paletteIdx === pIdx ? 'border-primary ring-1 ring-primary/30 scale-105' : 'border-border/30 hover:border-border')}
                        >
                          {pal.slice(0, 3).map((c, ci) => (
                            <div key={ci} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Colores individuales</span>
                    <div className="flex flex-wrap gap-2">
                      {currentColors.slice(0, Math.max(data.length, 6)).map((c: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            type="color"
                            value={c}
                            onChange={(e) => handleColorChange(idx, e.target.value)}
                            className="w-7 h-7 rounded-lg border border-border/30 cursor-pointer bg-transparent p-0"
                          />
                          <span className="text-[10px] text-muted-foreground">{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
