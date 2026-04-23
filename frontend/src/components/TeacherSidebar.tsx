import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  HelpCircle,
  GraduationCap,
  MessageSquare,
  FolderSearch,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: BookOpen, label: 'My Courses', path: '/teacher/courses' },
  { icon: Users, label: 'Students', path: '/teacher/students' },
  { icon: FileText, label: 'Assignments', path: '/teacher/assignments' },
  { icon: HelpCircle, label: 'Quizzes', path: '/teacher/quizzes' },
  { icon: GraduationCap, label: 'Grades', path: '/teacher/grades' },
  { icon: MessageSquare, label: 'Messages', path: '/teacher/messages' },
  { icon: FolderSearch, label: 'Resources', path: '/teacher/resources' },
  { icon: CalendarCheck, label: 'Attendance', path: '/teacher/attendance', comingSoon: true },
  { icon: BarChart3, label: 'Reports', path: '/teacher/reports', comingSoon: true },
  { icon: Settings, label: 'Settings', path: '/teacher/settings' },
];

export const TeacherSidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      className="h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col z-50"
    >
      {/* Header / Logo */}
      <div className="p-6 flex items-center justify-between mb-6">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">EA</div>
            <span className="font-display font-black text-xl text-gray-900 tracking-tight">EduAccess</span>
          </motion.div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 mx-auto">E</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
              isActive
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15"
                : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-500"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isCollapsed && "mx-auto")} />
            {!isCollapsed && (
              <>
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                {item.comingSoon && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
                    Coming Soon
                  </span>
                )}
              </>
            )}

            {/* Tooltip for collapsed mode */}
            {isCollapsed && (
              <div className="fixed left-24 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}{item.comingSoon ? ' · Coming Soon' : ''}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="p-4 border-t border-gray-50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-gray-50 transition-all group"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tight">Collapse Sidebar</span>
            </>
          )}
        </button>

        <NavLink
          to="/logout"
          className="mt-2 flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-50 transition-all group"
        >
          <LogOut className={cn("w-5 h-5 shrink-0", isCollapsed && "mx-auto")} />
          {!isCollapsed && (
            <span className="font-bold text-sm tracking-tight">Logout</span>
          )}
        </NavLink>
      </div>
    </motion.aside>
  );
};
