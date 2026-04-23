import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TeacherSidebar } from '../components/TeacherSidebar';
import { TeacherNavbar } from '../components/TeacherNavbar';

export const TeacherLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fcfdfe]">
      {/* Navigation Shell */}
      <TeacherSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <TeacherNavbar />

        <main className="flex-1 p-8 lg:p-12 overflow-y-auto max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
