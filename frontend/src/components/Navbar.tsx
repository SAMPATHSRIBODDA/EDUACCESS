import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const isLanding = location.pathname === '/';

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setShowProfileMenu(false);
    navigate('/');
  };

  const handleGoToProfile = () => {
    setShowProfileMenu(false);
    navigate('/profile');
  };

  const handleGoToDashboard = () => {
    setShowProfileMenu(false);
    navigate('/dashboard');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  useEffect(() => {
    if (!showProfileMenu) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showProfileMenu]);

  const [allCourses, setAllCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || isLanding) return;
    const loadCourses = async () => {
      try {
        const res = await api.getCourses('student');
        setAllCourses(res.data || []);
      } catch (err) {
        setAllCourses([]);
      }
    };
    loadCourses();
  }, [isAuthenticated, isLanding]);

  const suggestions = allCourses
    .filter(course => 
      searchQuery.length > 0 && 
      (course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       course.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(0, 5);

  const profileAvatar = (() => {
    const value = String(user?.avatar || '').trim();
    if (!value || value === 'undefined' || value === 'null') {
      return fallbackAvatar;
    }

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:image/') ||
      value.startsWith('/')
    ) {
      return value;
    }

    return fallbackAvatar;
  })();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to={isLanding ? "/" : "/dashboard"} className="flex items-center gap-2.5 group shrink-0 mr-8">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-500/20">
              EA
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Edu<span className="text-emerald-500">Access</span>
            </span>
          </Link>

          {/* Navigation Links - Center */}
          {!isLanding && (
            <div className="hidden lg:flex items-center gap-4">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/dashboard' ? '' : 'var(--text-secondary)' }}
              >
                Home
              </NavLink>
              <NavLink 
                to="/courses" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/courses' ? '' : 'var(--text-secondary)' }}
              >
                Courses
              </NavLink>
              <NavLink 
                to="/assignments" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/assignments' ? '' : 'var(--text-secondary)' }}
              >
                Assignments
              </NavLink>
              <NavLink 
                to="/quizzes" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/quizzes' ? '' : 'var(--text-secondary)' }}
              >
                Quizzes
              </NavLink>
              <NavLink 
                to="/resources" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/resources' ? '' : 'var(--text-secondary)' }}
              >
                Resources
              </NavLink>
              <NavLink 
                to="/community" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/community' ? '' : 'var(--text-secondary)' }}
              >
                Community
              </NavLink>
              <NavLink 
                to="/messages" 
                className={({ isActive }) => 
                  `font-semibold transition-all pb-1 text-sm ${isActive ? 'text-emerald-500 border-b-2 border-emerald-500' : 'font-medium hover:text-emerald-500'}`
                }
                style={{ color: location.pathname === '/messages' ? '' : 'var(--text-secondary)' }}
              >
                Messages
              </NavLink>
            </div>
          )}

          {/* Right Side Icons */}
          <div className="flex items-center gap-4">
            {!isLanding ? (
              <>
                <div className="hidden xl:block relative group">
                  <div className="flex items-center border rounded-full px-4 py-2 w-56 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                    <Search className="w-4 h-4 text-gray-400 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Search courses, topics..." 
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="bg-transparent border-none focus:outline-none text-sm w-full"
                    />
                  </div>
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-premium border border-gray-100 py-2 z-50"
                      >
                        <p className="px-4 py-1 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Suggestions</p>
                        {suggestions.map((s) => (
                          <Link 
                            key={s.id} 
                            to={`/guide/${s.id}`}
                            onClick={() => setShowSuggestions(false)}
                            className="flex flex-col px-4 py-2 hover:bg-emerald-50 transition-colors"
                          >
                            <span className="text-xs font-bold text-gray-900">{s.title}</span>
                            <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-tight">{s.category}</span>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <NavLink 
                  to="/notifications" 
                  className={({ isActive }) => 
                    `relative p-2 rounded-full transition-all ${isActive ? 'bg-emerald-50 text-emerald-500' : 'text-gray-500 hover:bg-gray-100'}`
                  }
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                </NavLink>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu((current) => !current)}
                    className="flex items-center gap-2 pl-4 border-l border-gray-100 cursor-pointer group h-10"
                  >
                    <img 
                      src={profileAvatar}
                      alt={user?.name || 'Student profile'} 
                      onError={(event) => {
                        event.currentTarget.src = fallbackAvatar;
                      }}
                      className="w-10 h-10 rounded-full border-2 border-white shadow-soft group-hover:border-emerald-500/20 transition-all"
                    />
                    <div className="hidden xl:flex flex-col text-left justify-center">
                      <p className="text-[12px] font-black leading-none" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Student'}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mt-0.5">
                        {user?.role || 'student'}
                      </p>
                    </div>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 border rounded-2xl shadow-premium p-2 z-50"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                      >
                        <button
                          type="button"
                          onClick={handleGoToDashboard}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-emerald-50"
                        >
                          Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={handleGoToProfile}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-emerald-50"
                        >
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/?login=student"
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Student Google Login
                </Link>
                <Link
                  to="/?login=teacher"
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
                >
                  Teacher Google Login
                </Link>
                <a
                  href="/super-admin-login.html"
                  className="px-4 py-2.5 bg-white border border-gray-200 hover:border-emerald-300 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Super Admin Login
                </a>
              </div>
            )}

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <NavLink to="/" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Home</NavLink>
              <NavLink to="/courses" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Courses</NavLink>
              <NavLink to="/assignments" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Assignments</NavLink>
              <NavLink to="/quizzes" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Quizzes</NavLink>
              <NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Dashboard</NavLink>
              <NavLink to="/resources" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Resources</NavLink>
              <NavLink to="/community" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Community</NavLink>
              <NavLink to="/messages" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">Messages</NavLink>
              <NavLink to="/profile" onClick={() => setIsMenuOpen(false)} className="block p-3 rounded-xl font-bold text-gray-700 hover:bg-emerald-50 transition-all">My Profile</NavLink>
              {isAuthenticated && !isLanding && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full text-left p-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all"
                >
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
