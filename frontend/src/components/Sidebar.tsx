import React from 'react';
import { Award, BookOpen, Calendar, Clock, ExternalLink, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type SidebarEvent = {
  id: number;
  title: string;
  time: string;
  location?: string;
};

type SidebarAnnouncement = {
  id: number;
  title: string;
  description: string;
};

type SidebarProps = {
  progressPercent: number;
  enrolledCourses: number;
  completedAssignments: number;
  upcomingEvents: SidebarEvent[];
  announcements: SidebarAnnouncement[];
};

export const Sidebar: React.FC<SidebarProps> = ({
  progressPercent,
  enrolledCourses,
  completedAssignments,
  upcomingEvents,
  announcements,
}) => {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const strokeLength = 251.2;
  const progressOffset = strokeLength - (strokeLength * safeProgress) / 100;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Progress Card */}
      <div className="card-premium p-6 overflow-hidden relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-black uppercase tracking-tight text-sm" style={{ color: 'var(--text-primary)' }}>Your Learning Journey</h3>
          <Link to="/profile" className="text-emerald-500 font-black text-[10px] hover:underline uppercase tracking-widest flex items-center">
            Details <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>
        
        <div className="flex items-center gap-6 mb-8 text-center">
          <div className="relative group">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-emerald-50" />
              <motion.circle 
                cx="48" cy="48" r="40" 
                stroke="currentColor" strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="251.2" 
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: progressOffset }}
                className="text-emerald-500 transition-all duration-1000" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black font-display leading-none" style={{ color: 'var(--text-primary)' }}>{safeProgress}%</span>
              <span className="text-[8px] uppercase font-black tracking-[0.2em] mt-1" style={{ color: 'var(--text-secondary)' }}>Done</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-lg font-black leading-none" style={{ color: 'var(--text-primary)' }}>{enrolledCourses}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>Enrolled</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-lg font-black leading-none" style={{ color: 'var(--text-primary)' }}>{completedAssignments}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>Completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Classes */}
      <div className="card-premium p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display font-bold text-gray-900">Upcoming Classes</h3>
          <button className="text-gray-400 hover:text-emerald-500 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((item, idx) => (
              <div key={item.id} className="flex gap-4 p-3 rounded-2xl hover:bg-emerald-50/50 transition-colors group">
                <div className={`w-12 h-12 shrink-0 rounded-2xl ${idx % 3 === 0 ? 'bg-emerald-100 text-emerald-600' : idx % 3 === 1 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  {idx % 3 === 0 ? <Calendar className="w-4 h-4" /> : idx % 3 === 1 ? <BookOpen className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 font-semibold">No upcoming classes or events yet.</p>
          )}
        </div>
        
        <Link to="/notifications" className="w-full mt-6 py-3 rounded-xl border border-gray-100 text-sm font-bold text-gray-500 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all flex items-center justify-center">
          View Schedule
        </Link>
      </div>

      {/* Community Spotlight */}
      <div className="card-premium p-6 bg-white">
        <h3 className="font-display font-black text-gray-900 uppercase tracking-tight text-sm mb-6">Community Spotlight</h3>
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Link key={announcement.id} to="/notifications" className="block rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Announcement</p>
                <p className="text-sm font-black mt-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{announcement.title}</p>
                <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{announcement.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-500">
            No latest announcements. Check back soon.
          </div>
        )}
      </div>
    </div>
  );
};
