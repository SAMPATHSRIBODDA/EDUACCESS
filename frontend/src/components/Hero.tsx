import React from 'react';
import { ArrowRight, BookOpenCheck, LayoutDashboard, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type HeroProps = {
  studentName?: string;
  totalCourses: number;
  totalAssignments: number;
  totalQuizzes: number;
};

export const Hero: React.FC<HeroProps> = ({ studentName, totalCourses, totalAssignments, totalQuizzes }) => {
  return (
    <div className="relative pt-6 pb-12 lg:pt-12 lg:pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-6 font-display">
              Welcome back, {studentName || 'Student'}
            </span>
            <h1 className="text-4xl tracking-tight font-display font-black text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
              Learn. Grow. <br />
              <span className="text-emerald-500">Succeed</span> Together.
            </h1>
            <p className="mt-6 text-lg text-gray-400 sm:text-xl lg:text-base xl:text-lg max-w-lg leading-relaxed font-medium">
              Access quality education, expert guidance, and a supportive community — all in one accessible place designed for your success.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/courses" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center group">
                Explore Courses
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/dashboard" className="px-8 py-4 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center active:scale-95">
                <LayoutDashboard className="mr-2 w-5 h-5 text-emerald-500" />
                Go to Dashboard
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/assignments" className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:border-emerald-200 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assignments</p>
                <p className="text-xl font-black text-gray-900 mt-1">{totalAssignments}</p>
              </Link>
              <Link to="/quizzes" className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:border-emerald-200 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quizzes</p>
                <p className="text-xl font-black text-gray-900 mt-1">{totalQuizzes}</p>
              </Link>
              <Link to="/profile" className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left hover:border-emerald-200 transition-all flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">My Profile</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{totalCourses}</p>
                </div>
                <UserCircle2 className="w-5 h-5 text-emerald-500" />
              </Link>
            </div>
          </div>

          <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
            <div className="relative mx-auto w-full rounded-premium overflow-hidden lg:max-w-md shadow-premium border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800" 
                alt="Student learning illustration" 
                className="w-full h-auto transform transition-all duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent pointer-events-none"></div>
            </div>
            <div className="mt-5 flex items-center justify-center lg:justify-start gap-2 text-xs text-gray-500 font-semibold">
              <BookOpenCheck className="w-4 h-4 text-emerald-500" />
              Live updates from courses, assignments, quizzes, and teacher uploads.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
