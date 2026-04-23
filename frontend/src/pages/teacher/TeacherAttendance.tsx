// TeacherAttendance.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const renderAttendanceDay = (day: number, status: 'P' | 'L' | 'A' | 'H') => {
    const bg = status === 'P' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
               status === 'L' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 
               status === 'A' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 text-gray-300';
    return (
        <motion.div 
            whileHover={{ scale: 1.1 }}
            className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black cursor-pointer transition-all", bg)}
        >
            {day}
        </motion.div>
    );
};

export const TeacherAttendance: React.FC = () => {
    return (
        <div className="relative">
            <div className="space-y-12 animate-in fade-in duration-500 opacity-55 pointer-events-none select-none">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase tracking-tight">Attendance Tracker</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Managing daily session logs for 4 active batches</p>
                </div>
                <div className="flex gap-4">
                    <select className="bg-white border border-gray-100 rounded-2xl px-6 py-3 text-xs font-black uppercase text-gray-400 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-soft">
                        <option>Web Development - 10A</option>
                        <option>Python Mastery - 11B</option>
                    </select>
                    <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                        Mark Attendance
                    </button>
                </div>
                </header>

                {/* Calendar Controls */}
                <div className="flex items-center justify-between p-8 bg-white border border-gray-100 rounded-[2rem] shadow-soft mb-8">
                <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-500 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-center">
                    <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">May 2024</h3>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mt-1">20 Working Days Recorded</p>
                </div>
                <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-500 transition-all"><ChevronRight className="w-5 h-5" /></button>
                </div>

                {/* Attendance Grid */}
                <div className="card-premium p-10 overflow-hidden border-none shadow-premium bg-white">
                <div className="grid grid-cols-7 gap-6 text-center mb-10">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <span key={day} className="text-[10px] font-black uppercase text-gray-300 tracking-widest">{day}</span>
                    ))}
                    {/* Simplified Grid Placeholder */}
                    {[...Array(31)].map((_, i) => (
                        <React.Fragment key={i}>
                            {renderAttendanceDay(i + 1, i % 5 === 0 ? 'A' : i % 7 === 0 ? 'H' : i % 10 === 0 ? 'L' : 'P')}
                        </React.Fragment>
                    ))}
                </div>

                    <div className="flex flex-wrap gap-8 mt-12 pt-10 border-t border-gray-50 bg-gray-50 px-8 py-6 rounded-[2rem]">
                    <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20"></span><span className="text-[10px] font-black uppercase text-gray-400">Present (P)</span></div>
                    <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-lg bg-orange-500 shadow-lg shadow-orange-500/20"></span><span className="text-[10px] font-black uppercase text-gray-400">Late (L)</span></div>
                    <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-lg bg-red-500 shadow-lg shadow-red-500/20"></span><span className="text-[10px] font-black uppercase text-gray-400">Absent (A)</span></div>
                    <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-lg bg-gray-200 border-2 border-white"></span><span className="text-[10px] font-black uppercase text-gray-400">Holiday (H)</span></div>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                <div className="max-w-md rounded-3xl border border-white/70 bg-white/65 backdrop-blur-md shadow-2xl px-8 py-7 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Coming Soon</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-gray-900">Attendance Module</h2>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">This section is being finalized and will be available shortly.</p>
                </div>
            </div>
        </div>
    );
};
