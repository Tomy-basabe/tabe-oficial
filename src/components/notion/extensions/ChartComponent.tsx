import React, { useState } from 'react';
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
} from 'recharts';
import {
  Settings2,
  Plus,
  Trash2,
  BarChart2,
  TrendingUp,
  PieChart as PieChartIcon,
  Palette,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const ChartComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const { type, data, title, colors } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);

  const handleDataChange = (index: number, field: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    updateAttributes({ data: newData });
  };

  const addRow = () => {
    updateAttributes({
      data: [...data, { name: 'Nuevo', value: 0 }],
    });
  };

  const removeRow = (index: number) => {
    if (data.length <= 1) return;
    const newData = data.filter((_: any, i: number) => i !== index);
    updateAttributes({ data: newData });
  };

  const renderChart = () => {
    const chartData = data || [];
    
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={colors[0] || "#8884d8"} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
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
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            />
            <Legend />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  };

  return (
    <NodeViewWrapper className="notion-chart-container my-8 group relative">
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="p-4 border-b border-border/30 bg-secondary/20 flex items-center justify-between">
          <Input 
            value={title} 
            onChange={(e) => updateAttributes({ title: e.target.value })}
            className="bg-transparent border-none font-bold text-sm h-7 focus-visible:ring-0 p-0 w-full"
            placeholder="Título del gráfico..."
          />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => setIsEditing(!isEditing)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {isEditing && (
          <div className="border-t border-border/30 bg-background/50 backdrop-blur-sm p-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button 
                  variant={type === 'bar' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => updateAttributes({ type: 'bar' })}
                  className="gap-2"
                >
                  <BarChart2 className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase font-bold">Barras</span>
                </Button>
                <Button 
                  variant={type === 'line' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => updateAttributes({ type: 'line' })}
                  className="gap-2"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase font-bold">Líneas</span>
                </Button>
                <Button 
                  variant={type === 'pie' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => updateAttributes({ type: 'pie' })}
                  className="gap-2"
                >
                  <PieChartIcon className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase font-bold">Torta</span>
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {data.map((row: any, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    value={row.name} 
                    onChange={(e) => handleDataChange(i, 'name', e.target.value)}
                    placeholder="Etiqueta"
                    className="h-8 text-[11px]"
                  />
                  <Input 
                    type="number"
                    value={row.value} 
                    onChange={(e) => handleDataChange(i, 'value', Number(e.target.value))}
                    placeholder="Valor"
                    className="h-8 text-[11px]"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border/30 flex justify-between">
              <Button variant="outline" size="sm" onClick={addRow} className="h-8 gap-2 border-dashed">
                <Plus className="h-3.5 w-3.5" /> <span className="text-[10px] uppercase font-bold">Agregar Fila</span>
              </Button>
              <div className="flex gap-1">
                 {colors.slice(0, 6).map((c: string, idx: number) => (
                    <div 
                        key={idx} 
                        className="w-4 h-4 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform" 
                        style={{ backgroundColor: c }}
                        title="Cambiar paleta"
                        onClick={() => {
                           // Simple palette swap for demo
                           const palettes = [
                             ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'],
                             ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04'],
                             ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1']
                           ];
                           const next = palettes[(idx + 1) % palettes.length];
                           updateAttributes({ colors: next });
                        }}
                    />
                 ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
