import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type {
  AssignmentAttemptRecord,
  AssignmentAttemptSummaryRecord,
  AssignmentRecord,
  CompilerResponse,
  CourseRecord,
} from '../../types/api';

const PRE_START_SECONDS = 30;
const DEFAULT_TEST_SECONDS = 15 * 60;
const WARNING_AUTO_SUBMIT_THRESHOLD = 5;

type FlatQuestion = {
  id: string;
  kind: 'mcq' | 'code';
  sectionTitle: string;
  questionText?: string;
  options?: Array<{ id: string; text: string }>;
  prompt?: string;
  language?: string;
  codeStarter?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
};

type SessionPhase = 'countdown' | 'testing' | 'result';

type ActiveAssignmentSession = {
  assignment: AssignmentRecord;
  questions: FlatQuestion[];
  phase: SessionPhase;
  preStartSeconds: number;
  secondsLeft: number;
  startedAtMs: number;
  warningCount: number;
  currentQuestionIndex: number;
  mcqAnswers: Record<string, string>;
  codeAnswers: Record<string, string>;
  compileResults: Record<string, CompilerResponse>;
  compileLoadingQuestionId: string;
  submitting: boolean;
  result?: AssignmentAttemptRecord;
  error?: string;
};

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

const isAssignmentLive = (assignment: AssignmentRecord) => {
  const now = new Date();
  const open = parseDateSafe(assignment.openDate);
  const close = parseDateSafe(assignment.closeDate);
  if (open && now < open) return false;
  if (close && now > close) return false;
  return true;
};

const flattenQuestions = (assignment: AssignmentRecord): FlatQuestion[] => {
  const output: FlatQuestion[] = [];
  const type = assignment.assignmentType || 'mcq';

  if (type === 'mcq') {
    if (assignment.questions && assignment.questions.length > 0) {
      assignment.questions.forEach((question) => {
        output.push({
          id: question.id,
          kind: 'mcq',
          sectionTitle: 'MCQ Section',
          questionText: question.question,
          options: question.options,
        });
      });
    } else if (assignment.mcqQuestion && assignment.options && assignment.options.length > 0) {
      output.push({
        id: 'mcq-legacy-1',
        kind: 'mcq',
        sectionTitle: 'MCQ Section',
        questionText: assignment.mcqQuestion,
        options: assignment.options,
      });
    }
  }

  if (type === 'code') {
    output.push({
      id: 'code-legacy-1',
      kind: 'code',
      sectionTitle: 'Code Section',
      prompt: assignment.prompt || 'Solve the coding challenge.',
      codeStarter: assignment.codeStarter || '',
      language: assignment.language || 'js',
      testCases: assignment.testCases || [],
    });
  }

  if (type === 'mixed') {
    (assignment.sections || []).forEach((section) => {
      if (section.sectionType === 'mcq') {
        (section.mcqQuestions || []).forEach((question) => {
          output.push({
            id: question.id,
            kind: 'mcq',
            sectionTitle: section.title,
            questionText: question.question,
            options: question.options,
          });
        });
      }

      if (section.sectionType === 'code') {
        (section.codeQuestions || []).forEach((question) => {
          output.push({
            id: question.id,
            kind: 'code',
            sectionTitle: section.title,
            prompt: question.prompt,
            codeStarter: question.codeStarter,
            language: question.language,
            testCases: question.testCases || [],
          });
        });
      }
    });
  }

  return output;
};

