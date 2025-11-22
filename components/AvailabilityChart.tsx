import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AvailabilityChartProps {
  data: { time: string; occupied: number }[];
  capacity: number;
}

const AvailabilityChart: React.FC<AvailabilityChartProps> = ({ data, capacity }) => {
  return (
    <div className="h-48 w-full mt-4">
      <p className="text-xs text-gray-500 mb-2 font-medium">Occupancy Trend (Today)</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorOccupied" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="time" 
            tick={{fontSize: 10, fill: '#9ca3af'}} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, capacity]} 
            tick={{fontSize: 10, fill: '#9ca3af'}} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            itemStyle={{ color: '#1e40af', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="occupied" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorOccupied)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AvailabilityChart;