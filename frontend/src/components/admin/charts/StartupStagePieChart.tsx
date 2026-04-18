
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Startup, StartupStage } from '@/types/dashboard-types';

interface StartupStagePieChartProps {
  startups: Startup[];
}

const COLORS = {
  [StartupStage.IDEA]: '#3b82f6',
  [StartupStage.MVP]: '#8b5cf6',
  [StartupStage.GROWTH]: '#10b981',
  [StartupStage.EVALUATION]: '#f59e0b',
  [StartupStage.ADMITTED]: '#22c55e',
};

const STAGE_NAMES: { [key in StartupStage]: string } = {
  [StartupStage.EVALUATION]: 'Evaluation',
  [StartupStage.ADMITTED]: 'Admitted',
  [StartupStage.IDEA]: 'Idea',
  [StartupStage.MVP]: 'MVP',
  [StartupStage.GROWTH]: 'Growth',
};


const StartupStagePieChart: React.FC<StartupStagePieChartProps> = ({ startups }) => {
  const activeStartups = startups.filter(s =>
    s.current_stage === StartupStage.ADMITTED ||
    s.current_stage === StartupStage.IDEA ||
    s.current_stage === StartupStage.MVP ||
    s.current_stage === StartupStage.GROWTH
  );

  const stageCounts = activeStartups.reduce((acc, startup) => {
    acc[startup.current_stage] = (acc[startup.current_stage] || 0) + 1;
    return acc;
  }, {} as Record<StartupStage, number>);

  const data = Object.entries(stageCounts).map(([name, value]) => ({
    name: STAGE_NAMES[name as StartupStage],
    value,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-sm text-slate-500">
        <p>No active ventures to display in chart.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => {
            const stageKey = Object.keys(STAGE_NAMES).find(key => STAGE_NAMES[key as StartupStage] === entry.name) as StartupStage;
            return <Cell key={`cell-${index}`} fill={COLORS[stageKey] || '#cccccc'} />;
          })}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StartupStagePieChart;
