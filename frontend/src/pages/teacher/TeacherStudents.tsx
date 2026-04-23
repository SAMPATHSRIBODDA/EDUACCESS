import React, { useEffect, useState, useMemo } from 'react';
import {
    Search,
    Filter,
    MoreVertical,
    Mail,
    TrendingUp,
    UserPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { TeacherStudentRecord, TeacherStudentsResponse } from '../../types/api';

export const TeacherStudents: React.FC = () => {
    const { user } = useAuth();
    const [allStudents, setAllStudents] = useState<TeacherStudentRecord[]>([]);
    const [branchStudents, setBranchStudents] = useState<TeacherStudentRecord[]>([]);
    const [optedStudents, setOptedStudents] = useState<TeacherStudentRecord[]>([]);
    const [teacherBranch, setTeacherBranch] = useState('CSE');
    const [viewMode, setViewMode] = useState<'branch' | 'enrolled'>('branch');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadStudents = async () => {
            try {
                const response = await api.getTeacherStudents(user?.email) as TeacherStudentsResponse;
                if (!isMounted) return;

                setAllStudents(response.data || []);
                setBranchStudents(response.branchStudents || []);
                setOptedStudents(response.optedStudents || []);
                setTeacherBranch(response.branch || user?.branch || 'CSE');

                if ((response.branchStudents || []).length === 0 && (response.data || []).length > 0) {
                    setBranchStudents(response.data.filter((student) => student.belongsToBranch));
                }
            } catch {
                // Keep default or handle error
            }
        };

        void loadStudents();

        return () => {
            isMounted = false;
        };
    }, [user?.email]);

    const activeList = useMemo(() => {
        return viewMode === 'enrolled' ? optedStudents : branchStudents;
    }, [branchStudents, optedStudents, viewMode]);

    const filteredStudents = useMemo(() => {
        let list = activeList;

        // Filter by Search
        if (searchQuery.trim()) {
            const term = searchQuery.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.regId.toLowerCase().includes(term) ||
                s.branch.toLowerCase().includes(term) ||
                s.email.toLowerCase().includes(term) ||
                s.activeCourse.toLowerCase().includes(term)
            );
        }

        return list;
    }, [activeList, searchQuery]);

    const activeBranch = teacherBranch || branchStudents.find(s => s.belongsToBranch)?.branch || "CSE";
    const branchCount = branchStudents.length;
    const optedCount = optedStudents.length;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20 mt-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase">Students Management</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                        {viewMode === 'branch'
                            ? `Active roster for the ${activeBranch} branch`
                            : 'Students currently enrolled in your courses'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Student
                    </button>
                </div>
            </header>

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student name, ID or email..."
                        className="w-full bg-white border border-gray-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-soft focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-3 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                    <button
                        onClick={() => setViewMode('branch')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            viewMode === 'branch' ? "bg-white text-emerald-500 shadow-sm border border-emerald-50" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Branch Students ({branchCount})
                    </button>
                    <button
                        onClick={() => setViewMode('enrolled')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            viewMode === 'enrolled' ? "bg-white text-emerald-500 shadow-sm border border-emerald-50" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Opted Students ({optedCount})
                    </button>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Branch Roster</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{branchCount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Students from {activeBranch}</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Opted Students</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{optedCount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Enrolled in your courses</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-5">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Total Loaded</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{allStudents.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Live roster from the API</p>
                </div>
            </section>

            {/* Students Table */}
            <div className="card-premium overflow-hidden border-none shadow-premium bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Name</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Reg ID</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Phone No</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Course</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest text-center">Year</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest">Branch</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase text-gray-400 tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.map((student, idx) => (
                                <motion.tr
                                    key={student.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group hover:bg-emerald-50/20 transition-all cursor-pointer"
                                >
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs uppercase overflow-hidden border border-gray-100 group-hover:border-emerald-200 transition-colors">
                                                {student.avatar ? (
                                                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    student.name.split(' ').map((n: string) => n[0]).join('')
                                                )}
                                            </div>
                                            <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-500 transition-colors">{student.name}</h4>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-xs font-bold text-gray-500 tracking-tight">{student.regId}</span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-xs font-bold text-gray-500 tracking-tight">{student.phoneNumber}</span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-xs font-black text-gray-600">{student.course || "B.Tech"}</span>
                                        {student.isOpted && (
                                            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                                Enrolled in {student.enrolledCourses.length} course{student.enrolledCourses.length === 1 ? '' : 's'}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <span className="text-xs font-black text-gray-600">{student.year}</span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className={cn(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                            student.branch === activeBranch
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                : "bg-gray-50 text-gray-500 border-gray-100"
                                        )}>
                                            {student.branch}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-emerald-500 hover:border-emerald-100 transition-all">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-blue-500 hover:border-blue-100 transition-all">
                                                <TrendingUp className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-gray-900 transition-all">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Filter className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2 border-none">No Students Found</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Adjust your filters or try a different search</p>
                    </div>
                )}
            </div>

            {/* Pagination Placeholder */}
            {filteredStudents.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Showing {filteredStudents.length} Students</p>
                    <div className="flex gap-2">
                        <button className="px-5 py-2.5 rounded-xl bg-white border border-gray-100 text-[10px] font-black text-gray-400 hover:bg-gray-50 transition-all">Prev</button>
                        <button className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black shadow-lg shadow-emerald-500/20">Next &rarr;</button>
                    </div>
                </div>
            )}
        </div>
    );
};
