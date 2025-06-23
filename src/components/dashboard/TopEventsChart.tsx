'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EventData {
    name: string;
    wasteCollected: number;
}

interface TopEventsChartProps {
    data: EventData[];
}

export function TopEventsChart({ data }: TopEventsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={120} 
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
        />
        <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)'}}
        />
        <Legend />
        <Bar dataKey="wasteCollected" name="Waste (kg)" fill="var(--color-wasteCollected)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
} 