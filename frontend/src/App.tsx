import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/student/Landing'
import { Dashboard } from './pages/student/Dashboard'
import { GuideView } from './pages/student/GuideView'
import { Courses } from './pages/student/Courses'
import { CourseDetail } from './pages/student/CourseDetail'
import { Assignments } from './pages/student/Assignments'
import { Quizzes } from './pages/student/Quizzes'
import { Resources } from './pages/student/Resources'
import { Community } from './pages/student/Community'
import { NotificationsPage } from './pages/student/Notifications'
import { Messages } from './pages/student/Messages'
import { Profile } from './pages/student/Profile'
import { QuestionDetail } from './pages/student/QuestionDetail'

// Teacher Panel Imports
import { TeacherLayout } from './layouts/TeacherLayout'
import { TeacherDashboard } from './pages/teacher/TeacherDashboard'
import { TeacherCourses } from './pages/teacher/TeacherCourses'
import { TeacherStudents } from './pages/teacher/TeacherStudents'
import { TeacherAssignments } from './pages/teacher/TeacherAssignments'
import { TeacherQuizzes } from './pages/teacher/TeacherQuizzes'
import { TeacherGrades } from './pages/teacher/TeacherGrades'
import { TeacherMessages } from './pages/teacher/TeacherMessages'
import { TeacherResources } from './pages/teacher/TeacherResources'
import { TeacherAttendance } from './pages/teacher/TeacherAttendance'
import { TeacherReports } from './pages/teacher/TeacherReports'
import { TeacherSettings } from './pages/teacher/TeacherSettings'
import { TeacherNotifications } from './pages/teacher/TeacherNotifications'

// College Panel Imports

import { AccessibilityProvider } from './context/AccessibilityContext'
import { AccessibilityPanel } from './components/AccessibilityPanel'
import { SocketProvider } from './context/SocketContext'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <Router>
      <AuthProvider>
      <SocketProvider>
        <AccessibilityProvider>
        <div className="min-h-screen bg-[#f8fafc]">
          <Routes>
            <Route path="/" element={<><Navbar /><Landing /></>} />
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><><Navbar /><Dashboard /></></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute requiredRole="student"><><Navbar /><Courses /></></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute requiredRole="student"><><Navbar /><CourseDetail /></></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute requiredRole="student"><><Navbar /><Assignments /></></ProtectedRoute>} />
            <Route path="/quizzes" element={<ProtectedRoute requiredRole="student"><><Navbar /><Quizzes /></></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute requiredRole="student"><><Navbar /><Resources /></></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute requiredRole="student"><><Navbar /><Community /></></ProtectedRoute>} />
            <Route path="/community/q/:id" element={<ProtectedRoute requiredRole="student"><><Navbar /><QuestionDetail /></></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute requiredRole="student"><><Navbar /><NotificationsPage /></></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute requiredRole="student"><><Navbar /><Messages /></></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requiredRole="student"><><Navbar /><Profile /></></ProtectedRoute>} />
            <Route path="/guide/:id" element={<><Navbar /><GuideView /></>} />

            {/* Teacher Panel Routes */}
            <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherLayout /></ProtectedRoute>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="courses" element={<TeacherCourses />} />
              <Route path="my-courses" element={<TeacherCourses />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="quizzes" element={<TeacherQuizzes />} />
              <Route path="grades" element={<TeacherGrades />} />
              <Route path="messages" element={<TeacherMessages />} />
              <Route path="resources" element={<TeacherResources />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="reports" element={<TeacherReports />} />
              <Route path="settings" element={<TeacherSettings />} />
              <Route path="notifications" element={<TeacherNotifications />} />
            </Route>

          </Routes>

          <footer className="bg-emerald-950 text-emerald-500/50 py-8 mt-12">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="text-xl font-bold text-white mb-2">EduAccess</div>
              <p className="text-sm border-t border-emerald-900/50 pt-4 mt-4 inline-block">
                Empowering every learner with accessible education. &copy; 2026
              </p>
            </div>
          </footer>

          <AccessibilityPanel />
        </div>
      </AccessibilityProvider>
    </SocketProvider>
      </AuthProvider>
    </Router>
  )
}