export const Assignments: React.FC = () => {
  const { user } = useAuth();
  const testRootRef = useRef<HTMLDivElement | null>(null);
  const securityInitializedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'code' | 'mixed'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'live' | 'upcoming' | 'closed'>('all');
  const [attemptFilter, setAttemptFilter] = useState<'all' | 'attempted' | 'not-attempted'>('all');
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [availableCourses, setAvailableCourses] = useState<CourseRecord[]>([]);
  const [enrollments, setEnrollments] = useState<{ courseId: number }[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [attempts, setAttempts] = useState<AssignmentAttemptRecord[]>([]);
  const [attemptSummary, setAttemptSummary] = useState<AssignmentAttemptSummaryRecord[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveAssignmentSession | null>(null);
  const [editorTheme, setEditorTheme] = useState<'dark' | 'light'>('dark');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesRes, allAssignmentsRes, attemptRes] = await Promise.all([
        api.getCourses(),
        api.getAssignments(undefined, selectedCourse || undefined),
        user?.email ? api.getStudentAssignmentAttempts(user.email) : Promise.resolve({ data: [], summary: [] }),
      ]);

      setAvailableCourses(coursesRes.data || []);
      if (!selectedCourse && coursesRes.data.length > 0) {
        setSelectedCourse(coursesRes.data[0].title);
      }

      setAssignments(allAssignmentsRes.data || []);
      setAttempts((attemptRes as { data: AssignmentAttemptRecord[] }).data || []);
      setAttemptSummary((attemptRes as { summary: AssignmentAttemptSummaryRecord[] }).summary || []);

      if (user?.email) {
        const enrollmentRes = await api.getEnrollments(user.email);
        setEnrollments((enrollmentRes as { data: { courseId: number }[] }).data || []);
      }
    } catch {
      setAssignments([]);
      setAttempts([]);
      setAttemptSummary([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, user?.email]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedCourseRecord = useMemo(
    () => availableCourses.find((course) => course.title === selectedCourse),
    [availableCourses, selectedCourse]
  );

  const isSelectedCourseEnrolled = useMemo(
    () => Boolean(selectedCourseRecord && enrollments.some((row) => Number(row.courseId) === Number(selectedCourseRecord.id))),
    [enrollments, selectedCourseRecord]
  );

  const courseIdByTitle = useMemo(() => {
    const map = new Map<string, number>();
    availableCourses.forEach((course) => {
      map.set(String(course.title || '').trim().toLowerCase(), Number(course.id));
    });
    return map;
  }, [availableCourses]);

  const isCourseEnrolledByTitle = useCallback((courseTitle?: string) => {
    const key = String(courseTitle || '').trim().toLowerCase();
    if (!key) return false;

    const courseId = courseIdByTitle.get(key);
    if (courseId === undefined) {
      // Allow start for legacy courses that are not present in the course catalog.
      return true;
    }

    return enrollments.some((row) => Number(row.courseId) === Number(courseId));
  }, [courseIdByTitle, enrollments]);

  const attemptSummaryByAssignment = useMemo(() => {
    const map = new Map<number, AssignmentAttemptSummaryRecord>();
    attemptSummary.forEach((row) => {
      map.set(row.assignmentId, row);
    });
    return map;
  }, [attemptSummary]);

  const filteredAssignments = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesSearch = !term || [assignment.title, assignment.course, assignment.assignmentType, assignment.language, assignment.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

      const assignmentType = (assignment.assignmentType || 'mcq') as 'mcq' | 'code' | 'mixed';
      const matchesType = typeFilter === 'all' || assignmentType === typeFilter;

      const now = new Date();
      const open = parseDateSafe(assignment.openDate);
      const close = parseDateSafe(assignment.closeDate);
      const availability = open && now < open ? 'upcoming' : close && now > close ? 'closed' : 'live';
      const matchesAvailability = availabilityFilter === 'all' || availability === availabilityFilter;

      const hasAttempt = attemptSummaryByAssignment.has(assignment.id);
      const matchesAttempt = attemptFilter === 'all'
        || (attemptFilter === 'attempted' && hasAttempt)
        || (attemptFilter === 'not-attempted' && !hasAttempt);

      return matchesSearch && matchesType && matchesAvailability && matchesAttempt;
    });
  }, [assignments, searchQuery, typeFilter, availabilityFilter, attemptFilter, attemptSummaryByAssignment]);

  const handleEnrollSelectedCourse = async () => {
    if (!user?.email || !selectedCourseRecord || isSelectedCourseEnrolled) return;

    try {
      setEnrolling(true);
      await api.enrollInCourse(user.email, selectedCourseRecord.id);
      setEnrollments((current) => {
        if (current.some((row) => Number(row.courseId) === Number(selectedCourseRecord.id))) {
          return current;
        }
        return [...current, { courseId: selectedCourseRecord.id }];
      });
    } catch {
      // keep UI stable on enroll failure
    } finally {
      setEnrolling(false);
    }
  };

  const beginAssignment = (assignment: AssignmentRecord) => {
    if (!isAssignmentLive(assignment)) return;

    const questions = flattenQuestions(assignment);
    if (questions.length === 0) return;

    securityInitializedRef.current = false;
    const plannedSeconds = assignment.timeLimit && assignment.timeLimit > 0
      ? Math.max(60, Math.round(assignment.timeLimit * 60))
      : DEFAULT_TEST_SECONDS;

    setActiveSession({
      assignment,
      questions,
      phase: 'countdown',
      preStartSeconds: PRE_START_SECONDS,
      secondsLeft: plannedSeconds,
      startedAtMs: 0,
      warningCount: 0,
      currentQuestionIndex: 0,
      mcqAnswers: {},
      codeAnswers: {},
      compileResults: {},
      compileLoadingQuestionId: '',
      submitting: false,
      error: '',
    });
  };

  const submitAssignment = useCallback(async (autoSubmitted: boolean) => {
    if (!activeSession || activeSession.phase !== 'testing' || activeSession.submitting || !user?.email) return;

    if (!autoSubmitted) {
      const codeQuestions = activeSession.questions.filter((question) => question.kind === 'code');
      const hasUnansweredCode = codeQuestions.some((question) => !String(activeSession.codeAnswers[question.id] || '').trim());
      if (hasUnansweredCode) {
        setActiveSession((current) => current ? {
          ...current,
          error: 'Write code for all code challenges before submitting.',
        } : current);
        return;
      }
    }

    setActiveSession((current) => current ? { ...current, submitting: true, error: '' } : current);

    try {
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - activeSession.startedAtMs) / 1000));
      const response = await api.submitAssignmentAttempt(activeSession.assignment.id, {
        studentEmail: user.email,
        mcqAnswers: activeSession.mcqAnswers,
        codeAnswers: activeSession.codeAnswers,
        warningCount: activeSession.warningCount,
        timeTakenSeconds: elapsedSeconds,
      });

      setActiveSession((current) => {
        if (!current) return current;
        return {
          ...current,
          phase: 'result',
          submitting: false,
          result: response.data,
          error: autoSubmitted ? 'Auto-submitted due to timer/security policy.' : '',
        };
      });

      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit assignment.';
      setActiveSession((current) => current ? { ...current, submitting: false, error: message } : current);
    }
  }, [activeSession, loadData, user?.email]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'countdown') return;
    if (activeSession.preStartSeconds <= 0) {
      setActiveSession((current) => {
        if (!current || current.phase !== 'countdown') return current;
        return { ...current, phase: 'testing', startedAtMs: Date.now() };
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
    if (!activeSession || activeSession.phase !== 'testing' || activeSession.secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setActiveSession((current) => {
        if (!current || current.phase !== 'testing') return current;
        return { ...current, secondsLeft: Math.max(0, current.secondsLeft - 1) };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (activeSession.secondsLeft > 0) return;
    void submitAssignment(true);
  }, [activeSession, submitAssignment]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (activeSession.warningCount < WARNING_AUTO_SUBMIT_THRESHOLD) return;
    void submitAssignment(true);
  }, [activeSession, submitAssignment]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'testing') return;
    if (securityInitializedRef.current) return;
    securityInitializedRef.current = true;

    const addWarning = (message: string) => {
      setActiveSession((current) => {
        if (!current || current.phase !== 'testing') return current;
        return { ...current, warningCount: current.warningCount + 1, error: message };
      });
    };

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();
    const handleClipboard = (event: ClipboardEvent) => event.preventDefault();
    const handleVisibility = () => {
      if (document.hidden) addWarning('Tab switch detected. Stay on the assignment screen.');
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a'].includes(key)) {
        event.preventDefault();
        addWarning('Copy/paste shortcuts are blocked during assignment.');
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        addWarning('Fullscreen exited. This action is tracked.');
      }
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
            error: 'Fullscreen blocked by browser. Continue carefully without switching tabs.',
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

  const runCodeCheck = async (questionId: string) => {
    const question = activeSession?.questions.find((row) => row.id === questionId);
    if (!question || question.kind !== 'code' || !activeSession) return;

    const studentCode = String(activeSession.codeAnswers[questionId] || '').trim();
    if (!studentCode) {
      setActiveSession((current) => {
        if (!current) return current;
        return {
          ...current,
          error: 'Write your solution first, then run test cases.',
          compileResults: {
            ...current.compileResults,
            [questionId]: {
              passed: false,
              message: 'No code submitted for compile check',
              results: [],
            },
          },
        };
      });
      return;
    }

    setActiveSession((current) => current ? { ...current, compileLoadingQuestionId: questionId } : current);

    try {
      const response = await api.compileAssignmentCode({
        code: studentCode,
        functionName: 'solve',
        testCases: question.testCases || [],
        language: question.language || 'js',
      });

      setActiveSession((current) => {
        if (!current) return current;
        return {
          ...current,
          compileLoadingQuestionId: '',
          compileResults: {
            ...current.compileResults,
            [questionId]: response.data,
          },
        };
      });
    } catch {
      setActiveSession((current) => {
        if (!current) return current;
        return {
          ...current,
          compileLoadingQuestionId: '',
          compileResults: {
            ...current.compileResults,
            [questionId]: { passed: false, message: 'Compile run failed', results: [] },
          },
        };
      });
    }
  };

  const exitSession = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
    securityInitializedRef.current = false;
    setActiveSession(null);
  };

  if (activeSession) {
    const currentQuestion = activeSession.questions[activeSession.currentQuestionIndex];

    if (activeSession.phase === 'countdown') {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 sm:p-10 text-center shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Get Ready</p>
            <h1 className="text-3xl font-black text-gray-900 mt-2">{activeSession.assignment.title}</h1>
            <p className="text-sm font-semibold text-gray-500 mt-2">Assignment starts in</p>
            <div className="mt-6 text-6xl font-black text-emerald-600">{activeSession.preStartSeconds}</div>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">No tab switching, no copy-paste, stay focused.</p>
            <button type="button" onClick={() => void exitSession()} className="mt-8 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest">
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
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</p>
            <h1 className="text-3xl font-black text-gray-900 mt-1">{activeSession.assignment.title}</h1>
            <p className="text-sm font-semibold text-gray-500 mt-1">Attempt #{result.attemptNumber}</p>
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">{activeSession.error}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => beginAssignment(activeSession.assignment)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600">
              <RotateCcw className="w-4 h-4" /> Retake to Improve
            </button>
            <button type="button" onClick={() => void exitSession()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest">
              <ChevronLeft className="w-4 h-4" /> Back to Assignments
            </button>
          </div>
        </div>
      );
    }

    if (!currentQuestion) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">Invalid assignment question configuration.</div>
        </div>
      );
    }

    const selectedMcqOption = activeSession.mcqAnswers[currentQuestion.id] || '';
    const compileResult = activeSession.compileResults[currentQuestion.id];
    const codeValue = activeSession.codeAnswers[currentQuestion.id] ?? '';

    return (
      <div ref={testRootRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 px-3 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center">EduAccess</div>
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
              onClick={() => setActiveSession((current) => current ? { ...current, currentQuestionIndex: Math.min(current.questions.length - 1, current.currentQuestionIndex + 1) } : current)}
              disabled={activeSession.currentQuestionIndex >= activeSession.questions.length - 1 || activeSession.submitting}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" /> {toCountdown(activeSession.secondsLeft)}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" /> Warnings {activeSession.warningCount}/{WARNING_AUTO_SUBMIT_THRESHOLD}
            </span>
          </div>
        </div>

        {activeSession.error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">{activeSession.error}</div>
        )}

        {currentQuestion.kind === 'mcq' ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-soft space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{currentQuestion.sectionTitle}</p>
              <p className="text-xs font-semibold text-gray-500">Question {activeSession.currentQuestionIndex + 1}/{activeSession.questions.length}</p>
            </div>

            <h2 className="text-xl font-black text-gray-900">{currentQuestion.questionText}</h2>

            <div className="grid grid-cols-1 gap-3">
              {(currentQuestion.options || []).map((option) => {
                const selected = selectedMcqOption === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveSession((current) => current ? { ...current, mcqAnswers: { ...current.mcqAnswers, [currentQuestion.id]: option.id } } : current)}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 rounded-3xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{currentQuestion.sectionTitle}</p>
                <button
                  type="button"
                  onClick={() => setEditorTheme((mode) => (mode === 'dark' ? 'light' : 'dark'))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest"
                >
                  {editorTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />} {editorTheme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>
              <h3 className="text-lg font-black text-gray-900">Code Challenge</h3>
              <p className="text-sm font-semibold text-gray-700 leading-relaxed">{currentQuestion.prompt}</p>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Test Cases</p>
                {(currentQuestion.testCases || []).map((testCase, index) => (
                  <div key={`${currentQuestion.id}-case-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Input</p>
                    <p className="text-xs font-mono text-gray-700 mt-1 break-all">{testCase.input}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Expected</p>
                    <p className="text-xs font-mono text-emerald-700 mt-1 break-all">{testCase.expectedOutput}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`lg:col-span-8 rounded-3xl border p-4 flex flex-col ${editorTheme === 'dark' ? 'border-gray-900 bg-gray-950' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className={`text-[10px] font-black uppercase tracking-widest ${editorTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Language: {currentQuestion.language || 'js'}
                </p>
                <button
                  type="button"
                  onClick={() => void runCodeCheck(currentQuestion.id)}
                  disabled={activeSession.compileLoadingQuestionId === currentQuestion.id || activeSession.submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5" /> {activeSession.compileLoadingQuestionId === currentQuestion.id ? 'Running...' : 'Run Check'}
                </button>
              </div>

              <textarea
                value={codeValue}
                onChange={(event) => setActiveSession((current) => current ? {
                  ...current,
                  error: '',
                  codeAnswers: { ...current.codeAnswers, [currentQuestion.id]: event.target.value },
                } : current)}
                placeholder={'Write your solution here. Define function solve(...) and return output.'}
                spellCheck={false}
                className={`w-full min-h-[280px] rounded-2xl border p-4 text-sm font-mono outline-none resize-y ${editorTheme === 'dark' ? 'border-gray-800 bg-gray-900 text-gray-100' : 'border-gray-200 bg-gray-50 text-gray-900'}`}
              />

              {compileResult && (
                <div className={`mt-3 rounded-2xl border p-4 ${compileResult.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${compileResult.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {compileResult.message}
                  </p>
                  <div className="space-y-2">
                    {compileResult.results.map((row, idx) => (
                      <div key={`${currentQuestion.id}-result-${idx}`} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${row.pass ? 'border-emerald-200 text-emerald-700 bg-white' : 'border-rose-200 text-rose-700 bg-white'}`}>
                        Case {idx + 1}: {row.pass ? 'Pass' : 'Fail'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submitAssignment(false)}
            disabled={activeSession.submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" /> {activeSession.submitting ? 'Submitting...' : 'Submit Assignment'}
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display uppercase mb-1">Assignment Center</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Quiz-style secure assignment attempts with retake</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-soft w-full md:w-[220px]">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <select
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className="w-full outline-none bg-transparent text-xs font-black uppercase tracking-widest text-gray-900 appearance-none cursor-pointer"
            >
              {availableCourses.map((course) => (
                <option key={course.id} value={course.title}>{course.title}</option>
              ))}
            </select>
          </div>

          {selectedCourseRecord && !isSelectedCourseEnrolled && (
            <button
              type="button"
              onClick={() => void handleEnrollSelectedCourse()}
              disabled={enrolling}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50"
            >
              {enrolling ? 'Enrolling...' : 'Enroll'}
            </button>
          )}

          {selectedCourseRecord && isSelectedCourseEnrolled && (
            <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">Enrolled</div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-soft w-full md:w-[300px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search assignments..."
              className="w-full outline-none bg-transparent text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | 'mcq' | 'code' | 'mixed')}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="code">Code</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value as 'all' | 'live' | 'upcoming' | 'closed')}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Availability</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
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
            <div key={index} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssignments.map((assignment, index) => {
            const summary = attemptSummaryByAssignment.get(assignment.id);
            const isAssignmentCourseEnrolled = isCourseEnrolledByTitle(assignment.course);
            const canStart = isAssignmentCourseEnrolled && isAssignmentLive(assignment);
            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white border border-gray-100 rounded-3xl p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 leading-tight">{assignment.title}</h2>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">{assignment.course}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                    {assignment.assignmentType || 'mcq'}
                  </span>
                </div>

                {summary ? (
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</p>
                    <p className="text-xs font-semibold text-emerald-800 mt-1">Attempts: {summary.attemptsCount} | Best: {summary.bestScore}% | Last: {summary.lastScore}%</p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs font-semibold text-gray-600">Not attempted yet.</div>
                )}

                {assignment.assignmentFileUrl && (
                  <a
                    href={assignment.assignmentFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                  >
                    <FileText className="w-3.5 h-3.5" /> {assignment.assignmentFileName || 'Open Attachment'}
                  </a>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Due</p>
                    <p className="font-bold text-gray-900 mt-1">{assignment.due}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black">Limit</p>
                    <p className="font-bold text-gray-900 mt-1">{assignment.timeLimit ? `${assignment.timeLimit}m` : '15m default'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => beginAssignment(assignment)}
                  disabled={!canStart}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50"
                >
                  {summary ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />} {summary ? 'Retake Assignment' : 'Start Assignment'}
                </button>
                {!canStart && (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-rose-500">
                    Enroll in this course to start
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {attempts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">My Assignment Attempts</h2>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <p className="col-span-4">Assignment</p>
              <p className="col-span-2">Score</p>
              <p className="col-span-2">Attempt</p>
              <p className="col-span-2">Warnings</p>
              <p className="col-span-2">Submitted</p>
            </div>
            {attempts.slice(0, 12).map((row) => (
              <div key={row._id} className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-700 border-t border-gray-100">
                <p className="col-span-4 truncate">{row.assignmentTitle || `Assignment #${row.assignmentId}`}</p>
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
