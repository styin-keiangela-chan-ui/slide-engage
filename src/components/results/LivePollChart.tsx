'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/lib/utils';

type PollDatum = {
  option_text: string;
  option_letter?: string;
  count: number;
  percentage: number;
};

type LivePollChartProps = {
  data: PollDatum[];
  type?: 'bar' | 'pie';
};

export default function LivePollChart({ data, type = 'bar' }: LivePollChartProps) {
  const chartData = data.map(item => ({
    name: item.option_letter ? `${item.option_letter}. ${item.option_text}` : item.option_text,
    votes: item.count,
    percentage: item.percentage,
  }));

  if (type === 'pie') {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="votes" nameKey="name" outerRadius={92} label>
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, props) => [`${value} votes`, props.payload.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value, name, props) => [`${value} votes (${props.payload.percentage}%)`, 'Result']} />
          <Bar dataKey="votes" radius={[0, 8, 8, 0]} animationDuration={450}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
