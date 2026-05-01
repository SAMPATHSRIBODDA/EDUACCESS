import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { CourseEnrollmentRecord, CourseRecord } from '../../types/api';

type CourseTheme = 'emerald' | 'blue' | 'orange' | 'purple';

type CourseCard = {
  id: number;
  title: string;
  grade: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  students: number;
  progress: number;
  theme: CourseTheme;
  icon: string;
  imageUrl: string;
  iconUrl: string;
  price: string;
  description: string;
};

type RazorpayPaymentSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentSuccess) => void;
};

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

function isFreeCourse(price: string) {
  const normalized = String(price || '').trim().toLowerCase();
  return !normalized || normalized === 'free' || normalized === '0' || normalized === '₹0';
}

const themeClasses = {
  emerald: {
    cardHover: 'hover:border-emerald-200',
    iconHover: 'group-hover:text-emerald-500',
  },
  blue: {
    cardHover: 'hover:border-blue-200',
    iconHover: 'group-hover:text-blue-500',
  },
  orange: {
    cardHover: 'hover:border-orange-200',
    iconHover: 'group-hover:text-orange-500',
  },
  purple: {
    cardHover: 'hover:border-purple-200',
    iconHover: 'group-hover:text-purple-500',
  },
} as const;

function toCourseCard(course: CourseRecord, index: number): CourseCard {
  const themes: CourseTheme[] = ['emerald', 'blue', 'orange', 'purple'];
  const iconRaw = String(course.icon || '').trim();
  const iconUrl = resolveAssetUrl(iconRaw);
  const imageUrl = resolveAssetUrl(course.image);

  return {
    id: course.id,
    title: course.title,
    grade: course.grade || `Grade ${10 + (index % 3)}`,
    difficulty: course.difficulty || 'Beginner',
    students: course.students || 0,
    progress: course.progress || 0,
    theme: themes[index % themes.length],
    icon: iconRaw || '📘',
    imageUrl,
    iconUrl,
    price: course.price || 'Free',
    description: course.description,
  };
}

