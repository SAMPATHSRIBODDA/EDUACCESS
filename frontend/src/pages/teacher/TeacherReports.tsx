// TeacherReports.tsx
import React from 'react';
import { Target, Zap, Filter, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const insightBorderClasses = {
    emerald: 'border-l-emerald-500',
    blue: 'border-l-blue-500',
    orange: 'border-l-orange-500',
    purple: 'border-l-purple-500',
} as const;

const cohortColorClasses = {
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-500 text-white',
    orange: 'bg-orange-500 text-white',
    purple: 'bg-purple-500 text-white',
} as const;

const insights = [
  { label: 'Completion Rate', value: '94%', trend: '↑ 2%', theme: 'emerald' },
  { label: 'Avg. Engagement', value: '82m', trend: '↓ 5m', theme: 'blue' },
  { label: 'Quiz Failure', value: '4%', trend: 'No change', theme: 'orange' },
  { label: 'Resource View', value: '1.2k', trend: '↑ 120', theme: 'purple' },
];

export const TeacherReports: React.FC = () => {
    return (
        <div className="relative">
            <div className="space-y-12 animate-in fade-in duration-500 opacity-55 pointer-events-none select-none">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase tracking-tight">Analytics & Insights</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Aggregated performance intelligence for {new Date().getFullYear()} Academic Semester</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-white border border-gray-100 flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase text-gray-400 hover:text-emerald-500 transition-all shadow-soft">
                        <Download className="w-4 h-4" />
                        Download Report
                    </button>
                    <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                        Schedule Sync
                    </button>
                </div>
                </header>

                {/* Insight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {insights.map((insight, idx) => (
                    (() => {
                        const borderClass = insightBorderClasses[insight.theme as keyof typeof insightBorderClasses] ?? insightBorderClasses.emerald;

                        return (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn("card-premium p-8 border-l-4 group transition-all hover:bg-gray-50/50", borderClass)}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block group-hover:text-emerald-500 transition-colors">{insight.label}</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform inline-block">{insight.value}</span>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg", insight.trend.includes('↑') ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500")}>
                                {insight.trend}
                            </span>
                        </div>
                    </motion.div>
                        );
                    })()
                ))}
                </div>

                     {/* Performance Visualization Placeholder */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="card-premium p-10 h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">Active Engagement Map</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Multi-modal interaction density per student</p>
                        </div>
                        <Filter className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex-1 rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/30 flex items-center justify-center p-12 text-center">
                        <div>
                            <div className="w-20 h-20 bg-white rounded-full shadow-soft flex items-center justify-center mx-auto mb-6 text-emerald-500 hover:scale-110 transition-transform">
                                <Zap className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm font-black text-gray-900 mb-2 uppercase tracking-tight">Heatmap Visualization Ready</h4>
                            <p className="text-[10px] font-bold text-gray-400 max-w-xs mx-auto uppercase tracking-widest leading-loose">Connect real-time API logs to populate the engagement density matrix for Spring 2024 cohorts.</p>
                        </div>
                    </div>
                </div>

                <div className="card-premium p-10 h-[500px] flex flex-col">
                    <h3 className="text-xl font-black text-gray-900 font-display mb-10 uppercase tracking-tight">Top Performing Cohorts</h3>
                    <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {[
                            { name: 'Web Development 10A', score: '94%', students: '45 Active', color: 'emerald' },
                            { name: 'Data Science 12B', score: '88%', students: '28 Active', color: 'blue' },
                            { name: 'Python Mastery 11C', score: '82%', students: '32 Active', color: 'orange' },
                            { name: 'UI/UX Design 10B', score: '76%', students: '50 Active', color: 'purple' },
                        ].map((cohort, i) => (
                            (() => {
                                const cohortColorClass = cohortColorClasses[cohort.color as keyof typeof cohortColorClasses] ?? cohortColorClasses.emerald;

                                return (
                            <div key={i} className="flex items-center gap-6 group cursor-pointer">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-gray-200 border-2 border-white transition-all group-hover:scale-110", cohortColorClass)}>
                                    <Target className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{cohort.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{cohort.students}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-gray-900 group-hover:text-emerald-500 transition-colors">{cohort.score}</span>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Cohort Score</p>
                                </div>
                            </div>
                                );
                            })()
                        ))}
                    </div>
                </div>
                </div>
            </div>

            <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                <div className="max-w-md rounded-3xl border border-white/70 bg-white/65 backdrop-blur-md shadow-2xl px-8 py-7 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Coming Soon</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-gray-900">Reports Dashboard</h2>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">This section is under active development and will launch soon.</p>
                </div>
            </div>
        </div>
    );
};
