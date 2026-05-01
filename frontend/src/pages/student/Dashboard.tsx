import React, { useEffect, useMemo, useState } from 'react';
import { Hero } from '../../components/Hero';
import { CourseCard } from '../../components/CourseCard';
import { Sidebar } from '../../components/Sidebar';
import { FilterBar } from '../../components/FilterBar';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { AnnouncementRecord, AssignmentRecord, CourseEnrollmentRecord, CourseRecord, EventRecord, QuizRecord, ResourceRecord } from '../../types/api';
import { Search, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const [activeTopic, setActiveTopic] = useState('All');
  const [a11yOnly, setA11yOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [allCourses, setAllCourses] = useState<CourseRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentRecord[]>([]);
  const [metadata, setMetadata] = useState<{ categories: string[], topics: string[] }>({ categories: [], topics: [] });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setDashboardLoading(true);

        const [courseRes, assignmentRes, quizRes, resourceRes, announcementRes, eventRes, enrollmentRes, metaRes] = await Promise.all([
          api.getCourses('student', user?.collegeEmail),
          api.getAssignments(undefined, user?.course, user?.collegeEmail),
          api.getQuizzes(undefined, undefined, user?.collegeEmail),
          api.getResources(undefined, user?.course, user?.collegeEmail),
          api.getAnnouncements('student', user?.collegeEmail),
          api.getEvents('student', user?.collegeEmail),
          user?.email ? api.getEnrollments(user.email) : Promise.resolve({ data: [], total: 0 }),
          api.getCourseMetadata(),
        ]);

        if (!isMounted) return;

        setAllCourses(courseRes.data || []);
        setAssignments(assignmentRes.data || []);
        setQuizzes(quizRes.data || []);
        setResources(resourceRes.data || []);
        setAnnouncements(announcementRes.data || []);
        setEvents(eventRes.data || []);
        setEnrollments(enrollmentRes.data || []);
        setMetadata(metaRes.data || { categories: [], topics: [] });
      } catch {
        if (!isMounted) return;
        setAllCourses([]);
        setAssignments([]);
        setQuizzes([]);
        setResources([]);
        setAnnouncements([]);
        setEvents([]);
        setEnrollments([]);
      } finally {
        if (isMounted) {
          setDashboardLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.course]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      const matchCat = activeCategory === 'All' || course.category === activeCategory;
      const matchDiff = activeDifficulty === 'All' || course.difficulty === activeDifficulty;
      const matchTopic = activeTopic === 'All' || course.topic === activeTopic;
      const matchA11y = !a11yOnly || (course.accessibilityTags && course.accessibilityTags.length > 0);
      return matchCat && matchDiff && matchTopic && matchA11y;
    });
  }, [allCourses, activeCategory, activeDifficulty, activeTopic, a11yOnly]);

  const clearFilters = () => {
    setActiveCategory('All');
    setActiveDifficulty('All');
    setActiveTopic('All');
    setA11yOnly(false);
  };

  const completionPercent = useMemo(() => {
    if (!allCourses.length) return 0;
    const totalProgress = allCourses.reduce((sum, course) => sum + (Number(course.progress) || 0), 0);
    return totalProgress / allCourses.length;
  }, [allCourses]);

  const completedAssignments = useMemo(() => {
    return assignments.filter((assignment) => assignment.status === 'Graded').length;
  }, [assignments]);

  const upcomingEvents = useMemo(() => {
    return events.slice(0, 3).map((event) => ({
      id: event.id,
      title: event.name,
      time: [event.date, event.time].filter(Boolean).join(', '),
      location: event.location,
    }));
  }, [events]);

  const latestAnnouncements = useMemo(() => {
    return announcements.slice(0, 2).map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
    }));
  }, [announcements]);

  const enrolledCourseIds = useMemo(() => {
    return new Set((enrollments || []).map((item) => Number(item.courseId)));
  }, [enrollments]);

  const handleEnrollFromCard = async (courseId: number) => {
    if (!user?.email) return;

    try {
      await api.enrollInCourse(user.email, courseId);
      setEnrollments((current) => {
        const exists = current.some((item) => Number(item.courseId) === Number(courseId));
        if (exists) return current;
        return [
          ...current,
          {
            studentEmail: user.email,
            courseId,
            enrolledAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
          },
        ];
      });
    } catch {
      // no-op for optimistic dashboard UX
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <Hero
        studentName={user?.name}
        totalCourses={allCourses.length}
        totalAssignments={assignments.length}
        totalQuizzes={quizzes.length}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-20">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-2">Explore courses</h2>
                <p className="text-sm text-gray-400 font-medium">Discover courses designed for accessible learning success</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-soft">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            <FilterBar
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              activeDifficulty={activeDifficulty}
              setActiveDifficulty={setActiveDifficulty}
              activeTopic={activeTopic}
              setActiveTopic={setActiveTopic}
              a11yOnly={a11yOnly}
              setA11yOnly={setA11yOnly}
              onClear={clearFilters}
              categories={metadata.categories}
              topics={metadata.topics}
            />

            {dashboardLoading ? (
              <div className="grid sm:grid-cols-2 gap-8 opacity-50 pointer-events-none">
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-80 bg-gray-100 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 gap-8' : 'flex flex-col gap-6'}>
                <AnimatePresence mode="popLayout">
                  {filteredCourses.map((course) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      key={course.id}
                    >
                      <CourseCard
                        {...course}
                        id={course.id}
                        teacherName={course.teacherName || course.createdBy || 'Teacher'}
                        isEnrolled={enrolledCourseIds.has(Number(course.id))}
                        onEnroll={() => void handleEnrollFromCard(course.id)}
                        progress={enrolledCourseIds.has(Number(course.id)) ? course.progress || 0 : undefined}
                        image={resolveAssetUrl(course.image) || resolveAssetUrl(course.icon) || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600'}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {filteredCourses.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center flex flex-col items-center gap-6 shadow-soft">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <Search className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">We could not find any courses matching your current filters. Try resetting or selecting a different category.</p>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            <div className="mt-20 bg-white border border-gray-100 rounded-3xl p-10 shadow-soft grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center group">
                <p className="text-4xl font-black text-gray-900 font-display group-hover:text-emerald-500 transition-colors tracking-tight">{allCourses.length}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Approved Courses</p>
              </div>
              <div className="text-center group border-l border-gray-100">
                <p className="text-4xl font-black text-gray-900 font-display group-hover:text-emerald-500 transition-colors tracking-tight">{assignments.length}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Assignments</p>
              </div>
              <div className="text-center group border-l border-gray-100">
                <p className="text-4xl font-black text-gray-900 font-display group-hover:text-emerald-500 transition-colors tracking-tight">{quizzes.length}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Quizzes</p>
              </div>
              <div className="text-center group border-l border-gray-100">
                <p className="text-4xl font-black text-gray-900 font-display group-hover:text-emerald-500 transition-colors tracking-tight">{resources.length}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Teacher Resources</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-28 h-fit">
            <Sidebar
              progressPercent={completionPercent}
              enrolledCourses={allCourses.length}
              completedAssignments={completedAssignments}
              upcomingEvents={upcomingEvents}
              announcements={latestAnnouncements}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
