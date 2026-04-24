// TeacherCourses.tsx
import React, { useEffect, useState } from 'react';
import { Plus, X, FlaskConical, CheckCircle2, Trash2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { CodeEvaluationResponse, CourseCreateInput, CourseRecord } from '../../types/api';

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

type CourseTheme = 'emerald' | 'blue' | 'orange' | 'purple';

type CourseCard = {
    id: number;
    title: string;
    grade: string;
    students: number;
    progress: number;
    plannedMinutes: number;
    theme: CourseTheme;
    icon: string;
    image?: string;
    status?: "pending" | "approved" | "rejected";
};

const fallbackCourseList: CourseCard[] = [];

type OptionForm = {
    id: string;
    text: string;
};

type CodeCaseForm = {
    input: string;
    expectedOutput: string;
};

type LectureModuleType = 'pdf' | 'ppt' | 'video';

type LectureModuleForm = {
    id: string;
    title: string;
    fileUrl: string;
    fileType: LectureModuleType;
    notes: string;
};

type LectureTestForm = {
    id: string;
    title: string;
    type: 'mcq' | 'code';
    mcqQuestion: string;
    options: OptionForm[];
    correctOptionId: string;
    prompt: string;
    functionName: string;
    testCases: CodeCaseForm[];
    language: string;
};

type LectureForm = {
    id: string;
    title: string;
    summary: string;
    documentUrl: string;
    documentName: string;
    modules: LectureModuleForm[];
    testTime?: number;
    tests: LectureTestForm[];
};

type UnitForm = {
    id: string;
    title: string;
    lectures: LectureForm[];
};

type CourseForm = {
    title: string;
    description: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    grade: string;
    topic: string;
    icon: string;
    image: string;
    isFree: boolean;
    price: string;
    units: UnitForm[];
};

function makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function makeEmptyMcqTest(): LectureTestForm {
    const options = [
        { id: 'opt-1', text: '' },
        { id: 'opt-2', text: '' },
        { id: 'opt-3', text: '' },
        { id: 'opt-4', text: '' },
    ];

    return {
        id: makeId('test'),
        title: 'MCQ Test',
        type: 'mcq',
        mcqQuestion: '',
        options,
        correctOptionId: options[0].id,
        prompt: '',
        functionName: '',
        testCases: [],
        language: 'js',
    };
}

function makeEmptyCodeTest(): LectureTestForm {
    return {
        id: makeId('test'),
        title: 'Coding Test',
        type: 'code',
        mcqQuestion: '',
        options: [],
        correctOptionId: '',
        prompt: '',
        functionName: 'solve',
        testCases: [
            { input: '[2,3]', expectedOutput: '5' },
            { input: '[10,5]', expectedOutput: '15' },
        ],
        language: 'js',
    };
}

function makeEmptyLectureModule(): LectureModuleForm {
    return {
        id: makeId('mod'),
        title: '',
        fileUrl: '',
        fileType: 'pdf',
        notes: '',
    };
}

function detectModuleType(value: string): LectureModuleType {
    const lower = String(value || '').toLowerCase();
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'ppt';
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov')) return 'video';
    return 'pdf';
}

function makeEmptyLecture(): LectureForm {
    return {
        id: makeId('lec'),
        title: '',
        summary: '',
        documentUrl: '',
        documentName: '',
        modules: [],
        testTime: 30,
        tests: [],
    };
}

function makeEmptyUnit(): UnitForm {
    return {
        id: makeId('unit'),
        title: '',
        lectures: [makeEmptyLecture()],
    };
}

function makeInitialCourseForm(): CourseForm {
    return {
        title: '',
        description: '',
        category: 'Programming',
        difficulty: 'Beginner',
        grade: '',
        topic: '',
        icon: '📘',
        image: '',
        isFree: true,
        price: '',
        units: [makeEmptyUnit()],
    };
}

function toCourseCard(course: CourseRecord, index: number): CourseCard {
    const themes: CourseTheme[] = ['emerald', 'blue', 'orange', 'purple'];
    const plannedMinutes = (course.units || []).reduce((sum, unit) => {
        return sum + (unit.lectures || []).reduce((lectureSum, lecture) => {
            return lectureSum + (Number((lecture as any).testTimeMinutes || 30) || 30);
        }, 0);
    }, 0);
    return {
        id: course.id,
        title: course.title,
        grade: course.grade || `Grade ${10 + (index % 3)}`,
        students: course.students || 0,
        progress: course.progress || 0,
        plannedMinutes,
        theme: themes[index % themes.length],
        icon: resolveAssetUrl(course.icon) || '📘',
        image: resolveAssetUrl(course.image),
        status: course.status,
    };
}

export const TeacherCourses: React.FC = () => {
    const { user } = useAuth();
    const [courseList, setCourseList] = useState<CourseCard[]>(fallbackCourseList);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');
    const [courseForm, setCourseForm] = useState<CourseForm>(makeInitialCourseForm());
    const [codeDraftByTest, setCodeDraftByTest] = useState<Record<string, string>>({});
    const [codeResultByTest, setCodeResultByTest] = useState<Record<string, CodeEvaluationResponse>>({});
    const [compilingTestId, setCompilingTestId] = useState('');
    const [step, setStep] = useState(1);
    const totalSteps = 3;
    const [activeAssessmentBulkId, setActiveAssessmentBulkId] = useState<string | null>(null);
    const [assessmentBulkText, setAssessmentBulkText] = useState('');
    const [assessmentBulkErrors, setAssessmentBulkErrors] = useState<string[]>([]);

    const parseBulkMCQText = (text: string): { questions: Array<{ question: string; options: OptionForm[]; correctOptionId: string }>; errors: string[] } => {
        const lines = String(text || '')
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((line, index) => ({ text: line.trim(), lineNumber: index + 1 }))
            .filter((entry) => Boolean(entry.text));

        const results: Array<{ question: string; options: OptionForm[]; correctOptionId: string }> = [];
        const errors: string[] = [];
        let cur: { question: string; options: OptionForm[]; correctOptionId: string } | null = null;
        let currentOptionIndex = 0;
        let currentQuestionNumber = 0;
        let currentQuestionStartLine = 0;

        const pushCurrent = () => {
            if (!cur) return;

            const label = currentQuestionNumber > 0 ? `Question ${currentQuestionNumber}` : 'Question';
            const validOptions = cur.options.filter((option) => option.text.trim());
            const hasQuestion = Boolean(cur.question.trim());
            const hasEnoughOptions = validOptions.length >= 2;
            const answerKey = cur.correctOptionId;
            const hasValidAnswer = validOptions.some((option) => option.id === answerKey);

            if (!hasQuestion && validOptions.length === 0) {
                cur = null;
                currentOptionIndex = 0;
                return;
            }

            if (!hasQuestion) {
                errors.push(`${label} (around line ${currentQuestionStartLine}) is missing question text.`);
            } else if (!hasEnoughOptions) {
                errors.push(`${label} (around line ${currentQuestionStartLine}) needs at least 2 options.`);
            } else if (!hasValidAnswer) {
                errors.push(`${label} (around line ${currentQuestionStartLine}) has an invalid answer key.`);
            } else {
                results.push(cur);
            }

            cur = null;
            currentOptionIndex = 0;
        };

        lines.forEach(({ text: line, lineNumber }) => {
            const isQuestionStart = /^\d+\s*[\).:\-]\s*/.test(line) || /^q(?:uestion)?\s*[:\-]/i.test(line);
            const isOptionLine = /^[a-d]\s*[\).:\-]/i.test(line);
            const isAnswerLine = /^(?:correct|answer|ans)\s*[:\-]/i.test(line);

            if (isQuestionStart && !isOptionLine && !isAnswerLine) {
                pushCurrent();
                currentQuestionNumber += 1;
                currentQuestionStartLine = lineNumber;
                cur = {
                    question: line.replace(/^\d+\s*[\).:\-]\s*/, '').replace(/^q(?:uestion)?\s*[:\-]\s*/i, '').trim(),
                    options: [
                        { id: 'opt-1', text: '' },
                        { id: 'opt-2', text: '' },
                        { id: 'opt-3', text: '' },
                        { id: 'opt-4', text: '' },
                    ],
                    correctOptionId: 'opt-1',
                };
                currentOptionIndex = 0;
                return;
            }

            if (!cur) {
                currentQuestionNumber += 1;
                currentQuestionStartLine = lineNumber;
                cur = {
                    question: '',
                    options: [
                        { id: 'opt-1', text: '' },
                        { id: 'opt-2', text: '' },
                        { id: 'opt-3', text: '' },
                        { id: 'opt-4', text: '' },
                    ],
                    correctOptionId: 'opt-1',
                };
            }

            if (isOptionLine) {
                const optionMatch = line.match(/^([a-d])\s*[\).:\-]\s*(.+)$/i);
                if (optionMatch) {
                    const optionLetter = optionMatch[1].toLowerCase();
                    const optionText = optionMatch[2].trim();
                    const optionIndexMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
                    const optionIndex = optionIndexMap[optionLetter];
                    cur.options[optionIndex].text = optionText;
                    currentOptionIndex = Math.min(optionIndex + 1, 4);
                }
                return;
            }

            if (isAnswerLine) {
                const ans = line.replace(/^(?:correct|answer|ans)\s*[:\-]\s*/i, '').trim().toUpperCase();
                const answerMapping: Record<string, string> = { A: 'opt-1', B: 'opt-2', C: 'opt-3', D: 'opt-4' };
                if (answerMapping[ans]) {
                    cur.correctOptionId = answerMapping[ans];
                } else {
                    errors.push(`Line ${lineNumber}: answer must be A, B, C, or D.`);
                }
                return;
            }

            if (!cur.question) {
                cur.question = line.replace(/^q(?:uestion)?\s*[:\-]\s*/i, '').trim();
                return;
            }

            if (currentOptionIndex < 4) {
                cur.options[currentOptionIndex].text = line;
                currentOptionIndex += 1;
                return;
            }

            pushCurrent();
            currentQuestionNumber += 1;
            currentQuestionStartLine = lineNumber;
            cur = {
                question: line.replace(/^q(?:uestion)?\s*[:\-]\s*/i, '').trim(),
                options: [
                    { id: 'opt-1', text: '' },
                    { id: 'opt-2', text: '' },
                    { id: 'opt-3', text: '' },
                    { id: 'opt-4', text: '' },
                ],
                correctOptionId: 'opt-1',
            };
            currentOptionIndex = 0;
        });

        pushCurrent();

        if (lines.length > 0 && results.length === 0 && errors.length === 0) {
            errors.push('Could not parse any question. Check the bulk format and try again.');
        }

        return { questions: results, errors };
    };

    useEffect(() => {
        let isMounted = true;

        const loadTeacherCourses = async () => {
            try {
                const response = await api.getCourses('teacher');
                if (isMounted && response.data.length > 0) {
                    const themedCourses = response.data.map((course, index) => toCourseCard(course, index));
                    setCourseList(themedCourses);
                }
            } catch {
                // Keep fallback course list if API request fails.
            }
        };

        void loadTeacherCourses();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!editingCourseId) return;

        let isMounted = true;

        const loadCourseForEditing = async () => {
            try {
                const response = await api.getCourses('teacher');
                const course = response.data.find(c => c.id === editingCourseId);
                
                if (isMounted && course) {
                    setCourseForm({
                        title: course.title || '',
                        description: course.description || '',
                        category: course.category || 'Programming',
                        difficulty: course.difficulty || 'Beginner',
                        grade: course.grade || '',
                        topic: course.topic || '',
                        icon: course.icon || '📘',
                        image: course.image || '',
                        isFree: course.price === 'Free',
                        price: course.price !== 'Free' ? course.price : '',
                        units: (course.units || []).map(unit => ({
                            id: unit.id,
                            title: unit.title,
                            lectures: (unit.lectures || []).map(lecture => ({
                                id: lecture.id,
                                title: lecture.title || '',
                                summary: lecture.summary || '',
                                documentUrl: lecture.documentUrl || '',
                                documentName: lecture.documentName || '',
                                modules: (() => {
                                    const rawModules = (lecture.modules || []).map((module, moduleIndex) => {
                                        const pptUrl = resolveAssetUrl(module.pptUrl);
                                        const pdfUrl = resolveAssetUrl(module.pdfUrl);
                                        const videoUrl = resolveAssetUrl(module.videoUrl);
                                        const fileUrl = pptUrl || pdfUrl || videoUrl || '';
                                        if (!fileUrl && !module.title && !module.notes) return null;

                                        const fileType: LectureModuleType = pptUrl
                                            ? 'ppt'
                                            : videoUrl
                                                ? 'video'
                                                : 'pdf';

                                        return {
                                            id: module.id || makeId(`mod-${moduleIndex}`),
                                            title: module.title || `Module ${moduleIndex + 1}`,
                                            fileUrl,
                                            fileType,
                                            notes: module.notes || '',
                                        };
                                    }).filter(Boolean) as LectureModuleForm[];

                                    if (rawModules.length > 0) return rawModules;
                                    if (!lecture.documentUrl) return [];

                                    return [{
                                        id: makeId('mod'),
                                        title: lecture.documentName || lecture.title || 'Module 1',
                                        fileUrl: resolveAssetUrl(lecture.documentUrl),
                                        fileType: detectModuleType(`${lecture.documentName || ''} ${lecture.documentUrl || ''}`),
                                        notes: lecture.summary || '',
                                    }];
                                })(),
                                testTime: Number((lecture as any).testTimeMinutes || (lecture as any).testTime || 30) || 30,
                                tests: (lecture.tests || []).map(test => ({
                                    id: test.id,
                                    title: test.title || '',
                                    type: test.type,
                                    mcqQuestion: test.mcqQuestion || '',
                                    options: test.options || [],
                                    correctOptionId: test.correctOptionId || '',
                                    prompt: test.prompt || '',
                                    functionName: test.functionName || '',
                                    testCases: test.testCases || [],
                                    language: test.language || 'javascript',
                                })),
                            })),
                        })),
                    });
                }
            } catch (error) {
                console.error('Failed to load course for editing:', error);
            }
        };

        void loadCourseForEditing();

        return () => {
            isMounted = false;
        };
    }, [editingCourseId]);

    const updateUnit = (unitId: string, updater: (unit: UnitForm) => UnitForm) => {
        setCourseForm((prev) => ({
            ...prev,
            units: prev.units.map((u) => (u.id === unitId ? updater(u) : u)),
        }));
    };

    const addUnit = () => {
        setCourseForm((prev) => ({
            ...prev,
            units: [...prev.units, makeEmptyUnit()],
        }));
    };

    const removeUnit = (unitId: string) => {
        setCourseForm((prev) => ({
            ...prev,
            units: prev.units.length === 1 ? prev.units : prev.units.filter((u) => u.id !== unitId),
        }));
    };

    const updateLecture = (unitId: string, lectureId: string, updater: (lecture: LectureForm) => LectureForm) => {
        updateUnit(unitId, (unit) => ({
            ...unit,
            lectures: unit.lectures.map((l) => (l.id === lectureId ? updater(l) : l)),
        }));
    };

    const addLecture = (unitId: string) => {
        updateUnit(unitId, (unit) => ({
            ...unit,
            lectures: [...unit.lectures, makeEmptyLecture()],
        }));
    };

    const removeLecture = (unitId: string, lectureId: string) => {
        updateUnit(unitId, (unit) => ({
            ...unit,
            lectures: unit.lectures.length === 1 ? unit.lectures : unit.lectures.filter((l) => l.id !== lectureId),
        }));
    };

    const addLectureModule = (unitId: string, lectureId: string) => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            modules: [...lecture.modules, makeEmptyLectureModule()],
        }));
    };

    const updateLectureModule = (
        unitId: string,
        lectureId: string,
        moduleId: string,
        updater: (moduleItem: LectureModuleForm) => LectureModuleForm
    ) => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            modules: lecture.modules.map((moduleItem) => (moduleItem.id === moduleId ? updater(moduleItem) : moduleItem)),
        }));
    };

    const removeLectureModule = (unitId: string, lectureId: string, moduleId: string) => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            modules: lecture.modules.filter((moduleItem) => moduleItem.id !== moduleId),
        }));
    };

    const addTestToLecture = (unitId: string, lectureId: string, type: 'mcq' | 'code') => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            tests: [...lecture.tests, type === 'mcq' ? makeEmptyMcqTest() : makeEmptyCodeTest()],
        }));
    };

    const removeTest = (unitId: string, lectureId: string, testId: string) => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            tests: lecture.tests.filter((test) => test.id !== testId),
        }));
    };

    const updateTest = (unitId: string, lectureId: string, testId: string, updater: (test: LectureTestForm) => LectureTestForm) => {
        updateLecture(unitId, lectureId, (lecture) => ({
            ...lecture,
            tests: lecture.tests.map((test) => (test.id === testId ? updater(test) : test)),
        }));
    };

    const runCompileCheck = async (test: LectureTestForm) => {
        const sourceCode = codeDraftByTest[test.id] || '';
        if (!sourceCode.trim()) {
            setFormError('Write sample code before running compiler check.');
            return;
        }
        if (!test.functionName.trim() || test.testCases.length === 0) {
            setFormError('Coding test must have function name and at least one test case.');
            return;
        }

        try {
            setFormError('');
            setCompilingTestId(test.id);
            const response = await api.compileCourseCode({
                code: sourceCode,
                functionName: test.functionName,
                testCases: test.testCases,
            });
            setCodeResultByTest((prev) => ({ ...prev, [test.id]: response.data }));
        } catch {
            setFormError('Compiler check failed. Please verify your function and test cases.');
        } finally {
            setCompilingTestId('');
        }
    };

    const handleCreateCourse = async () => {
        setFormError('');

        if (!courseForm.title.trim() || !courseForm.description.trim()) {
            setFormError('Course title and description are required.');
            return;
        }

        for (const unit of courseForm.units) {
            if (!unit.title.trim()) {
                setFormError('Each unit must have a title.');
                return;
            }

            for (const lecture of unit.lectures) {
                if (!lecture.title.trim()) {
                    setFormError(`Topic in "${unit.title}" must have a title.`);
                    return;
                }

                for (const test of lecture.tests) {
                    if (!test.title.trim()) {
                        setFormError(`Assessment in "${lecture.title}" must have a title.`);
                        return;
                    }

                    if (test.type === 'mcq') {
                        const validOptions = test.options.filter((option) => option.text.trim());
                        if (!test.mcqQuestion.trim() || validOptions.length < 2) {
                            setFormError(`MCQ in "${lecture.title}" needs a question and at least two options.`);
                            return;
                        }
                    }

                    if (test.type === 'code' && (!test.functionName.trim() || test.testCases.length === 0)) {
                        setFormError(`Coding test in "${lecture.title}" needs a function name and test cases.`);
                        return;
                    }
                }
            }
        }

        const payload: CourseCreateInput = {
            ...(courseForm.image.trim() ? { image: courseForm.image.trim() } : {}),
            title: courseForm.title.trim(),
            description: courseForm.description.trim(),
            category: courseForm.category.trim(),
            difficulty: courseForm.difficulty,
            grade: courseForm.grade.trim(),
            topic: courseForm.topic.trim(),
            icon: courseForm.icon.trim() || '📘',
            price: courseForm.isFree ? 'Free' : courseForm.price.trim() || 'Free',
            panels: ['teacher', 'student'],
            units: courseForm.units.map(unit => ({
                id: unit.id,
                title: unit.title.trim(),
                lectures: unit.lectures.map(lecture => {
                    const normalizedModules = (lecture.modules || [])
                        .filter((moduleItem) => moduleItem.fileUrl.trim() || moduleItem.title.trim() || moduleItem.notes.trim())
                        .map((moduleItem, moduleIndex) => ({
                            id: moduleItem.id,
                            title: moduleItem.title.trim() || `Module ${moduleIndex + 1}`,
                            pdfUrl: moduleItem.fileType === 'pdf' ? moduleItem.fileUrl.trim() : '',
                            pptUrl: moduleItem.fileType === 'ppt' ? moduleItem.fileUrl.trim() : '',
                            videoUrl: moduleItem.fileType === 'video' ? moduleItem.fileUrl.trim() : '',
                            notes: moduleItem.notes.trim(),
                        }));

                    const fallbackModuleUrl = normalizedModules[0]?.pdfUrl || normalizedModules[0]?.pptUrl || normalizedModules[0]?.videoUrl || '';

                    return {
                        id: lecture.id,
                        title: lecture.title.trim(),
                        summary: lecture.summary.trim(),
                        testTimeMinutes: Math.min(600, Math.max(1, Number(lecture.testTime || 30) || 30)),
                        documentUrl: lecture.documentUrl.trim() || fallbackModuleUrl,
                        documentName: lecture.documentName.trim() || normalizedModules[0]?.title || '',
                        modules: normalizedModules,
                        tests: lecture.tests.map(test => ({
                            id: test.id,
                            title: test.title.trim(),
                            type: test.type,
                            mcqQuestion: test.mcqQuestion.trim(),
                            options: test.options.filter(o => o.text.trim()),
                            correctOptionId: test.correctOptionId,
                            prompt: test.prompt.trim(),
                            functionName: test.functionName.trim(),
                            testCases: test.testCases,
                            language: test.language,
                        }))
                    };
                }),
                createdBy: user?.email || 'teacher@edu.com',
            }))
        };

        try {
            setCreating(true);
            const response = editingCourseId 
                ? await api.updateCourse(editingCourseId, payload)
                : await api.createCourse(payload);

            setCourseList((prev) => {
                if (editingCourseId) {
                    // Update existing course in list
                    return prev.map(c => c.id === editingCourseId ? toCourseCard(response.data, 0) : c);
                } else {
                    // Add new course to list
                    return [toCourseCard(response.data, prev.length), ...prev];
                }
            });
            setCourseForm(makeInitialCourseForm());
            setEditingCourseId(null);
            setShowCreateModal(false);
            setCodeDraftByTest({});
            setCodeResultByTest({});
        } catch {
            setFormError(editingCourseId ? 'Failed to update course. Please try again.' : 'Failed to create course. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase tracking-tight">My Courses</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Managing {courseList.length} active curriculum modules</p>
                </div>
                <button
                    onClick={() => {
                        setFormError('');
                        setStep(1);
                        setShowCreateModal(true);
                    }}
                    className="btn-premium group flex items-center gap-3"
                >
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/40 transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                    <span>New Course</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {courseList.map((course, idx) => (
                    (() => {
                        const theme = themeClasses[course.theme as keyof typeof themeClasses] ?? themeClasses.emerald;

                        return (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className={cn("card-premium p-8 group cursor-pointer transition-all", theme.cardHover)}
                            >
                                <div className={cn("w-14 h-14 rounded-3xl flex items-center justify-center text-3xl mb-8 shadow-sm border border-gray-50 bg-gray-50 group-hover:bg-white transition-all group-hover:scale-110 overflow-hidden", theme.iconHover)}>
                                    {course.image ? (
                                        <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                                    ) : course.icon && (course.icon.startsWith('/') || course.icon.startsWith('http')) ? (
                                        <img src={course.icon} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{course.icon}</span>
                                    )}
                                </div>
                                <h4 className="text-lg font-black text-gray-900 mb-1 group-hover:text-emerald-500 transition-colors">{course.title}</h4>
                                <div className="flex items-center gap-2 mb-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{course.grade} • {course.students} Students</p>
                                    {course.status && (
                                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg whitespace-nowrap", 
                                            course.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            course.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            'bg-rose-100 text-rose-700'
                                        )}>
                                            {course.status === 'approved' ? '✓ Approved' : 
                                             course.status === 'pending' ? '⏳ Pending' : 
                                             '✗ Rejected'}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <span>Curriculum Progress</span>
                                        <span className="text-emerald-500">{course.progress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${course.progress}%` }}
                                            transition={{ duration: 1.5, delay: 0.5 }}
                                            className="h-full bg-emerald-500 rounded-full"
                                        ></motion.div>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                                        Planned Timer Load: {course.plannedMinutes} min
                                    </p>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-50 flex gap-3">
                                    <button 
                                        onClick={() => {
                                            setEditingCourseId(course.id);
                                            setCourseForm(prev => ({
                                                ...prev,
                                                // Form will be populated when fetching course details
                                            }));
                                            setStep(1);
                                            setShowCreateModal(true);
                                        }}
                                        className="flex-1 py-2.5 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all"
                                    >
                                        Edit Course
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })()
                ))}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md p-4 md:p-8 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-[95vw] lg:max-w-5xl max-h-[92vh] bg-white rounded-3xl md:rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Modal Header */}
                        <div className="px-5 md:px-8 py-5 md:py-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                            <div className="flex-1">
                                <h1 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight mb-3">
                                    {editingCourseId ? '✏️ Edit Course' : '➕ Create Course'}
                                </h1>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                                        {step}
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                        {step === 1 ? 'Course Basics' : step === 2 ? 'Curriculum' : 'Review & Publish'}
                                    </h2>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
                                    Step {step} of {totalSteps} • {step === 1 ? 'General details' : step === 2 ? 'Lectures & Tests' : 'Final check'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingCourseId(null);
                                    setCourseForm(makeInitialCourseForm());
                                    setStep(1);
                                }}
                                className="w-10 h-10 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
                            >
                                <X className="w-5 h-5 mx-auto" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / totalSteps) * 100}%` }}
                                className="h-full bg-emerald-500"
                            />
                        </div>

                        <div className="p-5 md:p-8 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Course Title</label>
                                            <input
                                                value={courseForm.title}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, title: event.target.value }))}
                                                placeholder="e.g. Advanced Web Systems"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                                            <input
                                                value={courseForm.category}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, category: event.target.value }))}
                                                placeholder="e.g. Programming"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Difficulty Level</label>
                                            <select
                                                value={courseForm.difficulty}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, difficulty: event.target.value as CourseForm['difficulty'] }))}
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                                            >
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Grade Target</label>
                                            <input
                                                value={courseForm.grade}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, grade: event.target.value }))}
                                                placeholder="e.g. Grade 10"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Course Thumbnail (Visible to Students)</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="md:col-span-1">
                                                <div className="aspect-square rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center overflow-hidden group relative transition-all hover:border-emerald-200">
                                                    {courseForm.image ? (
                                                        <>
                                                            <img src={courseForm.image} alt="Course Preview" className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={() => setCourseForm(p => ({ ...p, image: '' }))}
                                                                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center text-center p-6 space-y-3">
                                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500">
                                                                <Upload className="w-6 h-6" />
                                                            </div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase leading-tight">Drop Image or Click</p>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    const reader = new FileReader();
                                                                    reader.onload = async () => {
                                                                        try {
                                                                            const uploadRes = await api.uploadLectureDocument(file.name, reader.result as string);
                                                                            setCourseForm(p => ({ ...p, image: uploadRes.data.fileUrl }));
                                                                        } catch (error) {
                                                                            const message = error instanceof Error ? error.message : 'Image upload failed.';
                                                                            setFormError(message || 'Image upload failed.');
                                                                        }
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 flex flex-col justify-center space-y-4">
                                                <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100/50">
                                                    <p className="text-[11px] font-black text-emerald-700 uppercase mb-2">Pro Tip:</p>
                                                    <p className="text-xs text-emerald-600/70 leading-relaxed font-semibold">
                                                        High-quality course images increase student enrollment by up to <strong>40%</strong>. Use a clear 1:1 aspect ratio image.
                                                    </p>
                                                </div>
                                                {courseForm.image && (
                                                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 className="w-4 h-4" /> Upload Successful
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Parent Topic</label>
                                            <input
                                                value={courseForm.topic}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, topic: event.target.value }))}
                                                placeholder="e.g. Data Structures"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Pricing Mode</label>
                                            <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                                <button
                                                    onClick={() => setCourseForm(p => ({ ...p, isFree: true, price: '' }))}
                                                    className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", courseForm.isFree ? "bg-white shadow-sm text-emerald-500" : "text-gray-400 hover:text-gray-600")}
                                                >Free</button>
                                                <button
                                                    onClick={() => setCourseForm(p => ({ ...p, isFree: false }))}
                                                    className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", !courseForm.isFree ? "bg-white shadow-sm text-emerald-500" : "text-gray-400 hover:text-gray-600")}
                                                >Paid</button>
                                            </div>
                                        </div>
                                    </div>

                                    {!courseForm.isFree && (
                                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Price Amount</label>
                                            <input
                                                type="text"
                                                value={courseForm.price}
                                                onChange={(event) => setCourseForm((prev) => ({ ...prev, price: event.target.value }))}
                                                placeholder="e.g. ₹999"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                                        <textarea
                                            value={courseForm.description}
                                            onChange={(event) => setCourseForm((prev) => ({ ...prev, description: event.target.value }))}
                                            placeholder="Tell students what they will learn..."
                                            className="w-full min-h-[120px] rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Syllabus Architecture</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Organize your course into units and lectures</p>
                                        </div>
                                        <button
                                            onClick={addUnit}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-900/10 active:scale-95 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Unit
                                        </button>
                                    </div>

                                    <div className="space-y-12">
                                        {courseForm.units.map((unit, unitIndex) => (
                                            <div key={unit.id} className="space-y-6">
                                                <div className="flex items-center gap-4 group/unit">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-emerald-500/20">
                                                        {unitIndex + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            value={unit.title}
                                                            onChange={(e) => updateUnit(unit.id, p => ({ ...p, title: e.target.value }))}
                                                            placeholder="UNIT TITLE (E.G. BASICS OF DATA STRUCTURES)"
                                                            className="w-full bg-transparent border-none focus:ring-0 text-lg font-black text-gray-900 uppercase tracking-tight placeholder:text-gray-200"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeUnit(unit.id)} className="p-3 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover/unit:opacity-100"><Trash2 className="w-5 h-5" /></button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6 pl-4 md:pl-10 lg:pl-16 border-l-2 border-gray-50">
                                                    {unit.lectures.map((lecture, _lectureIndex) => (
                                                        <div key={lecture.id} className="group relative bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                            <div className="p-1 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between px-6 py-4 gap-4">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <input
                                                                        type="text"
                                                                        value={lecture.title}
                                                                        onChange={(e) => updateLecture(unit.id, lecture.id, (prev) => ({ ...prev, title: e.target.value }))}
                                                                        placeholder="Lecture name"
                                                                        className="bg-transparent border-none focus:ring-0 text-sm font-black text-gray-900 uppercase tracking-tight placeholder:text-gray-300 w-full"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex flex-col gap-1">
                                                                        <label className="text-[8px] font-black text-gray-400 uppercase">Test Time</label>
                                                                        <input
                                                                            type="number"
                                                                            value={lecture.testTime || 30}
                                                                            onChange={(e) => updateLecture(unit.id, lecture.id, (prev) => ({ ...prev, testTime: parseInt(e.target.value) || 30 }))}
                                                                            min="1"
                                                                            max="180"
                                                                            placeholder="mins"
                                                                            className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeLecture(unit.id, lecture.id)}
                                                                        className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="p-8 space-y-8">
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                                    {/* Left: Content Summary & Asset */}
                                                                    <div className="space-y-6">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Learning Summary</label>
                                                                            <textarea
                                                                                value={lecture.summary}
                                                                                onChange={(event) => updateLecture(unit.id, lecture.id, (prev) => ({ ...prev, summary: event.target.value }))}
                                                                                placeholder="What will students learn in this topic?"
                                                                                className="w-full min-h-[100px] rounded-2xl border border-gray-100 bg-gray-50/30 px-5 py-4 text-sm font-semibold focus:bg-white transition-all outline-none"
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Study Asset (PDF/PPTX/IMAGE/VIDEO/AUDIO/TEXT)</label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    id={`file-${lecture.id}`}
                                                                                    accept=".pdf,.pptx,.doc,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.ogg,.mp3,.wav,.m4a"
                                                                                    onChange={async (event) => {
                                                                                        const file = event.currentTarget.files?.[0];
                                                                                        if (!file) return;

                                                                                        const lowerName = file.name.toLowerCase();
                                                                                        if (lowerName.endsWith('.ppt')) {
                                                                                            alert('Legacy .ppt files are not supported for reliable inline preview. Please upload .pptx or .pdf.');
                                                                                            event.currentTarget.value = '';
                                                                                            return;
                                                                                        }

                                                                                        const reader = new FileReader();
                                                                                        reader.onload = async () => {
                                                                                            const fileData = reader.result;
                                                                                            try {
                                                                                                const uploadRes = await api.uploadLectureDocument(file.name, fileData as string);
                                                                                                updateLecture(unit.id, lecture.id, (prev) => ({
                                                                                                    ...prev,
                                                                                                    documentUrl: uploadRes.data.fileUrl,
                                                                                                    documentName: file.name,
                                                                                                }));
                                                                                            } catch (error) {
                                                                                                const message = error instanceof Error ? error.message : 'Upload failed';
                                                                                                alert(message || 'Upload failed');
                                                                                            }
                                                                                        };
                                                                                        reader.readAsDataURL(file);
                                                                                    }}
                                                                                />
                                                                                <label
                                                                                    htmlFor={`file-${lecture.id}`}
                                                                                    className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/30 hover:bg-white hover:border-emerald-200 transition-all cursor-pointer"
                                                                                >
                                                                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0">
                                                                                        <Upload className="w-4 h-4" />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-[10px] font-black text-gray-900 uppercase truncate">{lecture.documentName || 'No asset attached'}</p>
                                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Click to upload previewable resource (.pptx/.pdf recommended)</p>
                                                                                    </div>
                                                                                </label>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between">
                                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lecture Modules (Multiple Files)</label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => addLectureModule(unit.id, lecture.id)}
                                                                                    className="px-3 py-1 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest"
                                                                                >
                                                                                    + Add Module
                                                                                </button>
                                                                            </div>

                                                                            {lecture.modules.length === 0 && (
                                                                                <div className="rounded-2xl border border-dashed border-gray-100 p-4 text-[10px] font-semibold text-gray-400">
                                                                                    Add multiple files (PPT/PDF/Video) for this lecture.
                                                                                </div>
                                                                            )}

                                                                            <div className="space-y-3">
                                                                                {lecture.modules.map((moduleItem, moduleIndex) => (
                                                                                    <div key={moduleItem.id} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                                                                                        <div className="flex items-center justify-between gap-3">
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Module {moduleIndex + 1}</p>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => removeLectureModule(unit.id, lecture.id, moduleItem.id)}
                                                                                                className="text-gray-300 hover:text-rose-500"
                                                                                            >
                                                                                                <X className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>

                                                                                        <input
                                                                                            value={moduleItem.title}
                                                                                            onChange={(event) => updateLectureModule(unit.id, lecture.id, moduleItem.id, (currentModule) => ({ ...currentModule, title: event.target.value }))}
                                                                                            placeholder="Module title"
                                                                                            className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold"
                                                                                        />

                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                            <select
                                                                                                value={moduleItem.fileType}
                                                                                                onChange={(event) => updateLectureModule(unit.id, lecture.id, moduleItem.id, (currentModule) => ({ ...currentModule, fileType: event.target.value as LectureModuleType }))}
                                                                                                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600"
                                                                                            >
                                                                                                <option value="pdf">PDF / Document</option>
                                                                                                <option value="ppt">PPT / PPTX</option>
                                                                                                <option value="video">Video</option>
                                                                                            </select>

                                                                                            <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 cursor-pointer hover:bg-white">
                                                                                                <Upload className="w-3.5 h-3.5" /> Upload Module File
                                                                                                <input
                                                                                                    type="file"
                                                                                                    className="hidden"
                                                                                                    accept=".pdf,.pptx,.ppt,.doc,.docx,.txt,.md,.csv,.json,.mp4,.webm,.ogg,.mov"
                                                                                                    onChange={async (event) => {
                                                                                                        const file = event.currentTarget.files?.[0];
                                                                                                        if (!file) return;

                                                                                                        const reader = new FileReader();
                                                                                                        reader.onload = async () => {
                                                                                                            try {
                                                                                                                const uploadRes = await api.uploadLectureDocument(file.name, reader.result as string);
                                                                                                                updateLectureModule(unit.id, lecture.id, moduleItem.id, (currentModule) => ({
                                                                                                                    ...currentModule,
                                                                                                                    title: currentModule.title || file.name,
                                                                                                                    fileUrl: uploadRes.data.fileUrl,
                                                                                                                    fileType: detectModuleType(file.name),
                                                                                                                }));
                                                                                                            } catch (error) {
                                                                                                                const message = error instanceof Error ? error.message : 'Upload failed';
                                                                                                                alert(message || 'Upload failed');
                                                                                                            }
                                                                                                        };
                                                                                                        reader.readAsDataURL(file);
                                                                                                    }}
                                                                                                />
                                                                                            </label>
                                                                                        </div>

                                                                                        <textarea
                                                                                            value={moduleItem.notes}
                                                                                            onChange={(event) => updateLectureModule(unit.id, lecture.id, moduleItem.id, (currentModule) => ({ ...currentModule, notes: event.target.value }))}
                                                                                            placeholder="Optional module note"
                                                                                            className="w-full min-h-[70px] rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold"
                                                                                        />

                                                                                        {moduleItem.fileUrl && (
                                                                                            <p className="text-[10px] font-semibold text-emerald-600 break-all">Attached: {moduleItem.fileUrl}</p>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        </div>

                                                                    {/* Right: Learning Checks */}
                                                                    <div className="space-y-6">
                                                                        <div className="flex items-center justify-between">
                                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Assessments</label>
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => addTestToLecture(unit.id, lecture.id, 'mcq')} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest border border-emerald-100">+ MCQ</button>
                                                                                <button onClick={() => addTestToLecture(unit.id, lecture.id, 'code')} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 font-black text-[9px] uppercase tracking-widest border border-indigo-100">+ CODE</button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            {lecture.tests.length === 0 && (
                                                                                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-50 rounded-[2rem] text-gray-300">
                                                                                    <FlaskConical className="w-6 h-6 mb-2 opacity-50" />
                                                                                    <p className="text-[9px] font-black uppercase tracking-widest">Optional tests</p>
                                                                                </div>
                                                                            )}
                                                                            {lecture.tests.map((test) => (
                                                                                <div key={test.id} className="p-6 rounded-3xl border border-gray-100 bg-gray-50/30 space-y-4 shadow-sm">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest", test.type === 'mcq' ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white")}>{test.type}</span>
                                                                                            <input
                                                                                                value={test.title}
                                                                                                onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, title: e.target.value }))}
                                                                                                className="bg-transparent border-none focus:ring-0 text-[11px] font-black text-gray-900 uppercase tracking-tight placeholder:text-gray-300"
                                                                                            />
                                                                                        </div>
                                                                                        <button onClick={() => removeTest(unit.id, lecture.id, test.id)} className="text-gray-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                                                                    </div>

                                                                                    {test.type === 'mcq' ? (
                                                                                        <div className="space-y-4">
                                                                                            {activeAssessmentBulkId === test.id ? (
                                                                                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                                                                                    <textarea
                                                                                                        value={assessmentBulkText}
                                                                                                        onChange={(e) => setAssessmentBulkText(e.target.value)}
                                                                                                        placeholder="Format:&#10;Q: What is 2+2?&#10;A: 3&#10;B: 4&#10;C: 5&#10;D: 6&#10;ANS: B"
                                                                                                        className="w-full min-h-[120px] p-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-mono outline-none"
                                                                                                    />
                                                                                                    <div className="flex gap-2">
                                                                                                        <button onClick={() => { setAssessmentBulkErrors([]); setActiveAssessmentBulkId(null); }} className="flex-1 py-2 bg-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</button>
                                                                                                        <button onClick={() => {
                                                                                                            if (!assessmentBulkText.trim()) {
                                                                                                                setAssessmentBulkErrors([]);
                                                                                                                setFormError('Paste MCQ bulk text before parsing.');
                                                                                                                return;
                                                                                                            }

                                                                                                            const { questions: parsed, errors } = parseBulkMCQText(assessmentBulkText);
                                                                                                            if (errors.length > 0) {
                                                                                                                setAssessmentBulkErrors(errors);
                                                                                                                setFormError(`Bulk import failed. Fix ${errors.length} format issue(s).`);
                                                                                                                return;
                                                                                                            }

                                                                                                            if (parsed.length === 0) {
                                                                                                                setAssessmentBulkErrors(['Could not parse any question. Use Q:/A:/B:/C:/D:/ANS format.']);
                                                                                                                setFormError('Bulk input could not be parsed. Use the sample format exactly.');
                                                                                                                return;
                                                                                                            }

                                                                                                            setAssessmentBulkErrors([]);
                                                                                                            setFormError('');
                                                                                                            updateLecture(unit.id, lecture.id, (currentLecture) => {
                                                                                                                const baseTests = currentLecture.tests.filter((item) => item.id !== test.id);
                                                                                                                const importedTests = parsed.map((question, questionIndex) => ({
                                                                                                                    id: `${test.id}-bulk-${questionIndex}-${Date.now()}`,
                                                                                                                    title: `MCQ ${questionIndex + 1}`,
                                                                                                                    type: 'mcq' as const,
                                                                                                                    mcqQuestion: question.question,
                                                                                                                    options: question.options,
                                                                                                                    correctOptionId: question.correctOptionId,
                                                                                                                    prompt: '',
                                                                                                                    functionName: '',
                                                                                                                    testCases: [],
                                                                                                                    language: 'js',
                                                                                                                }));

                                                                                                                return {
                                                                                                                    ...currentLecture,
                                                                                                                    tests: [...baseTests, ...importedTests],
                                                                                                                };
                                                                                                            });
                                                                                                            setActiveAssessmentBulkId(null);
                                                                                                            setAssessmentBulkText('');
                                                                                                        }} className="flex-[2] py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Apply Bulk</button>
                                                                                                    </div>
                                                                                                    {assessmentBulkErrors.length > 0 && (
                                                                                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 space-y-1">
                                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Bulk format issues</p>
                                                                                                            {assessmentBulkErrors.slice(0, 6).map((error, idx) => (
                                                                                                                <p key={`${error}-${idx}`} className="text-[11px] font-semibold text-rose-700">- {error}</p>
                                                                                                            ))}
                                                                                                            {assessmentBulkErrors.length > 6 && (
                                                                                                                <p className="text-[10px] font-semibold text-rose-600">+{assessmentBulkErrors.length - 6} more issues</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <textarea
                                                                                                        value={test.mcqQuestion}
                                                                                                        onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, mcqQuestion: e.target.value }))}
                                                                                                        placeholder="Topic specific question..."
                                                                                                        className="w-full text-[11px] font-semibold bg-white border border-gray-50 rounded-xl px-4 py-3 outline-none"
                                                                                                    />
                                                                                                    <div className="space-y-2">
                                                                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Options (Click checkbox for correct answer)</label>
                                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                                            {test.options.map((opt, oIdx) => (
                                                                                                                <div key={opt.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-50">
                                                                                                                    <input
                                                                                                                        type="checkbox"
                                                                                                                        checked={test.correctOptionId === opt.id}
                                                                                                                        onChange={(e) => {
                                                                                                                            if (e.target.checked) {
                                                                                                                                updateTest(unit.id, lecture.id, test.id, p => ({ ...p, correctOptionId: opt.id }));
                                                                                                                            }
                                                                                                                        }}
                                                                                                                        className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                                                                                                                    />
                                                                                                                    <input
                                                                                                                        value={opt.text}
                                                                                                                        onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({
                                                                                                                            ...p, options: p.options.map((o, i) => i === oIdx ? { ...o, text: e.target.value } : o)
                                                                                                                        }))}
                                                                                                                        placeholder={`Option ${oIdx + 1}`}
                                                                                                                        className="flex-1 text-[10px] font-semibold bg-transparent border-none outline-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <button onClick={() => { setAssessmentBulkText(''); setAssessmentBulkErrors([]); setActiveAssessmentBulkId(test.id); }} className="w-full py-2 border border-dashed border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-50 transition-all">Bulk Add</button>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-4">
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                <div className="space-y-1">
                                                                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Language</label>
                                                                                                    <select
                                                                                                        value={test.language}
                                                                                                        onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, language: e.target.value }))}
                                                                                                        className="w-full p-2.5 bg-white border border-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                                                                                                    >
                                                                                                        <option value="js">JavaScript</option>
                                                                                                        <option value="py">Python</option>
                                                                                                        <option value="cpp">C++</option>
                                                                                                        <option value="java">Java</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                                <div className="space-y-1">
                                                                                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Function</label>
                                                                                                    <input
                                                                                                        value={test.functionName}
                                                                                                        onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, functionName: e.target.value }))}
                                                                                                        className="w-full p-2.5 bg-white border border-gray-50 rounded-xl text-[10px] font-mono outline-none"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <textarea
                                                                                                value={test.prompt}
                                                                                                onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, prompt: e.target.value }))}
                                                                                                placeholder="Describe the challenge..."
                                                                                                className="w-full min-h-[80px] text-[10px] font-mono bg-white border border-gray-50 rounded-xl px-4 py-3 outline-none"
                                                                                            />

                                                                                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                                                                                                <div className="flex items-center justify-between gap-2">
                                                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Sample Code Runner</p>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => void runCompileCheck(test)}
                                                                                                        disabled={compilingTestId === test.id}
                                                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-60"
                                                                                                    >
                                                                                                        <FlaskConical className="w-3.5 h-3.5" /> {compilingTestId === test.id ? 'Checking...' : 'Run Compile Check'}
                                                                                                    </button>
                                                                                                </div>

                                                                                                <textarea
                                                                                                    value={codeDraftByTest[test.id] ?? `function ${test.functionName || 'solve'}(a, b) {\n  return a + b;\n}`}
                                                                                                    onChange={(e) => setCodeDraftByTest((prev) => ({ ...prev, [test.id]: e.target.value }))}
                                                                                                    placeholder="Write sample solution to validate this test setup"
                                                                                                    spellCheck={false}
                                                                                                    className="w-full min-h-[140px] text-[10px] font-mono bg-white border border-indigo-100 rounded-xl px-4 py-3 outline-none"
                                                                                                />

                                                                                                {codeResultByTest[test.id] && (
                                                                                                    <div className={cn(
                                                                                                        'rounded-xl border p-3 text-xs font-semibold',
                                                                                                        codeResultByTest[test.id].passed
                                                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                                                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                                                                                    )}>
                                                                                                        <p className="font-black uppercase tracking-widest text-[10px] mb-2">{codeResultByTest[test.id].message}</p>
                                                                                                        {(codeResultByTest[test.id].results || []).slice(0, 5).map((result, idx) => (
                                                                                                            <p key={`${test.id}-compile-result-${idx}`}>
                                                                                                                Case {idx + 1}: {result.pass ? 'Pass' : 'Fail'}
                                                                                                            </p>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Test Case Manager */}
                                                                                            <div className="space-y-2">
                                                                                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Verify Output Cases</label>
                                                                                                <div className="space-y-2">
                                                                                                    {test.testCases.map((tc, tcIdx) => (
                                                                                                        <div key={tcIdx} className="flex gap-2 items-center">
                                                                                                            <input
                                                                                                                value={tc.input}
                                                                                                                onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, testCases: p.testCases.map((t, i) => i === tcIdx ? { ...t, input: e.target.value } : t) }))}
                                                                                                                placeholder="In"
                                                                                                                className="flex-1 p-2 bg-white border border-gray-50 rounded-lg text-[9px] font-mono"
                                                                                                            />
                                                                                                            <input
                                                                                                                value={tc.expectedOutput}
                                                                                                                onChange={(e) => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, testCases: p.testCases.map((t, i) => i === tcIdx ? { ...t, expectedOutput: e.target.value } : t) }))}
                                                                                                                placeholder="Exp"
                                                                                                                className="flex-1 p-2 bg-white border border-gray-50 rounded-lg text-[9px] font-mono"
                                                                                                            />
                                                                                                            <button onClick={() => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, testCases: p.testCases.filter((_, i) => i !== tcIdx) }))} className="text-gray-300 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                    <button onClick={() => updateTest(unit.id, lecture.id, test.id, p => ({ ...p, testCases: [...p.testCases, { input: '', expectedOutput: '' }] }))} className="w-full py-1.5 border border-dashed border-indigo-100 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-50 transition-all">+ Add Case</button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => addLecture(unit.id)}
                                                        className="w-full py-6 bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all"
                                                    >
                                                        <Plus className="w-6 h-6 mb-2" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">New Topic In Unit</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-emerald-50 rounded-[2rem] p-10 flex flex-col items-center text-center overflow-hidden">
                                        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center text-4xl mb-6 shadow-xl shadow-emerald-500/10 overflow-hidden">
                                            {courseForm.image ? (
                                                <img src={courseForm.image} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl">{courseForm.icon || '📘'}</span>
                                            )}
                                        </div>
                                        <h3 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight leading-none">{courseForm.title || 'Untitled Curriculum'}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-white px-4 py-1.5 rounded-full shadow-sm">
                                            {courseForm.category} • {courseForm.grade} • {courseForm.difficulty}
                                        </p>

                                        <p className="mt-8 text-sm font-semibold text-gray-500 max-w-lg">
                                            {courseForm.description || 'No description provided yet.'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Price</p>
                                            <p className="text-xl font-black text-gray-900">{courseForm.isFree ? 'FREE' : courseForm.price}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Units</p>
                                            <p className="text-xl font-black text-gray-900">{courseForm.units.length}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Lectures</p>
                                            <p className="text-xl font-black text-gray-900">
                                                {courseForm.units.reduce((acc, u) => acc + u.lectures.length, 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Units Review List */}
                                    <div className="space-y-4">
                                        {courseForm.units.map((unit, idx) => (
                                            <div key={unit.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-50">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <span className="text-xs font-black text-emerald-500">UNIT {idx + 1}</span>
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{unit.title}</h4>
                                                </div>
                                                <div className="pl-6 border-l-2 border-emerald-100 space-y-2">
                                                    {unit.lectures.map(l => (
                                                        <div key={l.id} className="flex items-center justify-between py-1 border-b border-gray-100/50 last:border-0">
                                                            <span className="text-[11px] font-semibold text-gray-600 truncate">{l.title}</span>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                    {l.tests.length > 0 ? `${l.tests.length} Checks` : 'Content Only'}
                                                                </p>
                                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                                    {Number(l.testTime || 30)}m timer
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 md:p-8 border-t border-gray-50 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                {formError && <p className="text-[11px] font-black text-rose-500 uppercase tracking-tight">{formError}</p>}
                            </div>
                            <div className="flex items-center gap-4">
                                {step > 1 && (
                                    <button
                                        onClick={() => setStep(step - 1)}
                                        className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
                                    >Back</button>
                                )}
                                {step < totalSteps ? (
                                    <button
                                        onClick={() => setStep(step + 1)}
                                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 active:scale-95 transition-all"
                                    >Next Step</button>
                                ) : (
                                    <button
                                        onClick={handleCreateCourse}
                                        disabled={creating}
                                        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {creating ? (editingCourseId ? 'Updating...' : 'Publishing...') : (editingCourseId ? 'Update Course' : 'Publish Course')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
