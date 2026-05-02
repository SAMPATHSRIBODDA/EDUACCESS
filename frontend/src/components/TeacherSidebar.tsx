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
  Folder,
  CalendarCheck,
  BarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useEffect, useState } from 'react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: BookOpen, label: 'My Courses', path: '/teacher/courses' },
  { icon: Users, label: 'Students', path: '/teacher/students' },
  { icon: FileText, label: 'Assignments', path: '/teacher/assignments' },
  { icon: HelpCircle, label: 'Quizzes', path: '/teacher/quizzes' },
  { icon: GraduationCap, label: 'Grades', path: '/teacher/grades' },
  { icon: MessageSquare, label: 'Messages', path: '/teacher/messages' },
  { icon: Folder, label: 'Resources', path: '/teacher/resources' },
  { icon: Settings, label: 'Settings', path: '/teacher/settings' },
];

export const TeacherSidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? 280 : (isCollapsed ? 88 : 280),
          x: isMobile ? (mobileOpen ? 0 : -280) : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "h-screen flex flex-col z-[70]",
          "fixed lg:sticky top-0 left-0",
          mobileOpen ? "shadow-2xl" : ""
        )}
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderRight: '1px solid var(--border-color)' 
        }}
      >
        {/* Header / Logo */}
        <div className="p-6 flex items-center justify-between mb-6">
          {(!isCollapsed || mobileOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">EA</div>
              <span className="font-display font-black text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>EduAccess</span>
            </motion.div>
          )}
          {isCollapsed && !mobileOpen && (
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 mx-auto">E</div>
          )}
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                isActive
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15"
                  : "hover:bg-emerald-50/10"
              )}
              style={{ color: isActive ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", (isCollapsed && !mobileOpen) && "mx-auto")} />
              {(!isCollapsed || mobileOpen) && (
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
              )}

              {/* Tooltip for collapsed mode */}
              {isCollapsed && !mobileOpen && (
                <div className="fixed left-24 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer / Collapse Toggle */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full hidden lg:flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:bg-emerald-50/10 transition-all group"
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
            <LogOut className={cn("w-5 h-5 shrink-0", (isCollapsed && !mobileOpen) && "mx-auto")} />
            {(!isCollapsed || mobileOpen) && (
              <span className="font-bold text-sm tracking-tight">Logout</span>
            )}
          </NavLink>
        </div>
      </motion.aside>
    </>
  );
};
