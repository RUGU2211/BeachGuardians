'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart'; // Assuming ChartConfig is exported

interface ImpactChartProps {
  data: any[]; // Data format depends on the chart type
  title: string;
  description?: string;
  config: ChartConfig; // Configuration for chart colors, labels, etc.
  dataKeys?: { name: string, colorVar: string }[]; // e.g., [{ name: 'wasteCollected', colorVar: 'var(--chart-1)' }]
}

export function ImpactChart({ data, title, description, config, dataKeys = [] }: ImpactChartProps) {
  // Prevent rendering if data is not available
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full">
        <div className="text-center text-muted-foreground">
          <p>No data available to display chart.</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)'}}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend wrapperStyle={{paddingTop: '20px'}} />
        {dataKeys.map(key => (
              <Bar key={key.name} dataKey={key.name} fill={key.colorVar} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