export const Courses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'visible' | 'enrolled'>('visible');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Beginner' | 'Intermediate' | 'Advanced'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null);
  const [enrollMessage, setEnrollMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void loadApprovedCourses();
  }, [user?.email]);

  const loadApprovedCourses = async () => {
    try {
      setLoading(true);
      const [response, enrollmentRes] = await Promise.all([
        api.getCourses('student', user?.collegeEmail),
        user?.email ? api.getEnrollments(user.email) : Promise.resolve({ data: [], total: 0 }),
      ]);
      const courseCards = response.data.map((course, index) => toCourseCard(course, index));
      setCourses(courseCards);
      setEnrollments(enrollmentRes.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: number) => {
    if (!user?.email) return;

    const course = courses.find((item) => Number(item.id) === Number(courseId));
    if (!course) return;

    const alreadyEnrolled = enrollments.some((item) => Number(item.courseId) === Number(courseId));
    if (alreadyEnrolled) {
      setEnrollMessage({ type: 'success', text: 'You are already enrolled in this course.' });
      return;
    }

    setEnrollMessage(null);
    setEnrollingCourseId(courseId);

    try {
      if (isFreeCourse(course.price)) {
        const confirmed = window.confirm(`This course is free. Confirm enrollment for ${course.title}?`);
        if (!confirmed) {
          setEnrollingCourseId(null);
          return;
        }

        await api.enrollInCourse(user.email, courseId);
      } else {
        const confirmed = window.confirm(`This is a paid course (${course.price}). Continue to Razorpay payment?`);
        if (!confirmed) {
          setEnrollingCourseId(null);
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !(window as any).Razorpay) {
          throw new Error('Razorpay checkout failed to load. Please check internet and try again.');
        }

        const orderRes = await api.createCoursePaymentOrder(user.email, courseId);

        await new Promise<void>((resolve, reject) => {
          const options: RazorpayOptions = {
            key: orderRes.data.keyId,
            amount: orderRes.data.amount,
            currency: orderRes.data.currency,
            name: 'EduAccess',
            description: `Enroll in ${orderRes.data.courseTitle}`,
            order_id: orderRes.data.orderId,
            prefill: {
              name: user.name,
              email: user.email,
            },
            theme: { color: '#10b981' },
            handler: async (paymentResponse) => {
              try {
                await api.verifyCoursePaymentAndEnroll({
                  studentEmail: user.email,
                  courseId,
                  razorpayOrderId: paymentResponse.razorpay_order_id,
                  razorpayPaymentId: paymentResponse.razorpay_payment_id,
                  razorpaySignature: paymentResponse.razorpay_signature,
                });
                resolve();
              } catch (verificationError) {
                reject(verificationError);
              }
            },
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.on('payment.failed', (failedEvent: any) => {
            reject(new Error(failedEvent?.error?.description || 'Payment was not completed.'));
          });
          razorpay.open();
        });
      }

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
      setEnrollMessage({
        type: 'success',
        text: isFreeCourse(course.price)
          ? 'Successfully enrolled in free course.'
          : 'Payment successful. You are now enrolled.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enrollment failed. Please try again.';
      setEnrollMessage({ type: 'error', text: message });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const enrolledCourseIds = useMemo(
    () => new Set((enrollments || []).map((item) => Number(item.courseId))),
    [enrollments]
  );

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesView = activeView === 'visible' || enrolledCourseIds.has(Number(course.id));
      if (!matchesView) return false;

      const matchesDifficulty = difficultyFilter === 'all' || course.difficulty === difficultyFilter;
      if (!matchesDifficulty) return false;

      const isFree = isFreeCourse(course.price);
      const matchesPrice = priceFilter === 'all' || (priceFilter === 'free' && isFree) || (priceFilter === 'paid' && !isFree);
      if (!matchesPrice) return false;

      if (!normalizedSearch) return true;
      return (
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.description.toLowerCase().includes(normalizedSearch) ||
        course.grade.toLowerCase().includes(normalizedSearch) ||
        course.difficulty.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [courses, activeView, enrolledCourseIds, searchTerm, difficultyFilter, priceFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-8 font-display tracking-tight">All Courses</h1>
        <p className="text-gray-500">Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-blue-50 px-6 py-7">
        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Student Learning Hub</p>
        <h1 className="text-3xl font-black text-gray-900 font-display tracking-tight uppercase mt-1">Explore Approved Courses</h1>
        <p className="text-sm text-gray-600 font-semibold mt-2 max-w-2xl">
          Teacher uploads are reviewed by college admin, then published here for students. Enroll, track timed progress per topic, and attempt guided tests.
        </p>
        {enrollMessage && (
          <p
            className={`mt-3 text-[11px] font-black uppercase tracking-wider ${
              enrollMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {enrollMessage.text}
          </p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
            Visibility: only college-admin approved courses are shown
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="inline-flex rounded-2xl border border-gray-100 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveView('visible')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeView === 'visible' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Visible Courses ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('enrolled')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeView === 'enrolled' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            My Enrolled ({enrolledCourseIds.size})
          </button>
        </div>

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search courses, topics, or grades"
          className="w-full md:max-w-sm rounded-2xl border border-gray-100 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />

        <select
          value={difficultyFilter}
          onChange={(event) => setDifficultyFilter(event.target.value as 'all' | 'Beginner' | 'Intermediate' | 'Advanced')}
          className="w-full md:w-auto rounded-2xl border border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select
          value={priceFilter}
          onChange={(event) => setPriceFilter(event.target.value as 'all' | 'free' | 'paid')}
          className="w-full md:w-auto rounded-2xl border border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Prices</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setDifficultyFilter('all');
            setPriceFilter('all');
            setActiveView('visible');
          }}
          className="w-full md:w-auto rounded-2xl border border-gray-100 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
        >
          Reset Filters
        </button>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="card-premium p-8 text-center text-gray-500">
          <p className="font-semibold">
            {activeView === 'enrolled' ? 'No enrolled courses yet' : 'No approved courses match your filter'}
          </p>
          <p className="text-sm mt-2">
            {activeView === 'enrolled'
              ? 'Enroll from visible courses to track progress here.'
              : 'Try a different search term or check back later.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course, idx) => {
            const theme = themeClasses[course.theme as keyof typeof themeClasses] ?? themeClasses.emerald;
            const isEnrolled = (enrollments || []).some((item) => Number(item.courseId) === Number(course.id));

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={cn('card-premium p-8 group cursor-pointer transition-all relative overflow-hidden', theme.cardHover)}
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-orange-400" />
                <div
                  className={cn(
                    'w-14 h-14 rounded-3xl flex items-center justify-center text-3xl mb-8 shadow-sm border border-gray-50 bg-gray-50 group-hover:bg-white transition-all group-hover:scale-110',
                    theme.iconHover
                  )}
                >
                  {course.imageUrl ? (
                    <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover rounded-3xl" />
                  ) : course.iconUrl ? (
                    <img src={course.iconUrl} alt={course.title} className="w-full h-full object-cover rounded-3xl" />
                  ) : (
                    <span>{course.icon}</span>
                  )}
                </div>
                <h4 className="text-lg font-black text-gray-900 mb-1 group-hover:text-emerald-500 transition-colors break-words line-clamp-2">
                  {course.title}
                </h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  {course.grade} • {course.difficulty} • {course.students} Students
                </p>

                <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-100">
                  Visible Now
                </div>

                <p className="text-xs text-gray-600 mb-4 line-clamp-2 break-all">{course.description}</p>

                <div className="mb-6 pb-6 border-b border-gray-50">
                  {isFreeCourse(course.price) ? (
                    <div className="inline-block px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                      Free
                    </div>
                  ) : (
                    <div className="inline-block px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                      {course.price}
                    </div>
                  )}
                  <div className="mt-3">
                    {isEnrolled ? (
                      <>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span>Progress</span>
                          <span className="text-emerald-500">{course.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100 mt-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 1.2, delay: 0.15 }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enroll to track progress</p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleEnroll(course.id);
                          }}
                          disabled={enrollingCourseId === course.id}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white"
                        >
                          {enrollingCourseId === course.id
                            ? 'Processing...'
                            : isFreeCourse(course.price)
                            ? 'Enroll Free'
                            : 'Pay & Enroll'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-gray-600">4.8</span>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/courses/${course.id}`);
                    }}
                    className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                    title="Open course details"
                  >
                    →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
