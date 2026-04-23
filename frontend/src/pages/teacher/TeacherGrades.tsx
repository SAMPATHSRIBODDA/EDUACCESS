// TeacherGrades.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Award, 
  AlertCircle, 
  Search, 
  Filter, 
  Download,
  ChevronRight,
  BarChart3,
  PieChart,
  UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import type { GradeDistribution, StudentPerformance } from '../../types/api';

const GradeBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900">{count} Students</span>
      </div>
      <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const TeacherGrades: React.FC = () => {
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [distRes, studentRes] = await Promise.all([
        api.getGradesSummary(),
        api.getStudentPerformance()
      ]);
      setDistribution(distRes.data.distribution);
      setStats(distRes.data.stats);
      setStudents(studentRes.data);
    } catch (error) {
      console.error('Failed to load grades data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalStudents = useMemo(() => distribution.reduce((acc, curr) => acc + curr.count, 0), [distribution]);

  const filteredStudents = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return students;
    return students.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.email.toLowerCase().includes(term) ||
      s.status.toLowerCase().includes(term)
    );
  }, [students, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 mt-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase">Academic Analytics</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Global performance overview & progress tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-gray-100 p-3 rounded-xl text-gray-400 hover:text-emerald-500 transition-all shadow-soft group">
            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center">
            Generate Report
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Class Average', value: `${stats?.classAverage}%`, icon: TrendingUp, color: 'emerald' },
          { label: 'Assignments Graded', value: stats?.assignmentsGraded, icon: Award, color: 'blue' },
          { label: 'Total Assessments', value: stats?.quizzesCompleted, icon: PieChart, color: 'purple' },
          { label: 'Passing Rate', value: `${stats?.passingRate}%`, icon: UserCheck, color: 'orange' },
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-premium p-6 group cursor-default"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                `bg-${item.color}-50 text-${item.color}-500 shadow-sm border border-${item.color}-100 group-hover:bg-${item.color}-500 group-hover:text-white`
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-200 group-hover:translate-x-1 transition-transform" />
            </div>
            <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{item.value}</h4>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Grade Distribution Chart */}
        <div className="lg:col-span-4 card-premium p-8 h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Grade Distribution
            </h3>
            <Filter className="w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
          <div className="space-y-8">
            {distribution.map(item => (
              <GradeBar key={item.range} label={item.range} count={item.count} total={totalStudents} color={item.color} />
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-gray-50 bg-gray-50/30 rounded-2xl p-4">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-wider">
                Majority of students ({((distribution[2]?.count / totalStudents) * 100).toFixed(0)}%) are currently in the 60-80% bracket.
              </p>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="lg:col-span-8 card-premium overflow-hidden border-none shadow-premium bg-white">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Student Performance</h3>
            <div className="relative group w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student..." 
                className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest">Student</th>
                  <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Assignment Avg</th>
                  <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Quiz Avg</th>
                  <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Course Progress</th>
                  <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="group hover:bg-emerald-50/10 transition-all cursor-pointer">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100 group-hover:scale-105 transition-transform" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 group-hover:text-emerald-500 transition-colors truncate">{s.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold truncate tracking-tight">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center text-sm font-black text-gray-700">{s.assignmentAvg}%</td>
                    <td className="py-5 px-8 text-center text-sm font-black text-gray-700">{s.quizAvg}%</td>
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.completion}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{s.completion}%</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        s.status === 'Excelling' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        s.status === 'Average' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      )}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
