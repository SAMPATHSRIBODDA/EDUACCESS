import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, PencilLine, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { CourseRecord, QuizQuestionRecord, QuizRecord, TeacherQuizResultRecord } from '../../types/api';

type QuizForm = {
  title: string;
  course: string;
  status: 'draft' | 'active' | 'archived';
  questions: QuizQuestionRecord[];
  openDate: string;
  closeDate: string;
  timeLimit: number;
};

const emptyQuestion = (index: number): QuizQuestionRecord => ({
  id: `q-${Date.now()}-${index}`,
  question: '',
  options: [
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ],
  correctOptionId: 'A',
});

const newForm = (course = ''): QuizForm => ({
  title: '',
  course,
  status: 'active',
  questions: [emptyQuestion(1)],
  openDate: '',
  closeDate: '',
  timeLimit: 30,
});

type BulkParseResult = {
  questions: QuizQuestionRecord[];
  errors: string[];
};

const parseBulk = (input: string): BulkParseResult => {
  const lines = String(input || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const questions: QuizQuestionRecord[] = [];
  const errors: string[] = [];
  let current: QuizQuestionRecord | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const active = current;
    const filled = active.options.filter((opt) => opt.text.trim());
    if (!active.question.trim() || filled.length < 2 || !filled.some((opt) => opt.id === active.correctOptionId)) {
      errors.push(`Invalid question format near: ${active.question || 'untitled question'}`);
    } else {
      questions.push(active);
    }
    current = null;
  };

  lines.forEach((line, idx) => {
    if (/^q\s*[:\-]/i.test(line) || /^\d+\s*[\).:\-]/.test(line)) {
      pushCurrent();
      current = emptyQuestion(idx + 1);
      current.question = line.replace(/^q\s*[:\-]\s*/i, '').replace(/^\d+\s*[\).:\-]\s*/, '').trim();
      return;
    }

    if (!current) {
      current = emptyQuestion(idx + 1);
      current.question = line;
      return;
    }

    const optionMatch = line.match(/^([A-D])\s*[\).:\-]\s*(.+)$/i);
    if (optionMatch) {
      const key = optionMatch[1].toUpperCase();
      current.options = current.options.map((opt) => (opt.id === key ? { ...opt, text: optionMatch[2].trim() } : opt));
      return;
    }

    const ansMatch = line.match(/^(ANS|ANSWER|CORRECT)\s*[:\-]\s*([A-D])$/i);
    if (ansMatch) {
      current.correctOptionId = ansMatch[2].toUpperCase();
      return;
    }
  });

  pushCurrent();
  if (lines.length > 0 && questions.length === 0 && errors.length === 0) {
    errors.push('Could not parse questions from input.');
  }

  return { questions, errors };
};

