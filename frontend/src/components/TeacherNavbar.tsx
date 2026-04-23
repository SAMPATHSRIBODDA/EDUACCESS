import React from 'react';
import {
  Search,
  Bell,
  ChevronDown
} from 'lucide-react';

export const TeacherNavbar: React.FC = () => {
  return (
    <header className="h-20 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      {/* Search Hub */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Search students, courses, topics..."
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-emerald-500/10 transition-all"
          />
        </div>
      </div>

      {/* Actions Hub */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all group">
          <Bell className="w-5 h-5 group-active:scale-90 transition-transform" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="w-[1px] h-8 bg-gray-100 mx-2"></div>

        {/* Profile Dropdown */}
        <button className="flex items-center gap-4 group">
          <div className="text-right hidden sm:block">
            <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-500 transition-colors">Ms. Priya Sharma</h4>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Senior Faculty</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 overflow-hidden border-2 border-white shadow-soft group-hover:border-emerald-100 transition-all">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                alt="Profile"
                className="w-full h-full object-crop"
              />
            </div>
            {/* Status Dot */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-all" />
        </button>
      </div>
    </header>
  );
};
