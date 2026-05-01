import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TeacherSidebar } from '../components/TeacherSidebar';
import { TeacherNavbar } from '../components/TeacherNavbar';

export const TeacherLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fcfdfe] overflow-x-hidden relative">
      {/* Navigation Shell */}
      <TeacherSidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TeacherNavbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
