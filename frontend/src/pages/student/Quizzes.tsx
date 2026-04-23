import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { QuizAttemptRecord, QuizAttemptSummaryRecord, QuizRecord } from '../../types/api';

type SessionPhase = 'countdown' | 'testing' | 'result';

type ActiveQuizSession = {
  quiz: QuizRecord;
  answers: Record<string, string>;
  phase: SessionPhase;
  currentQuestionIndex: number;
  preStartSeconds: number;
  secondsLeft: number;
  startedAtMs: number;
  warningCount: number;
  submitting: boolean;
  result?: QuizAttemptRecord;
  error?: string;
};

const PRE_START_SECONDS = 30;
const DEFAULT_TEST_SECONDS = 15 * 60;
const WARNING_AUTO_SUBMIT_THRESHOLD = 5;

const toCountdown = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const parseDateSafe = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const isQuizLive = (quiz: QuizRecord) => {
  const now = new Date();
  const start = parseDateSafe(quiz.openDate);
  const end = parseDateSafe(quiz.closeDate);
  if (quiz.status && quiz.status !== 'active') return false;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

const quizWindowLabel = (quiz: QuizRecord) => {
  const now = new Date();
  const start = parseDateSafe(quiz.openDate);
  const end = parseDateSafe(quiz.closeDate);

  if (quiz.status && quiz.status !== 'active') {
    return { text: quiz.status.toUpperCase(), tone: 'neutral' as const };
  }
  if (start && now < start) {
    return { text: `Opens ${start.toLocaleString()}`, tone: 'warning' as const };
  }
  if (end && now > end) {
    return { text: 'Closed', tone: 'neutral' as const };
  }
  return { text: 'Live', tone: 'success' as const };
};

export const Quizzes: React.FC = () => {
  const { user } = useAuth();
  const testRootRef = useRef<HTMLDivElement | null>(null);
  const securityInitializedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'live' | 'upcoming' | 'closed' | 'inactive'>('all');
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'not-attempted'>('all');
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [attemptSummary, setAttemptSummary] = useState<QuizAttemptSummaryRecord[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveQuizSession | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      setQuizzes([]);
      setAttempts([]);
      setAttemptSummary([]);
      return;
    }

    setLoading(true);
    try {
      const [quizRes, attemptRes] = await Promise.all([
        api.getQuizzes(undefined),
        api.getStudentQuizAttempts(user.email),
      ]);

      setQuizzes(quizRes.data || []);
      setAttempts(attemptRes.data || []);
      setAttemptSummary(attemptRes.summary || []);
    } catch {
      setQuizzes([]);
      setAttempts([]);
      setAttemptSummary([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summaryByQuiz = useMemo(() => {
    const map = new Map<number, QuizAttemptSummaryRecord>();
    attemptSummary.forEach((row) => {
      map.set(row.quizId, row);
    });
    return map;
  }, [attemptSummary]);

  const attemptsByQuiz = useMemo(() => {
    const map = new Map<number, QuizAttemptRecord[]>();
    attempts.forEach((row) => {
      if (!map.has(row.quizId)) {
        map.set(row.quizId, []);
      }
      map.get(row.quizId)?.push(row);
    });
    return map;
  }, [attempts]);

  const quizCourseOptions = useMemo(() => {
    return Array.from(
      new Set(
        quizzes
          .map((quiz) => String(quiz.course || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [quizzes]);

  const quizAvailability = useCallback((quiz: QuizRecord): 'live' | 'upcoming' | 'closed' | 'inactive' => {
    const now = new Date();
    const start = parseDateSafe(quiz.openDate);
    const end = parseDateSafe(quiz.closeDate);
    if (quiz.status && quiz.status !== 'active') return 'inactive';
    if (start && now < start) return 'upcoming';
    if (end && now > end) return 'closed';
    return 'live';
  }, []);

  const filteredQuizzes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesSearch = !term
        || [quiz.title, quiz.course, quiz.status].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesCourse = courseFilter === 'all' || String(quiz.course || '') === courseFilter;

      const matchesAvailability = availabilityFilter === 'all' || quizAvailability(quiz) === availabilityFilter;

      const hasAttempt = summaryByQuiz.has(quiz.id);
      const matchesAttempt = attemptFilter === 'all'
        || (attemptFilter === 'attempted' && hasAttempt)
        || (attemptFilter === 'not-attempted' && !hasAttempt);

      return matchesSearch && matchesCourse && matchesAvailability && matchesAttempt;
    });
  }, [quizzes, search, courseFilter, availabilityFilter, attemptFilter, quizAvailability, summaryByQuiz]);

  const beginQuiz = (quiz: QuizRecord) => {
    if (!isQuizLive(quiz)) return;

    securityInitializedRef.current = false;

    const plannedSeconds = quiz.timeLimit && quiz.timeLimit > 0 ? Math.max(60, Math.round(quiz.timeLimit * 60)) : DEFAULT_TEST_SECONDS;

    setActiveSession({
      quiz,
      answers: {},
      phase: 'countdown',
      currentQuestionIndex: 0,
      preStartSeconds: PRE_START_SECONDS,
      secondsLeft: plannedSeconds,
      startedAtMs: 0,
      warningCount: 0,
      submitting: false,
      error: '',
    });
  };

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'countdown') return;
    if (activeSession.preStartSeconds <= 0) {
      setActiveSession((current) => {
        if (!current || current.phase !== 'countdown') return current;
        return {
          ...current,
          phase: 'testing',
          startedAtMs: Date.now(),
        };
      });
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSession((current) => {
        if (!current || current.phase !== 'countdown') return current;
        return { ...current, preStartSeconds: Math.max(0, current.preStartSeconds - 1) };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (activeSession.secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setActiveSession((current) => {
        if (!current || current.phase !== 'testing') return current;
        return {
          ...current,
          secondsLeft: Math.max(0, current.secondsLeft - 1),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSession]);

  const submitQuiz = useCallback(
    async (autoSubmitted: boolean) => {
      if (!activeSession || !user?.email || activeSession.submitting || activeSession.phase !== 'testing') return;

      setActiveSession((current) => (current ? { ...current, submitting: true, error: '' } : current));

      try {
        const elapsed = Math.max(0, Math.round((Date.now() - activeSession.startedAtMs) / 1000));
        const response = await api.submitQuizAttempt(activeSession.quiz.id, {
          studentEmail: user.email,
          answers: activeSession.answers,
          warningCount: activeSession.warningCount,
          timeTakenSeconds: elapsed,
        });

        const attempt = response.data;

        setActiveSession((current) => {
          if (!current) return current;
          return {
            ...current,
            phase: 'result',
            submitting: false,
            result: attempt,
            error: autoSubmitted ? 'Auto-submitted due to timer/security policy.' : '',
          };
        });

        await loadData();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit quiz attempt.';
        setActiveSession((current) => (current ? { ...current, submitting: false, error: message } : current));
      }
    },
    [activeSession, loadData, user?.email]
  );

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (activeSession.secondsLeft > 0) return;
    void submitQuiz(true);
  }, [activeSession, submitQuiz]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (activeSession.warningCount < WARNING_AUTO_SUBMIT_THRESHOLD) return;
    void submitQuiz(true);
  }, [activeSession, submitQuiz]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (securityInitializedRef.current) return;
    securityInitializedRef.current = true;

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    const handleClipboard = (event: ClipboardEvent) => event.preventDefault();

    const addWarning = (message: string) => {
      setActiveSession((current) => {
        if (!current || current.phase !== 'testing') return current;
        return {
          ...current,
          warningCount: current.warningCount + 1,
          error: message,
        };
      });
    };

    const handleVisibility = () => {
      if (document.hidden) addWarning('Tab switch detected. Stay on the test screen.');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a'].includes(key)) {
        event.preventDefault();
        addWarning('Copy/paste shortcuts are blocked during quiz.');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) addWarning('Fullscreen exited. This action is tracked.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('paste', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    if (testRootRef.current?.requestFullscreen) {
      void testRootRef.current.requestFullscreen().catch(() => {
        setActiveSession((current) => {
          if (!current || current.phase !== 'testing') return current;
          return {
            ...current,
            error: 'Fullscreen permission was blocked by browser. Continue test without fullscreen, but avoid tab switching.',
          };
        });
      });
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeSession?.phase]);

  const exitSession = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore fullscreen exit errors
      }
    }
    securityInitializedRef.current = false;
    setActiveSession(null);
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    setActiveSession((current) => {
      if (!current || current.phase !== 'testing') return current;
      return {
        ...current,
        answers: {
          ...current.answers,
          [questionId]: optionId,
        },
      };
    });
  };

  if (activeSession) {
    const quiz = activeSession.quiz;
    const totalQuestions = quiz.questions.length;
    const currentQuestion = quiz.questions[activeSession.currentQuestionIndex];
    const selectedOptionId = currentQuestion ? activeSession.answers[currentQuestion.id] : '';

    if (activeSession.phase === 'countdown') {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 sm:p-10 text-center shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Get Ready</p>
            <h1 className="text-3xl font-black text-gray-900 mt-2">{quiz.title}</h1>
            <p className="text-sm font-semibold text-gray-500 mt-2">Secure quiz mode starts in</p>
            <div className="mt-6 text-6xl font-black text-emerald-600">{activeSession.preStartSeconds}</div>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">
              Rules: no tab switch, no copy-paste, and stay in fullscreen.
            </p>
            <button
              type="button"
              onClick={() => void exitSession()}
              className="mt-8 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (activeSession.phase === 'result' && activeSession.result) {
      const result = activeSession.result;
      return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8 shadow-soft flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</p>
              <h1 className="text-3xl font-black text-gray-900 mt-1">{quiz.title}</h1>
              <p className="text-sm font-semibold text-gray-500 mt-1">Attempt #{result.attemptNumber}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
              <Trophy className="w-7 h-7" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Score</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{result.score}%</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Warnings</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{result.warningCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Time Taken</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{toCountdown(result.timeTakenSeconds || 0)}</p>
            </div>
          </div>

          {activeSession.error && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
              {activeSession.error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => beginQuiz(quiz)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600"
            >
              <RotateCcw className="w-4 h-4" /> Retake to Improve
            </button>
            <button
              type="button"
              onClick={() => void exitSession()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Quiz List
            </button>
          </div>
        </div>
      );
    }

    return (
      <div ref={testRootRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 px-3 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center">
              EduAccess
            </div>
            <button
              type="button"
              onClick={() => setActiveSession((current) => current ? { ...current, currentQuestionIndex: Math.max(0, current.currentQuestionIndex - 1) } : current)}
              disabled={activeSession.currentQuestionIndex === 0 || activeSession.submitting}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              type="button"
              onClick={() => setActiveSession((current) => current ? { ...current, currentQuestionIndex: Math.min(totalQuestions - 1, current.currentQuestionIndex + 1) } : current)}
              disabled={activeSession.currentQuestionIndex >= totalQuestions - 1 || activeSession.submitting}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
              <Clock3 className="w-3.5 h-3.5" /> {toCountdown(activeSession.secondsLeft)}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" /> Warnings {activeSession.warningCount}/{WARNING_AUTO_SUBMIT_THRESHOLD}
            </span>
          </div>
        </div>

        {activeSession.error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
            {activeSession.error}
          </div>
        )}

        {currentQuestion ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-soft space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Question {activeSession.currentQuestionIndex + 1} / {totalQuestions}
              </p>
              <p className="text-xs font-semibold text-gray-500">Course: {quiz.course}</p>
            </div>

            <h2 className="text-xl font-black text-gray-900">{currentQuestion.question}</h2>

            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option) => {
                const selected = selectedOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectAnswer(currentQuestion.id, option.id)}
                    disabled={activeSession.submitting}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:border-emerald-200'}`}
                  >
                    <span className="font-black mr-2">{option.id}.</span>
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            This quiz has no valid questions.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submitQuiz(false)}
            disabled={activeSession.submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
          >
            {activeSession.submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
          <button
            type="button"
            onClick={() => void exitSession()}
            disabled={activeSession.submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest disabled:opacity-60"
          >
            Exit Attempt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display uppercase mb-1">Quiz Center</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Take, complete, and retake quizzes to improve</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-soft w-full md:w-[320px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search quizzes..."
            className="w-full outline-none bg-transparent text-sm font-semibold"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Courses</option>
          {quizCourseOptions.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        <select
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value as 'all' | 'live' | 'upcoming' | 'closed' | 'inactive')}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Availability</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={attemptFilter}
          onChange={(event) => setAttemptFilter(event.target.value as 'all' | 'attempted' | 'not-attempted')}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Attempts</option>
          <option value="attempted">Attempted</option>
          <option value="not-attempted">Not Attempted</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 pointer-events-none">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="card-premium p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpenCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase">No quizzes found</h3>
          <p className="text-sm text-gray-400 font-semibold max-w-sm mx-auto">Teachers have not published matching quizzes yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuizzes.map((quiz, index) => {
            const summary = summaryByQuiz.get(quiz.id);
            const status = quizWindowLabel(quiz);
            const isLive = isQuizLive(quiz);
            const attemptsForQuiz = attemptsByQuiz.get(quiz.id) || [];

            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">{quiz.title}</h2>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">{quiz.course}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      status.tone === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : status.tone === 'warning'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {status.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Questions</p>
                    <p className="font-bold text-gray-900 mt-1">{quiz.questions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Limit</p>
                    <p className="font-bold text-gray-900 mt-1">{quiz.timeLimit ? `${quiz.timeLimit}m` : '15m default'}</p>
                  </div>
                </div>

                {summary ? (
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </p>
                    <p className="text-xs font-semibold text-emerald-800 mt-1">
                      Attempts: {summary.attemptsCount} | Best: {summary.bestScore}% | Last: {summary.lastScore}%
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-gray-600">
                    Not attempted yet.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => beginQuiz(quiz)}
                    disabled={!isLive}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" /> {summary ? 'Retake Quiz' : 'Start Quiz'}
                  </button>
                  {attemptsForQuiz.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600">
                      <Clock3 className="w-3.5 h-3.5" /> Last: {new Date(attemptsForQuiz[0].submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {attempts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">My Attempt History</h2>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <p className="col-span-4">Quiz</p>
              <p className="col-span-2">Score</p>
              <p className="col-span-2">Attempt</p>
              <p className="col-span-2">Warnings</p>
              <p className="col-span-2">Submitted</p>
            </div>
            {attempts.slice(0, 12).map((row) => (
              <div key={row._id} className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-700 border-t border-gray-100">
                <p className="col-span-4 truncate">{row.quizTitle || `Quiz #${row.quizId}`}</p>
                <p className="col-span-2">{row.score}%</p>
                <p className="col-span-2">#{row.attemptNumber}</p>
                <p className="col-span-2">{row.warningCount}</p>
                <p className="col-span-2">{new Date(row.submittedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