export const TeacherQuizzes: React.FC = () => {
  const { user } = useAuth();
  const teacherEmail = String(user?.email || '').toLowerCase();

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [form, setForm] = useState<QuizForm>(newForm(''));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  const [resultLoading, setResultLoading] = useState(false);
  const [resultData, setResultData] = useState<TeacherQuizResultRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [quizRes, courseRes] = await Promise.all([
        api.getQuizzes(teacherEmail),
        api.getCourses('teacher'),
      ]);

      setQuizzes(quizRes.data || []);
      setCourses(courseRes.data || []);
      if (!form.course && (courseRes.data || []).length > 0) {
        setForm((prev) => ({ ...prev, course: courseRes.data[0].title }));
      }
    } catch {
      setQuizzes([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [teacherEmail, form.course]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      const matchesSearch = !term || [quiz.title, quiz.course, quiz.status].some((v) => String(v || '').toLowerCase().includes(term));
      const matchesCourse = courseFilter === 'all' || String(quiz.course || '') === courseFilter;
      const normalizedStatus = (quiz.status || 'active') as 'active' | 'draft' | 'archived';
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [quizzes, search, courseFilter, statusFilter]);

  const openCreate = () => {
    setEditingQuizId(null);
    setForm(newForm(courses[0]?.title || ''));
    setBulkText('');
    setBulkErrors([]);
    setFormError('');
    setShowBuilder(true);
  };

  const openEdit = (quiz: QuizRecord) => {
    setEditingQuizId(quiz.id);
    setForm({
      title: quiz.title,
      course: quiz.course,
      status: (quiz.status || 'active') as 'draft' | 'active' | 'archived',
      questions: quiz.questions.length > 0 ? quiz.questions : [emptyQuestion(1)],
      openDate: quiz.openDate || '',
      closeDate: quiz.closeDate || '',
      timeLimit: Number(quiz.timeLimit) || 30,
    });
    setBulkText('');
    setBulkErrors([]);
    setFormError('');
    setShowBuilder(true);
  };

  const addQuestion = () => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion(prev.questions.length + 1)] }));
  };

  const removeQuestion = (questionId: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.length > 1 ? prev.questions.filter((q) => q.id !== questionId) : prev.questions,
    }));
  };

  const applyBulk = () => {
    const parsed = parseBulk(bulkText);
    if (parsed.errors.length > 0) {
      setBulkErrors(parsed.errors);
      return;
    }
    setBulkErrors([]);
    if (parsed.questions.length > 0) {
      setForm((prev) => ({ ...prev, questions: [...prev.questions, ...parsed.questions] }));
      setBulkText('');
    }
  };

  const saveQuiz = async () => {
    setFormError('');

    if (!form.title.trim() || !form.course.trim()) {
      setFormError('Quiz title and course are required.');
      return;
    }

    const validQuestions = form.questions.filter((q) => {
      const opts = q.options.filter((opt) => opt.text.trim());
      return q.question.trim() && opts.length >= 2 && opts.some((opt) => opt.id === q.correctOptionId);
    });

    if (validQuestions.length === 0) {
      setFormError('At least one valid MCQ question is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        course: form.course.trim(),
        status: form.status,
        teacherEmail,
        questions: validQuestions,
        openDate: form.openDate,
        closeDate: form.closeDate,
        timeLimit: Number(form.timeLimit) || 0,
      };

      if (editingQuizId) {
        await api.updateQuiz(editingQuizId, payload);
      } else {
        await api.createQuiz(payload);
      }

      setShowBuilder(false);
      setEditingQuizId(null);
      await loadData();
    } catch {
      setFormError('Failed to save quiz. Ensure course and fields are valid.');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (quiz: QuizRecord) => {
    if (!window.confirm(`Delete quiz "${quiz.title}"?`)) return;
    try {
      await api.deleteQuiz(quiz.id);
      await loadData();
    } catch {
      // keep page responsive on failures
    }
  };

  const openResults = async (quiz: QuizRecord) => {
    try {
      setResultLoading(true);
      const response = await api.getTeacherQuizResults(quiz.id, teacherEmail);
      setResultData(response.data);
    } catch {
      setResultData(null);
    } finally {
      setResultLoading(false);
    }
  };

  return (
    <div className="space-y-8 mt-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Teacher Quiz Manager</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Create, edit, monitor attempts, and secure behavior flags</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4" /> New Quiz
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 lg:col-span-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, course, status"
            className="w-full bg-transparent outline-none text-sm font-semibold"
          />
        </div>

        <select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.title}>{course.title}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'draft' | 'archived')}
          className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 pointer-events-none">
          {[1, 2, 3].map((id) => (
            <div key={id} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((quiz, idx) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-3xl border border-gray-100 bg-white p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">{quiz.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{quiz.course}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${quiz.status === 'active' ? 'bg-emerald-50 text-emerald-700' : quiz.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {quiz.status || 'active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Questions</p>
                  <p className="font-black text-gray-900 mt-1">{quiz.questions.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attempts</p>
                  <p className="font-black text-gray-900 mt-1">{quiz.attemptsCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Score</p>
                  <p className="font-black text-gray-900 mt-1">{quiz.avgScoreNumber ?? 0}%</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Limit</p>
                  <p className="font-black text-gray-900 mt-1">{quiz.timeLimit || 0}m</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(quiz)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest"
                >
                  <PencilLine className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void openResults(quiz)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest"
                >
                  <Users className="w-3.5 h-3.5" /> Results
                </button>
                <button
                  type="button"
                  onClick={() => void deleteQuiz(quiz)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-auto">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
              <button type="button" onClick={() => setShowBuilder(false)} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Quiz title"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                />
                <select
                  value={form.course}
                  onChange={(event) => setForm((prev) => ({ ...prev, course: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                >
                  {(courses.length === 0 ? [{ id: 0, title: form.course || 'No course', description: '', category: '', difficulty: 'Beginner', rating: 0, reviews: '', price: '', image: '' }] : courses).map((course) => (
                    <option key={course.id} value={course.title}>{course.title}</option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as 'draft' | 'active' | 'archived' }))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                >
                  <option value="active">active</option>
                  <option value="draft">draft</option>
                  <option value="archived">archived</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={form.timeLimit}
                  onChange={(event) => setForm((prev) => ({ ...prev, timeLimit: Number(event.target.value) || 0 }))}
                  placeholder="Time limit in minutes"
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                />
                <input
                  type="datetime-local"
                  value={form.openDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, openDate: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                />
                <input
                  type="datetime-local"
                  value={form.closeDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, closeDate: event.target.value }))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Bulk Question Import</p>
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder="Q: Question text\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nANS: A"
                  className="w-full min-h-[140px] rounded-xl border border-emerald-200 bg-white p-3 text-xs font-mono"
                />
                <button type="button" onClick={applyBulk} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                  Parse Bulk
                </button>
                {bulkErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    {bulkErrors.slice(0, 5).map((err, idx) => (
                      <p key={`${err}-${idx}`} className="text-xs font-semibold text-rose-700">- {err}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-800">Questions ({form.questions.length})</h3>
                  <button type="button" onClick={addQuestion} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Add
                  </button>
                </div>

                {form.questions.map((question, qIdx) => (
                  <div key={question.id} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Question {qIdx + 1}</p>
                      <button type="button" onClick={() => removeQuestion(question.id)} className="text-rose-500 text-xs font-bold">Remove</button>
                    </div>
                    <textarea
                      value={question.question}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        questions: prev.questions.map((q) => (q.id === question.id ? { ...q, question: event.target.value } : q)),
                      }))}
                      placeholder="Enter question"
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm font-semibold"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {question.options.map((option, optIdx) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((q) => (q.id === question.id ? { ...q, correctOptionId: option.id } : q)),
                            }))}
                            className={`w-7 h-7 rounded-md text-[10px] font-black ${question.correctOptionId === option.id ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                          >
                            {option.id}
                          </button>
                          <input
                            value={option.text}
                            onChange={(event) => setForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((q) =>
                                q.id === question.id
                                  ? {
                                      ...q,
                                      options: q.options.map((opt, index) =>
                                        index === optIdx ? { ...opt, text: event.target.value } : opt
                                      ),
                                    }
                                  : q
                              ),
                            }))}
                            placeholder={`Option ${option.id}`}
                            className="flex-1 rounded-xl border border-gray-200 p-2.5 text-sm font-semibold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div>{formError && <p className="text-xs font-semibold text-rose-600">{formError}</p>}</div>
              <button
                type="button"
                onClick={() => void saveQuiz()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving...' : editingQuizId ? 'Update Quiz' : 'Publish Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(resultData || resultLoading) && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-auto">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900">{resultData?.quiz.title || 'Quiz Results'}</h2>
                <p className="text-xs font-semibold text-gray-500 mt-1">Attempted vs not attempted, with best score and warning behavior</p>
              </div>
              <button type="button" onClick={() => setResultData(null)} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>

            {resultLoading ? (
              <div className="p-8 text-sm font-semibold text-gray-500">Loading results...</div>
            ) : resultData ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{resultData.stats.assignedCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attempted</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{resultData.stats.attemptedCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{resultData.stats.pendingCount}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Best Score</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{resultData.stats.averageBestScore}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Attempted Students</p>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      {resultData.attempted.length === 0 ? (
                        <p className="p-4 text-sm font-semibold text-gray-500">No one attempted this quiz yet.</p>
                      ) : (
                        resultData.attempted.map((student) => (
                          <div key={student.email} className="px-4 py-3 border-b border-gray-100 text-sm">
                            <p className="font-black text-gray-900">{student.name}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">{student.email}</p>
                            <p className="text-xs font-semibold text-gray-700 mt-1">
                              Attempts: {student.attemptsCount || 0} | Best: {student.bestScore || 0}% | Last: {student.lastScore || 0}% | Warnings: {student.lastWarningCount || 0}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Not Attempted Students</p>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      {resultData.pending.length === 0 ? (
                        <p className="p-4 text-sm font-semibold text-gray-500">All assigned students attempted this quiz.</p>
                      ) : (
                        resultData.pending.map((student) => (
                          <div key={student.email} className="px-4 py-3 border-b border-gray-100 text-sm">
                            <p className="font-black text-gray-900">{student.name}</p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">{student.email}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-sm font-semibold text-rose-600">Unable to load quiz results.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
