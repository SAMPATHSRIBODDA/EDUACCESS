import React, { useEffect, useState } from 'react';
import {
    Users,
    BookOpen,
    FileText,
    TrendingUp,
    Plus,
    CheckCircle,
    ArrowUpRight,
    HelpCircle,
    Folder,
    BarChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import type { AssignmentRecord, QuizRecord } from '../../types/api';

const defaultStats = [
    { label: 'Total Students', value: '0', trend: 'Live', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Total Courses', value: '0', trend: 'Live', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Assignments', value: '0', trend: 'Live', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Average Score', value: '0%', trend: 'Live', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
];

export const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [todos, setTodos] = useState<{ id: number; task: string; completed: boolean }[]>([]);
    const [stats, setStats] = useState(defaultStats);
    const [schedule, setSchedule] = useState<{ time: string; subject: string; type: string; color: string }[]>([]);
    const [courses, setCourses] = useState<{ title: string; grade: string; students: number; progress: number; icon: string }[]>([]);
    const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
    const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
    const [announcements, setAnnouncements] = useState<{ title: string; date: string; tag: string }[]>([]);

    useEffect(() => {
        let isMounted = true;

        const loadDashboard = async () => {
            if (!user?.email) return;
            try {
                const overviewRes = await api.getTeacherOverview(user.email);
                if (!overviewRes || !overviewRes.data) {
                    throw new Error('No data received from overview API');
                }
                const { stats: statsData = [], events: eventsData = [], courses: coursesData = [], announcements: announcementsData = [], assignments: assignmentsData = [], quizzes: quizzesData = [] } = overviewRes.data;

                if (!isMounted) return;

                if (statsData.length > 0) {
                    const statDecor = [
                        { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50' },
                        { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
                    ];

                    setStats(
                        statsData.slice(0, 4).map((item, index) => ({
                            label: item.label,
                            value: item.value,
                            trend: item.trend || 'Updated',
                            ...statDecor[index % statDecor.length],
                        }))
                    );
                }

                if (eventsData.length > 0) {
                    setSchedule(
                        eventsData.slice(0, 3).map((item, index) => ({
                            time: item.time,
                            subject: item.name,
                            type: item.location,
                            color: ['border-emerald-500', 'border-blue-500', 'border-slate-200'][index % 3],
                        }))
                    );
                }

                if (coursesData.length > 0) {
                    setCourses(
                        coursesData.slice(0, 3).map((item) => ({
                            title: item.title,
                            grade: item.grade || 'Grade 10',
                            students: item.students || 0,
                            progress: item.progress || 0,
                            icon: item.icon || '📘',
                        }))
                    );
                }

                if (announcementsData.length > 0) {
                    setAnnouncements(
                        announcementsData.slice(0, 3).map((item) => ({
                            title: item.title,
                            date: item.date,
                            tag: item.tag || 'General',
                        }))
                    );
                }

                setAssignments(assignmentsData);
                setQuizzes(quizzesData);
            } catch {
                // Keep fallback dashboard values when API is unavailable.
            }
        };

        void loadDashboard();

        return () => {
            isMounted = false;
        };
    }, []);

    const toggleTodo = (id: number) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const totalAssignments = assignments.length;
    const gradedAssignments = assignments.filter((assignment) => assignment.status === 'Graded').length;
    const pendingAssignments = assignments.filter((assignment) => assignment.status !== 'Graded').length;
    const assignmentCompletion = totalAssignments > 0 ? Math.round((gradedAssignments / totalAssignments) * 100) : 0;
    const averageCourseProgress = courses.length > 0
        ? Math.round(courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length)
        : 0;
    const activeQuizzes = quizzes.filter((quiz) => quiz.status !== 'archived').length;
    const classesToday = schedule.length;
    const quizAverageScores = quizzes
        .map((quiz) => {
            const numericScore = Number.parseFloat(String((quiz as any).avgScore ?? '').replace(/[^0-9.]/g, ''));
            return Number.isFinite(numericScore) ? numericScore : null;
        })
        .filter((score): score is number => score !== null);
    const averageQuizScore = quizAverageScores.length > 0
        ? `${Math.round(quizAverageScores.reduce((sum, score) => sum + score, 0) / quizAverageScores.length)}%`
        : stats[3]?.value || '0%';

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header / Intro */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight font-display mb-2 leading-tight">Welcome back, {user?.name || 'Teacher'}</h1>
                    <p className="text-sm text-gray-400 font-bold flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Overview for {new Date().getFullYear()} Academic Semester
                    </p>
                </div>
                <button
                    onClick={() => navigate('/teacher/reports')}
                    className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    Generate Report
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => {
                            if (stat.label.includes('Student')) navigate('/teacher/students');
                            if (stat.label.includes('Course')) navigate('/teacher/courses');
                            if (stat.label.includes('Assignment')) navigate('/teacher/assignments');
                            if (stat.label.includes('Score')) navigate('/teacher/grades');
                        }}
                        className="card-premium p-8 group cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", stat.bg)}>
                                <stat.icon className={cn("w-6 h-6", stat.color)} />
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg", stat.bg, stat.color)}>
                                {stat.trend}
                            </span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 font-display mb-1">{stat.value}</h3>
                        <p className="text-xs font-bold text-gray-400">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Dash Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                {/* Left: Performance & My Courses */}
                <div className="xl:col-span-2 space-y-12">
                    {/* Live Operational Snapshot */}
                    <div className="card-premium p-10 space-y-8">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">Teaching Snapshot</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Live counts from assignments, quizzes, courses, and today&apos;s schedule</p>
                            </div>
                            <span className="inline-flex w-fit px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                                Updated from overview data
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <SnapshotCard label="Assignments Pending" value={pendingAssignments} note={`${gradedAssignments} graded`} tone="rose" />
                            <SnapshotCard label="Assignment Completion" value={`${assignmentCompletion}%`} note={`${totalAssignments} total assignments`} tone="emerald" />
                            <SnapshotCard label="Active Quizzes" value={activeQuizzes} note={`${quizzes.length} quiz records`} tone="indigo" />
                            <SnapshotCard label="Today&apos;s Classes" value={classesToday} note="From live schedule feed" tone="amber" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avg. Course Progress</p>
                                <p className="text-3xl font-black text-gray-900 font-display">{averageCourseProgress}%</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Across {courses.length} active courses</p>
                            </div>
                            <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Teacher Actions</p>
                                <p className="text-3xl font-black text-gray-900 font-display">{stats[2]?.value}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Pending reviews and grading work</p>
                            </div>
                            <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Average Score</p>
                                <p className="text-3xl font-black text-gray-900 font-display">{averageQuizScore}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Calculated from quiz data</p>
                            </div>
                        </div>
                    </div>

                    {/* My Courses */}
                    <div className="space-y-8">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">My Courses</h3>
                            <button onClick={() => navigate('/teacher/courses')} className="text-[10px] font-black uppercase text-emerald-500 hover:underline">View All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {courses.map((course, i) => (
                                <div key={i} onClick={() => navigate('/teacher/courses')} className="card-premium p-8 group cursor-pointer hover:border-emerald-200 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-white transition-all group-hover:scale-110">
                                            {course.icon}
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{course.progress}%</span>
                                    </div>
                                    <h4 className="text-md font-black text-gray-900 mb-1 group-hover:text-emerald-500 transition-all">{course.title}</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">{course.grade} • {course.students} Students</p>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${course.progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-emerald-500"
                                        ></motion.div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Operational Hub */}
                <div className="space-y-12">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Create Assignment', icon: Plus, path: '/teacher/assignments' },
                            { label: 'Add Quiz', icon: HelpCircle, path: '/teacher/quizzes' },
                            { label: 'Upload Material', icon: Folder, path: '/teacher/resources' },
                            { label: 'View Reports', icon: BarChart, path: '/teacher/reports' }
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(action.path)}
                                className="card-premium p-6 flex flex-col items-center gap-3 group hover:border-emerald-200 transition-all bg-white"
                            >
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                    <action.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">{action.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Daily Schedule */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-soft">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">Today's Schedule</h3>
                            <button onClick={() => navigate('/teacher/dashboard')} className="text-[10px] font-black uppercase text-emerald-500 hover:underline">View All</button>
                        </div>
                        <div className="space-y-6">
                            {schedule.map((item, i) => (
                                <div key={i} className={cn("p-5 rounded-2xl border-l-[6px] bg-white shadow-soft transition-transform hover:scale-[1.02] cursor-pointer", item.color)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-gray-400">{item.time}</span>
                                        <ArrowUpRight className="w-3 h-3 text-gray-300" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 mb-1 leading-tight">{item.subject}</h4>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{item.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interactive To-Do List */}
                    <div className="bg-emerald-950 rounded-[2rem] p-8 text-white shadow-premium overflow-hidden relative group">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <h3 className="text-xl font-black mb-8 relative uppercase tracking-tight">To-Do List</h3>
                        <div className="space-y-4 relative">
                            {todos.map(todo => (
                                <div
                                    key={todo.id}
                                    onClick={() => toggleTodo(todo.id)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer transition-all hover:bg-white/10",
                                        todo.completed && "opacity-50 grayscale"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                        todo.completed ? "bg-emerald-500 border-emerald-500" : "border-white/20 group-hover:border-white/40"
                                    )}>
                                        {todo.completed && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={cn("text-xs font-bold", todo.completed && "line-through")}>{todo.task}</span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-8 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95">
                            Add New Task
                        </button>
                    </div>

                    {/* Announcements */}
                    <div className="card-premium p-8">
                        <h3 className="text-xl font-black text-gray-900 font-display mb-6 uppercase tracking-tight">Announcements</h3>
                        <div className="space-y-6">
                            {announcements.map((note, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg mb-2 inline-block transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                                        {note.tag}
                                    </span>
                                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{note.title}</h4>
                                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{note.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SnapshotCard: React.FC<{ label: string; value: string | number; note: string; tone: 'rose' | 'emerald' | 'indigo' | 'amber' }> = ({ label, value, note, tone }) => {
    const toneMap = {
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className={cn('rounded-3xl border p-5 bg-white shadow-soft', toneMap[tone])}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{label}</p>
            <p className="text-3xl font-black text-gray-900 font-display leading-none">{value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">{note}</p>
        </div>
    );
};
