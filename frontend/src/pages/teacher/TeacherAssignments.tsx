import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Calendar, MoreVertical, Plus, Search, PencilLine, Trash2, X, Code2, Layers3, BookOpen, Clock, Upload, Play, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { AssignmentRecord, CompilerResponse, CourseRecord, TeacherAssignmentResultRecord } from '../../types/api';

type AssignmentType = 'mcq' | 'code' | 'mixed';
type CompilerLanguage = 'js' | 'javascript' | 'java' | 'cpp' | 'c++' | 'c' | 'python' | 'other';

type OptionForm = { id: string; text: string };
type TestCaseForm = { input: string; expectedOutput: string };

type MCQQuestionForm = {
    id: string;
    question: string;
    options: OptionForm[];
    correctOptionId: string;
};

type CodeQuestionForm = {
    id: string;
    prompt: string;
    codeStarter: string;
    language: CompilerLanguage;
    testCases: TestCaseForm[];
};

type AssignmentSectionForm = {
    id: string;
    title: string;
    sectionType: 'mcq' | 'code';
    mcqQuestions: MCQQuestionForm[];
    codeQuestions: CodeQuestionForm[];
};

type AssignmentForm = {
    title: string;
    course: string;
    due: string;
    openDate: string;
    closeDate: string;
    assignmentType: AssignmentType;
    language: CompilerLanguage;
    timeLimit: number;
    questions: MCQQuestionForm[];
    sections: AssignmentSectionForm[];
    prompt: string;
    codeStarter: string;
    testCases: TestCaseForm[];
    codeQuestions: CodeQuestionForm[];
    assignmentFileUrl: string;
    assignmentFileName: string;
    assignmentFileSize: string;
};

type AssignmentView = {
    id: number;
    title: string;
    course: string;
    due: string;
    openDate?: string;
    closeDate?: string;
    sub: string;
    status: string;
    assignmentType: AssignmentType;
    language: string;
    timeLimit?: number;
    enrolledStudents: number;
    assignmentFileUrl?: string;
    assignmentFileName?: string;
    assignmentFileSize?: string;
};

const fallbackAssignmentList: AssignmentView[] = [];

const languageOptions: { value: CompilerLanguage; label: string }[] = [
    { value: 'js', label: 'JavaScript' },
    { value: 'javascript', label: 'JavaScript (alias)' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c++', label: 'C++ (alias)' },
    { value: 'c', label: 'C' },
    { value: 'python', label: 'Python' },
    { value: 'other', label: 'Other' },
];

function makeEmptyOptions(): OptionForm[] {
    return [
        { id: 'opt-1', text: '' },
        { id: 'opt-2', text: '' },
        { id: 'opt-3', text: '' },
        { id: 'opt-4', text: '' },
    ];
}

function makeEmptySection(type: 'mcq' | 'code', index: number, defaultLanguage: CompilerLanguage = 'js'): AssignmentSectionForm {
    return {
        id: `sec-${Date.now()}-${index}`,
        title: `Section ${index + 1}`,
        sectionType: type,
        mcqQuestions: type === 'mcq' ? [{ id: `q-${Date.now()}`, question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }] : [],
        codeQuestions: type === 'code' ? [{ id: `cq-${Date.now()}`, prompt: '', codeStarter: '', language: defaultLanguage, testCases: [{ input: '[1,2]', expectedOutput: '3' }] }] : []
    };
}

function makeEmptyAssignmentForm(courses: CourseRecord[]): AssignmentForm {
    return {
        title: '',
        course: courses[0]?.title || '',
        due: '',
        openDate: '',
        closeDate: '',
        assignmentType: 'mcq',
        language: 'js',
        timeLimit: 0,
        questions: [{ id: 'q-1', question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }],
        sections: [],
        prompt: '',
        codeStarter: '',
        testCases: [
            { input: '[1,2]', expectedOutput: '3' },
            { input: '[3,4]', expectedOutput: '7' },
        ],
        codeQuestions: [{ id: `cq-${Date.now()}`, prompt: '', codeStarter: '', language: 'js', testCases: [{ input: '[1,2]', expectedOutput: '3' }] }],
        assignmentFileUrl: '',
        assignmentFileName: '',
        assignmentFileSize: '',
    };
}

type BulkParseResult = {
    questions: MCQQuestionForm[];
    errors: string[];
};

function parseBulkMCQText(text: string): BulkParseResult {
    const lines = String(text || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line, index) => ({ text: line.trim(), lineNumber: index + 1 }))
        .filter((entry) => Boolean(entry.text));

    if (lines.length === 0) return { questions: [], errors: [] };

    const newQuestions: MCQQuestionForm[] = [];
    const errors: string[] = [];
    let currentQuestion: MCQQuestionForm | null = null;
    let currentOptionIndex = 0;
    let currentQuestionNumber = 0;
    let currentQuestionStartLine = 0;

    const finalizeCurrentQuestion = () => {
        if (!currentQuestion) return;

        const label = currentQuestionNumber > 0 ? `Question ${currentQuestionNumber}` : 'Question';
        const filledOptions = currentQuestion.options.filter((option) => option.text.trim().length > 0);
        const hasQuestion = currentQuestion.question.trim().length > 0;
        const hasEnoughOptions = filledOptions.length >= 2;
        const answerKey = currentQuestion.correctOptionId;
        const hasValidAnswer = filledOptions.some((option) => option.id === answerKey);

        if (!hasQuestion && filledOptions.length === 0) {
            currentQuestion = null;
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
            newQuestions.push({
                ...currentQuestion,
                options: currentQuestion.options.map((option, index) => ({
                    ...option,
                    id: option.id || `opt-${index + 1}`,
                })),
            });
        }

        currentQuestion = null;
        currentOptionIndex = 0;
    };

    const createQuestion = (index: number): MCQQuestionForm => ({
        id: `bulk-${Date.now()}-${index}`,
        question: '',
        options: makeEmptyOptions(),
        correctOptionId: 'opt-1',
    });

    const setOptionText = (rawLine: string) => {
        if (!currentQuestion) return;
        const optionMatch = rawLine.match(/^([a-d])\s*[\).:\-]\s*(.+)$/i);
        if (!optionMatch) return;

        const optionLetter = optionMatch[1].toLowerCase();
        const optionText = optionMatch[2].trim();
        const optionIndexMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
        const optionIndex = optionIndexMap[optionLetter];
        currentQuestion.options[optionIndex].text = optionText;
        currentOptionIndex = Math.min(optionIndex + 1, 4);
    };

    lines.forEach(({ text: line, lineNumber }, index) => {
        const isExplicitQuestionStart = /^\d+\s*[\).:\-]\s*/.test(line) || /^q(?:uestion)?\s*[:\-]/i.test(line);
        const isOptionLine = /^[a-d]\s*[\).:\-]/i.test(line);
        const isCorrectLine = /^(?:correct|answer|ans)\s*[:\-]/i.test(line);

        if (isExplicitQuestionStart && !isOptionLine && !isCorrectLine) {
            finalizeCurrentQuestion();
            currentQuestionNumber += 1;
            currentQuestionStartLine = lineNumber;
            currentQuestion = createQuestion(index);
            const normalizedQuestionText = line
                .replace(/^\d+\s*[\).:\-]\s*/, '')
                .replace(/^q(?:uestion)?\s*[:\-]\s*/i, '')
                .trim();
            currentQuestion.question = normalizedQuestionText;
            currentOptionIndex = 0;
            return;
        }

        if (!currentQuestion) {
            currentQuestionNumber += 1;
            currentQuestionStartLine = lineNumber;
            currentQuestion = createQuestion(index);
        }

        if (isCorrectLine) {
            const answer = line.replace(/^(?:correct|answer|ans)\s*[:\-]\s*/i, '').trim().toLowerCase();
            const mapping: Record<string, string> = { a: 'opt-1', b: 'opt-2', c: 'opt-3', d: 'opt-4' };
            if (mapping[answer]) {
                currentQuestion.correctOptionId = mapping[answer];
            } else {
                errors.push(`Line ${lineNumber}: answer must be A, B, C, or D.`);
            }
            return;
        }

        if (isOptionLine) {
            setOptionText(line);
            return;
        }

        if (!currentQuestion.question) {
            currentQuestion.question = line.replace(/^q(?:uestion)?\s*[:\-]\s*/i, '').trim();
            return;
        }

        if (currentOptionIndex < 4) {
            currentQuestion.options[currentOptionIndex].text = line;
            currentOptionIndex += 1;
            return;
        }

        finalizeCurrentQuestion();
        currentQuestionNumber += 1;
        currentQuestionStartLine = lineNumber;
        currentQuestion = createQuestion(index);
        currentQuestion.question = line.replace(/^q(?:uestion)?\s*[:\-]\s*/i, '').trim();
        currentOptionIndex = 0;
    });

    finalizeCurrentQuestion();

    if (newQuestions.length === 0 && errors.length === 0) {
        errors.push('Could not parse any question. Check the bulk format and try again.');
    }

    return { questions: newQuestions, errors };
}

export const TeacherAssignments: React.FC = () => {
    const { user } = useAuth();
    const [assignmentList, setAssignmentList] = useState<AssignmentView[]>(fallbackAssignmentList);
    const [assignmentRecords, setAssignmentRecords] = useState<AssignmentRecord[]>([]);
    const [courseOptions, setCourseOptions] = useState<CourseRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'mcq' | 'code' | 'mixed'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'In Review' | 'Graded'>('all');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [form, setForm] = useState<AssignmentForm>(makeEmptyAssignmentForm([]));
    const [bulkText, setBulkText] = useState('');
    const [bulkErrors, setBulkErrors] = useState<string[]>([]);
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [step, setStep] = useState(1);
    const totalSteps = 3;
    const [activeSectionBulkId, setActiveSectionBulkId] = useState<string | null>(null);
    const [sectionBulkText, setSectionBulkText] = useState('');
    const [sectionBulkErrors, setSectionBulkErrors] = useState<string[]>([]);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [compilePreviewByKey, setCompilePreviewByKey] = useState<Record<string, CompilerResponse>>({});
    const [compilingKey, setCompilingKey] = useState('');
    const [resultsOpen, setResultsOpen] = useState(false);
    const [resultLoading, setResultLoading] = useState(false);
    const [selectedResult, setSelectedResult] = useState<TeacherAssignmentResultRecord | null>(null);

    const parseBulkQuestions = () => {
        if (!bulkText.trim()) {
            setBulkErrors([]);
            setFormError('Paste MCQ bulk text before parsing.');
            return;
        }

        const { questions: parsed, errors } = parseBulkMCQText(bulkText);
        if (errors.length > 0) {
            setBulkErrors(errors);
            setFormError(`Bulk import failed. Fix ${errors.length} format issue(s).`);
            return;
        }

        if (parsed.length === 0) {
            setBulkErrors(['Could not parse any question. Use Q:/A:/B:/C:/D:/ANS format.']);
            setFormError('Bulk input could not be parsed. Use the sample format exactly.');
            return;
        }

        setBulkErrors([]);
        setFormError('');
        setForm(p => ({ ...p, questions: [...p.questions, ...parsed] }));
        setBulkText('');
        setShowBulkAdd(false);
    };

    const teacherEmail = String(user?.email || '').toLowerCase();

    const hydrateAssignments = (records: AssignmentRecord[]) => {
        setAssignmentRecords(records);
        if (records.length === 0) {
            setAssignmentList([]);
            return;
        }

        setAssignmentList(
            records.map((item) => ({
                id: item.id,
                title: item.title,
                course: item.course,
                due: item.due,
                openDate: item.openDate || '',
                closeDate: item.closeDate || '',
                sub: item.submissions,
                status: item.status,
                assignmentType: item.assignmentType || 'mcq',
                language: item.language || 'js',
                timeLimit: item.timeLimit || 0,
                enrolledStudents: item.enrolledStudents || 0,
                assignmentFileUrl: item.assignmentFileUrl,
                assignmentFileName: item.assignmentFileName,
                assignmentFileSize: item.assignmentFileSize,
            }))
        );
    };

    const refreshAssignments = async () => {
        try {
            const response = await api.getAssignments(teacherEmail);
            hydrateAssignments(response.data);
        } catch {
            // Keep current assignments on refresh failure.
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadAssignments = async () => {
            try {
                const [assignmentsResponse, coursesResponse] = await Promise.all([
                    api.getAssignments(teacherEmail),
                    api.getCourses('teacher'),
                ]);

                if (!isMounted) return;

                hydrateAssignments(assignmentsResponse.data || []);

                if (coursesResponse.data.length > 0) {
                    setCourseOptions(coursesResponse.data);
                    setForm((prev) => ({ ...prev, course: prev.course || coursesResponse.data[0].title }));
                }
            } catch {
                // Keep fallback data if API is unavailable.
            }
        };

        void loadAssignments();

        return () => {
            isMounted = false;
        };
    }, [teacherEmail]);

    const openCreateForm = () => {
        setEditingId(null);
        setFormError('');
        setBulkErrors([]);
        setSectionBulkErrors([]);
        setForm(makeEmptyAssignmentForm(courseOptions));
        setStep(1);
        setShowForm(true);
    };

    const openEditForm = (record: AssignmentRecord) => {
        setEditingId(record.id);
        setFormError('');
        setBulkErrors([]);
        setSectionBulkErrors([]);

        const assignmentType = (record.assignmentType || 'mcq') as AssignmentType;
        const normalizedLanguage = (record.language || 'js') as CompilerLanguage;

        const normalizedCodeQuestions: CodeQuestionForm[] =
            assignmentType === 'code'
                ? (record.codeQuestions && record.codeQuestions.length > 0
                    ? record.codeQuestions.map((question, index) => ({
                        id: question.id || `cq-${Date.now()}-${index}`,
                        prompt: question.prompt || '',
                        codeStarter: question.codeStarter || '',
                        language: (question.language || normalizedLanguage) as CompilerLanguage,
                        testCases: (question.testCases && question.testCases.length > 0
                            ? question.testCases
                            : [{ input: '', expectedOutput: '' }
                        ]).map((testCase) => ({
                            input: testCase.input || '',
                            expectedOutput: testCase.expectedOutput || '',
                        })),
                    }))
                    : [{
                        id: `cq-${Date.now()}`,
                        prompt: record.prompt || '',
                        codeStarter: record.codeStarter || '',
                        language: normalizedLanguage,
                        testCases: (record.testCases && record.testCases.length > 0
                            ? record.testCases
                            : [{ input: '', expectedOutput: '' }
                        ]).map((testCase) => ({
                            input: testCase.input || '',
                            expectedOutput: testCase.expectedOutput || '',
                        })),
                    }])
                : [];

        const normalizedQuestions: MCQQuestionForm[] =
            assignmentType === 'mcq'
                ? (record.questions && record.questions.length > 0
                    ? record.questions.map((question, index) => ({
                        id: question.id || `q-${Date.now()}-${index}`,
                        question: question.question || '',
                        options: (question.options && question.options.length > 0 ? question.options : makeEmptyOptions()).map((option, optionIndex) => ({
                            id: option.id || `opt-${optionIndex + 1}`,
                            text: option.text || '',
                        })),
                        correctOptionId: question.correctOptionId || (question.options?.[0]?.id || 'opt-1'),
                    }))
                    : (record.mcqQuestion
                        ? [{
                            id: 'q-legacy-1',
                            question: record.mcqQuestion,
                            options: (record.options && record.options.length > 0 ? record.options : makeEmptyOptions()).map((option, optionIndex) => ({
                                id: option.id || `opt-${optionIndex + 1}`,
                                text: option.text || '',
                            })),
                            correctOptionId: record.correctOptionId || (record.options?.[0]?.id || 'opt-1'),
                        }]
                        : [{ id: 'q-1', question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }
                    ]))
                : [{ id: 'q-1', question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }];

        const normalizedSections: AssignmentSectionForm[] =
            assignmentType === 'mixed'
                ? (record.sections || []).map((section, sectionIndex) => ({
                    id: section.id || `sec-${Date.now()}-${sectionIndex}`,
                    title: section.title || `Section ${sectionIndex + 1}`,
                    sectionType: section.sectionType,
                    mcqQuestions: section.sectionType === 'mcq'
                        ? (section.mcqQuestions || []).map((question, questionIndex) => ({
                            id: question.id || `q-${Date.now()}-${questionIndex}`,
                            question: question.question || '',
                            options: (question.options && question.options.length > 0 ? question.options : makeEmptyOptions()).map((option, optionIndex) => ({
                                id: option.id || `opt-${optionIndex + 1}`,
                                text: option.text || '',
                            })),
                            correctOptionId: question.correctOptionId || (question.options?.[0]?.id || 'opt-1'),
                        }))
                        : [],
                    codeQuestions: section.sectionType === 'code'
                        ? (section.codeQuestions || []).map((question, questionIndex) => ({
                            id: question.id || `cq-${Date.now()}-${questionIndex}`,
                            prompt: question.prompt || '',
                            codeStarter: question.codeStarter || '',
                            language: (question.language || normalizedLanguage) as CompilerLanguage,
                            testCases: ((question.testCases && question.testCases.length > 0)
                                ? question.testCases
                                : [{ input: '', expectedOutput: '' }]
                            ).map((testCase) => ({
                                input: testCase.input || '',
                                expectedOutput: testCase.expectedOutput || '',
                            })),
                        }))
                        : [],
                }))
                : [];

        setForm({
            title: record.title,
            course: record.course,
            due: record.due,
            openDate: record.openDate || '',
            closeDate: record.closeDate || '',
            assignmentType,
            language: normalizedLanguage,
            timeLimit: record.timeLimit || 0,
            questions: normalizedQuestions,
            sections: normalizedSections,
            prompt: normalizedCodeQuestions[0]?.prompt || '',
            codeStarter: normalizedCodeQuestions[0]?.codeStarter || '',
            testCases: normalizedCodeQuestions[0]?.testCases || [{ input: '', expectedOutput: '' }],
            codeQuestions: normalizedCodeQuestions,
            assignmentFileUrl: record.assignmentFileUrl || '',
            assignmentFileName: record.assignmentFileName || '',
            assignmentFileSize: record.assignmentFileSize || '',
        });
        setStep(1);
        setShowForm(true);
    };

    const handleAssignmentFileUpload = async (file: File) => {
        setFormError('');
        try {
            setUploadingAttachment(true);
            const uploadRes = await api.uploadResourceFile(file);
            setForm((prev) => ({
                ...prev,
                assignmentFileUrl: uploadRes.data.fileUrl,
                assignmentFileName: uploadRes.data.fileName,
                assignmentFileSize: uploadRes.data.fileSize,
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'File upload failed.';
            setFormError(message);
        } finally {
            setUploadingAttachment(false);
        }
    };

    const saveAssignment = async () => {
        setFormError('');

        if (!form.title.trim() || !form.course.trim() || !form.due.trim()) {
            setFormError('Title, course and due date are required.');
            return;
        }

        if (form.assignmentType === 'mcq') {
            const validQuestions = form.questions.filter((q) => q.question.trim() && q.options.filter(o => o.text.trim()).length >= 2);
            if (validQuestions.length === 0) {
                setFormError('MCQ assignments need at least one valid question with two options.');
                return;
            }
        }

        if (form.assignmentType === 'code') {
            const firstCodeQuestion = form.codeQuestions[0];
            const validCodeCases = (firstCodeQuestion?.testCases || []).filter((tc) => tc.input.trim() && tc.expectedOutput.trim());

            if (!firstCodeQuestion || !firstCodeQuestion.prompt.trim() || !firstCodeQuestion.codeStarter.trim() || validCodeCases.length === 0) {
                setFormError('Code assignments need a prompt, starter code and at least one test case.');
                return;
            }
        }

        if (form.assignmentType === 'mixed') {
            if (form.sections.length === 0) {
                setFormError('Mixed assignments need at least one section.');
                return;
            }

            const invalidDetails: string[] = [];
            form.sections.forEach((section, sectionIndex) => {
                if (section.sectionType === 'mcq') {
                    const sectionHasInvalidMcq = section.mcqQuestions.length === 0
                        || section.mcqQuestions.some((q) => !q.question.trim() || q.options.filter((o) => o.text.trim()).length < 2);
                    if (sectionHasInvalidMcq) {
                        invalidDetails.push(`Section ${sectionIndex + 1} (MCQ) needs at least one complete question with 2 options.`);
                    }
                    return;
                }

                if (section.codeQuestions.length === 0) {
                    invalidDetails.push(`Section ${sectionIndex + 1} (Code) needs at least one challenge.`);
                    return;
                }

                section.codeQuestions.forEach((question, questionIndex) => {
                    const validCodeCases = (question.testCases || []).filter((tc) => tc.input.trim() && tc.expectedOutput.trim());
                    if (!question.codeStarter.trim() || validCodeCases.length === 0) {
                        invalidDetails.push(`Section ${sectionIndex + 1}, Challenge ${questionIndex + 1} requires starter code and one complete test case.`);
                    }
                });
            });

            if (invalidDetails.length > 0) {
                setFormError(invalidDetails[0]);
                return;
            }
        }

        try {
            setSaving(true);
            const payload = {
                title: form.title.trim(),
                course: form.course.trim(),
                due: form.due.trim(),
                openDate: form.openDate.trim(),
                closeDate: form.closeDate.trim(),
                submissions: editingId ? (assignmentList.find(a => a.id === editingId)?.sub || '0/0') : '0/0',
                status: 'Pending' as const,
                teacherEmail,
                assignmentType: form.assignmentType,
                language: form.language,
                timeLimit: form.timeLimit,
                questions: form.assignmentType === 'mcq' ? form.questions : [],
                sections: form.assignmentType === 'mixed' ? form.sections : [],
                prompt: form.assignmentType === 'code' ? (form.codeQuestions[0]?.prompt.trim() || '') : '',
                codeStarter: form.assignmentType === 'code' ? (form.codeQuestions[0]?.codeStarter || '') : '',
                testCases: form.assignmentType === 'code' ? (form.codeQuestions[0]?.testCases || []) : [],
                codeQuestions: form.assignmentType === 'code' ? form.codeQuestions : [],
                assignmentFileUrl: form.assignmentFileUrl,
                assignmentFileName: form.assignmentFileName,
                assignmentFileSize: form.assignmentFileSize,
                collegeEmail: user?.collegeEmail || '',
            };

            if (editingId) {
                await api.updateAssignment(editingId, payload);
            } else {
                await api.createAssignment(payload);
            }

            await refreshAssignments();
            setShowForm(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save assignment.';
            setFormError(message);
        } finally {
            setSaving(false);
        }
    };

    const editAssignment = async (item: AssignmentView) => {
        const source = assignmentRecords.find((record) => record.id === item.id);
        if (!source) {
            setFormError('Unable to load assignment details for editing. Please refresh and try again.');
            return;
        }
        openEditForm(source);
    };

    const removeAssignment = async (item: { id: number; title: string }) => {
        if (!window.confirm(`Delete assignment "${item.title}"?`)) return;

        try {
            await api.deleteAssignment(item.id);
            await refreshAssignments();
        } catch {
            // Keep UI stable if delete fails.
        }
    };

    const courseFilterOptions = useMemo(
        () => Array.from(new Set(assignmentList.map((item) => String(item.course || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [assignmentList]
    );

    const filteredAssignments = assignmentList.filter((item) => {
        const term = searchQuery.trim().toLowerCase();
        const matchesSearch = !term
            || [item.title, item.course, item.assignmentType, item.language, item.status]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term));

        const matchesCourse = courseFilter === 'all' || String(item.course || '') === courseFilter;
        const matchesType = typeFilter === 'all' || item.assignmentType === typeFilter;
        const matchesStatus = statusFilter === 'all' || String(item.status || '') === statusFilter;

        return matchesSearch && matchesCourse && matchesType && matchesStatus;
    });

    const runCompilePreview = async (
        compileKey: string,
        payload: { code: string; language: string; testCases: TestCaseForm[] }
    ) => {
        setCompilingKey(compileKey);
        try {
            const response = await api.compileAssignmentCode({
                code: payload.code,
                functionName: 'solve',
                testCases: payload.testCases,
                language: payload.language,
            });
            setCompilePreviewByKey((current) => ({
                ...current,
                [compileKey]: response.data,
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Compile preview failed';
            setCompilePreviewByKey((current) => ({
                ...current,
                [compileKey]: {
                    passed: false,
                    message,
                    results: [],
                },
            }));
        } finally {
            setCompilingKey('');
        }
    };

    const openResultPanel = async (assignmentId: number) => {
        try {
            setResultLoading(true);
            setResultsOpen(true);
            const response = await api.getTeacherAssignmentResults(assignmentId, teacherEmail);
            setSelectedResult(response.data);
        } catch {
            setSelectedResult(null);
        } finally {
            setResultLoading(false);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase tracking-tight">Assignments Hub</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Managing {assignmentList.length} active gradeable modules</p>
                </div>
                <button onClick={openCreateForm} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Assignment
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative group md:col-span-2 lg:col-span-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search assignments..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full bg-white border border-gray-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-soft focus:ring-4 focus:ring-emerald-500/5 transition-all"
                    />
                </div>
                <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                    className="bg-white border border-gray-50 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 shadow-soft"
                >
                    <option value="all">All Courses</option>
                    {courseFilterOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                    ))}
                </select>
                <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as 'all' | 'mcq' | 'code' | 'mixed')}
                    className="bg-white border border-gray-50 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 shadow-soft"
                >
                    <option value="all">All Types</option>
                    <option value="mcq">MCQ</option>
                    <option value="code">Code</option>
                    <option value="mixed">Mixed</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | 'Pending' | 'In Review' | 'Graded')}
                    className="bg-white border border-gray-50 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 shadow-soft"
                >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Graded">Graded</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredAssignments.map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="card-premium p-8 group cursor-pointer hover:border-emerald-200 transition-all flex flex-col md:flex-row items-center justify-between gap-8"
                    >
                        <div className="flex items-center gap-6 flex-1">
                            <div className="w-14 h-14 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-sm border border-emerald-50">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-gray-900 mb-1 group-hover:text-emerald-500 transition-colors leading-none">{item.title}</h4>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-lg">{item.course}</span>
                                    {item.openDate && <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Opens {new Date(item.openDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Due {item.due}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> {item.enrolledStudents} enrolled</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-50 pt-6 md:pt-0 md:pl-8">
                            <div className="text-center shrink-0">
                                <p className="text-lg font-black text-gray-900 group-hover:text-emerald-500 transition-colors">{item.sub}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Submissions</p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <span className={cn(
                                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                                    item.status === 'Graded' ? 'bg-emerald-50 text-emerald-500' :
                                        item.status === 'In Review' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
                                )}>
                                    {item.status}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {item.assignmentType?.toUpperCase()} • {item.language}
                                </span>
                                <button onClick={() => editAssignment(item)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                                    <PencilLine className="w-4 h-4" />
                                </button>
                                <button onClick={() => removeAssignment(item)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => void openResultPanel(item.id)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-500 hover:bg-blue-50 transition-all">
                                    <Users className="w-4 h-4" />
                                </button>
                                <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md overflow-hidden p-4 md:p-6 lg:p-8 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-5xl max-h-full bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                                        {step}
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                        {step === 1 ? 'Assignment Basics' : step === 2 ? 'Schedule & Limits' : 'Content Builder'}
                                    </h2>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
                                    Step {step} of {totalSteps} • {step === 1 ? 'General details' : step === 2 ? 'Timing & Rules' : 'Questions & Logic'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
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

                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
                                            <input
                                                value={form.title}
                                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                                placeholder="e.g. React Fundamentals"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Target Course</label>
                                            <select
                                                value={form.course}
                                                onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                                            >
                                                {courseOptions.map((c) => (
                                                    <option key={c.id} value={c.title}>{c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Assignment Type</label>
                                            <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                                {(['mcq', 'code', 'mixed'] as const).map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setForm(p => ({ ...p, assignmentType: t }))}
                                                        className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", form.assignmentType === t ? "bg-white shadow-sm text-emerald-500" : "text-gray-400 hover:text-gray-600")}
                                                    >{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Primary Language</label>
                                            <select
                                                value={form.language}
                                                onChange={(e) => setForm(p => ({ ...p, language: e.target.value as CompilerLanguage }))}
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                                            >
                                                {languageOptions.map((l) => (
                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Assignment File</label>
                                        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 p-5 space-y-4">
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <Upload className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Upload a file for students</p>
                                                        <p className="text-[10px] font-semibold text-gray-400">PDF, DOCX, ZIP, TXT and similar files are supported.</p>
                                                    </div>
                                                </div>
                                                <label className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-700 hover:text-emerald-500 hover:border-emerald-200 transition-all cursor-pointer">
                                                    <Upload className="w-4 h-4" />
                                                    {uploadingAttachment ? 'Uploading...' : 'Choose File'}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                void handleAssignmentFileUpload(file);
                                                            }
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            {form.assignmentFileUrl && (
                                                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white border border-gray-100 px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{form.assignmentFileName || 'Uploaded file'}</p>
                                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{form.assignmentFileSize || 'Attached to this assignment'}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm((prev) => ({ ...prev, assignmentFileUrl: '', assignmentFileName: '', assignmentFileSize: '' }))}
                                                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Open Date (Visible)</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="datetime-local"
                                                    value={form.openDate}
                                                    onChange={(e) => setForm(p => ({ ...p, openDate: e.target.value }))}
                                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-11 pr-5 py-4 text-sm font-semibold focus:bg-white transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Close Date (Deadline)</label>
                                            <div className="relative">
                                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="datetime-local"
                                                    value={form.closeDate}
                                                    onChange={(e) => setForm(p => ({ ...p, closeDate: e.target.value }))}
                                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-11 pr-5 py-4 text-sm font-semibold focus:bg-white transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Soft Due Display</label>
                                            <input
                                                value={form.due}
                                                onChange={(e) => setForm(p => ({ ...p, due: e.target.value }))}
                                                placeholder="e.g. May 20, 2024"
                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Time Limit (Min)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={form.timeLimit}
                                                    onChange={(e) => setForm(p => ({ ...p, timeLimit: Number(e.target.value) }))}
                                                    placeholder="0 for no limit"
                                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-semibold focus:bg-white transition-all outline-none"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase">Minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {form.assignmentType === 'mcq' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">MCQ Question Set</h3>
                                                <button onClick={() => setShowBulkAdd(!showBulkAdd)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-500 text-[10px] font-black uppercase tracking-widest">+ Bulk Add</button>
                                            </div>

                                            {showBulkAdd && (
                                                <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl space-y-4">
                                                    <textarea
                                                        value={bulkText}
                                                        onChange={(e) => setBulkText(e.target.value)}
                                                        placeholder="Q: Question?\nA: Opt1\nB: Opt2\nCorrect: A"
                                                        className="w-full min-h-[150px] p-4 text-xs font-mono rounded-2xl border border-emerald-100"
                                                    />
                                                    <p className="text-[10px] font-semibold text-gray-400 px-1">
                                                        Paste many questions in one block. Start each question with <span className="font-black text-gray-600">Q:</span> or a number like <span className="font-black text-gray-600">1.</span> and the parser will split them automatically.
                                                    </p>
                                                    <button onClick={parseBulkQuestions} className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Apply Parser</button>
                                                    {bulkErrors.length > 0 && (
                                                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 space-y-1">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Bulk format issues</p>
                                                            {bulkErrors.slice(0, 6).map((error, idx) => (
                                                                <p key={`${error}-${idx}`} className="text-[11px] font-semibold text-rose-700">- {error}</p>
                                                            ))}
                                                            {bulkErrors.length > 6 && (
                                                                <p className="text-[10px] font-semibold text-rose-600">+{bulkErrors.length - 6} more issues</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-5">
                                                {form.questions.map((q, qIdx) => (
                                                    <div key={q.id} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Question {qIdx + 1}</span>
                                                            <button onClick={() => setForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qIdx) }))} className="text-gray-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                                        </div>
                                                        <textarea
                                                            value={q.question}
                                                            onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((item, i) => i === qIdx ? { ...item, question: e.target.value } : item) }))}
                                                            placeholder="Enter Question Text..."
                                                            className="w-full text-sm font-semibold p-4 bg-gray-50/50 border border-gray-50 rounded-2xl focus:bg-white outline-none"
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {q.options.map((opt, oIdx) => (
                                                                <input
                                                                    key={opt.id}
                                                                    value={opt.text}
                                                                    onChange={(e) => setForm(p => ({ ...p, questions: p.questions.map((item, i) => i === qIdx ? { ...item, options: item.options.map((o, oi) => oi === oIdx ? { ...o, text: e.target.value } : o) } : item) }))}
                                                                    placeholder={`Option ${oIdx + 1}`}
                                                                    className={cn("text-[11px] font-semibold px-4 py-3 bg-gray-50/50 border rounded-2xl transition-all", q.correctOptionId === opt.id ? "border-emerald-200 ring-4 ring-emerald-500/5 bg-white" : "border-gray-50")}
                                                                    onFocus={() => setForm(p => ({ ...p, questions: p.questions.map((item, i) => i === qIdx ? { ...item, correctOptionId: opt.id } : item) }))}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                <button onClick={() => setForm(p => ({ ...p, questions: [...p.questions, { id: `q-${Date.now()}`, question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }] }))} className="w-full py-6 border-2 border-dashed border-gray-100 rounded-3xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all">+ Add Question Manually</button>
                                            </div>
                                        </div>
                                    )}

                                    {form.assignmentType === 'code' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coding Challenges ({form.codeQuestions.length})</h3>
                                                <button
                                                    onClick={() => setForm(p => ({ ...p, codeQuestions: [...p.codeQuestions, { id: `cq-${Date.now()}`, prompt: '', codeStarter: '', language: p.language, testCases: [{ input: '', expectedOutput: '' }] }] }))}
                                                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-gray-900/10"
                                                >+ Add Challenge</button>
                                            </div>

                                            {form.codeQuestions.map((cq, cqIdx) => (
                                                <div key={cq.id} className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm space-y-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-indigo-505 bg-indigo-500 text-white flex items-center justify-center">
                                                                <Code2 className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Challenge {cqIdx + 1}</span>
                                                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest">
                                                                Compiler: {cq.language}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.filter((_, ci) => ci !== cqIdx) }))}
                                                            className="text-gray-300 hover:text-rose-500 transition-colors"
                                                        ><X className="w-5 h-5" /></button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Challenge Prompt</label>
                                                        <textarea
                                                            value={cq.prompt}
                                                            onChange={(e) => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, prompt: e.target.value } : q) }))}
                                                            placeholder="Describe the coding task..."
                                                            className="w-full min-h-[100px] p-5 rounded-3xl border border-gray-50 bg-gray-50/30 text-xs font-semibold focus:bg-white outline-none"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Starter Logic</label>
                                                        <textarea
                                                            value={cq.codeStarter}
                                                            onChange={(e) => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, codeStarter: e.target.value } : q) }))}
                                                            placeholder={`function solve(a, b) {\n  return a + b;\n}`}
                                                            className="w-full min-h-[180px] p-5 rounded-3xl border border-gray-50 bg-gray-900 text-gray-100 text-[10px] font-mono outline-none shadow-inner"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Compiler Language</label>
                                                        <select
                                                            value={cq.language}
                                                            onChange={(e) => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, language: e.target.value as CompilerLanguage } : q) }))}
                                                            className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                                                        >
                                                            {languageOptions.map((l) => (
                                                                <option key={l.value} value={l.value}>{l.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Test Cases</label>
                                                            <button
                                                                onClick={() => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: [...(q.testCases || []), { input: '', expectedOutput: '' }] } : q) }))}
                                                                className="text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                                                            >+ Add Case</button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {(cq.testCases || []).map((tc, tcIdx) => (
                                                                <div key={tcIdx} className="flex gap-3 items-center p-3 bg-gray-50/50 border border-gray-50 rounded-2xl">
                                                                    <div className="flex-1 space-y-1">
                                                                        <input
                                                                            value={tc.input}
                                                                            onChange={(e) => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.map((qtc, tci) => tci === tcIdx ? { ...qtc, input: e.target.value } : qtc) } : q) }))}
                                                                            placeholder="Input"
                                                                            className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-mono outline-none"
                                                                        />
                                                                        <input
                                                                            value={tc.expectedOutput}
                                                                            onChange={(e) => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.map((qtc, tci) => tci === tcIdx ? { ...qtc, expectedOutput: e.target.value } : qtc) } : q) }))}
                                                                            placeholder="Output"
                                                                            className="w-full px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-mono outline-none"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setForm(p => ({ ...p, codeQuestions: p.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.filter((_, tci) => tci !== tcIdx) } : q) }))}
                                                                        className="p-1.5 text-gray-200 hover:text-rose-500 transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => void runCompilePreview(`root-${cq.id}`, {
                                                                code: cq.codeStarter,
                                                                language: cq.language,
                                                                testCases: (cq.testCases || []).filter((tc) => tc.input.trim() && tc.expectedOutput.trim()),
                                                            })}
                                                            disabled={compilingKey === `root-${cq.id}`}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                                                        >
                                                            <Play className="w-3.5 h-3.5" /> {compilingKey === `root-${cq.id}` ? 'Compiling...' : 'Run Compile Check'}
                                                        </button>
                                                        {compilePreviewByKey[`root-${cq.id}`] && (
                                                            <div className={cn(
                                                                'rounded-xl border p-3 text-xs font-semibold',
                                                                compilePreviewByKey[`root-${cq.id}`].passed
                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                                                            )}>
                                                                <p className="font-black uppercase tracking-widest text-[10px] mb-2">{compilePreviewByKey[`root-${cq.id}`].message}</p>
                                                                {compilePreviewByKey[`root-${cq.id}`].results.slice(0, 5).map((result, idx) => (
                                                                    <p key={`${cq.id}-root-result-${idx}`}>
                                                                        Case {idx + 1}: {result.pass ? 'Pass' : 'Fail'}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {form.assignmentType === 'mixed' && (
                                        <div className="space-y-8">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Section List</h3>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setForm(p => ({ ...p, sections: [...p.sections, makeEmptySection('mcq', p.sections.length)] }))}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest"
                                                    >+ MCQ Section</button>
                                                    <button
                                                        onClick={() => setForm(p => ({ ...p, sections: [...p.sections, makeEmptySection('code', p.sections.length, p.language)] }))}
                                                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest"
                                                    >+ Code Section</button>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {form.sections.map((section, sIdx) => (
                                                    <div key={section.id} className="p-6 bg-gray-50/30 border border-gray-100 rounded-[2rem] space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white", section.sectionType === 'mcq' ? "bg-emerald-500" : "bg-indigo-500")}>
                                                                    {section.sectionType === 'mcq' ? <Layers3 className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
                                                                </div>
                                                                <input
                                                                    value={section.title}
                                                                    onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, title: e.target.value } : s) }))}
                                                                    className="bg-transparent border-none focus:ring-0 text-sm font-black text-gray-900 uppercase tracking-tight w-full"
                                                                />
                                                            </div>
                                                            <button onClick={() => setForm(p => ({ ...p, sections: p.sections.filter((_, i) => i !== sIdx) }))} className="text-gray-300 hover:text-rose-500"><X className="w-5 h-5" /></button>
                                                        </div>

                                                        {section.sectionType === 'mcq' ? (
                                                            <div className="space-y-4">
                                                                {section.mcqQuestions.map((mq, mqIdx) => (
                                                                    <div key={mq.id} className="p-6 bg-white border border-gray-50 rounded-3xl shadow-sm space-y-4">
                                                                        <textarea
                                                                            value={mq.question}
                                                                            onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, mcqQuestions: s.mcqQuestions.map((q, qi) => qi === mqIdx ? { ...q, question: e.target.value } : q) } : s) }))}
                                                                            placeholder="Question text..."
                                                                            className="w-full text-xs font-semibold p-4 bg-gray-50/30 rounded-2xl outline-none focus:bg-white"
                                                                        />
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            {mq.options.map((opt, oIdx) => (
                                                                                <input
                                                                                    key={opt.id}
                                                                                    value={opt.text}
                                                                                    onFocus={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, mcqQuestions: s.mcqQuestions.map((q, qi) => qi === mqIdx ? { ...q, correctOptionId: opt.id } : q) } : s) }))}
                                                                                    onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, mcqQuestions: s.mcqQuestions.map((q, qi) => qi === mqIdx ? { ...q, options: q.options.map((o, oi) => oi === oIdx ? { ...o, text: e.target.value } : o) } : q) } : s) }))}
                                                                                    placeholder={`Option ${oIdx + 1}`}
                                                                                    className={cn("text-[10px] font-semibold px-4 py-3 bg-gray-50/30 border rounded-2xl transition-all", mq.correctOptionId === opt.id ? "border-emerald-200 ring-4 ring-emerald-500/5 bg-white" : "border-gray-50")}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {activeSectionBulkId === section.id ? (
                                                                    <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                                        <div className="flex items-center justify-between px-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <Layers3 className="w-4 h-4 text-emerald-500" />
                                                                                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Mixed Bulk MCQ Importer</label>
                                                                            </div>
                                                                            <button onClick={() => setActiveSectionBulkId(null)} className="text-gray-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                                                        </div>
                                                                        <textarea
                                                                            value={sectionBulkText}
                                                                            onChange={(e) => setSectionBulkText(e.target.value)}
                                                                            placeholder="Q: Question?&#10;A: Option 1&#10;B: Option 2&#10;Correct: A"
                                                                            className="w-full min-h-[150px] p-4 bg-white border border-emerald-100 rounded-2xl text-[10px] font-mono outline-none focus:ring-4 focus:ring-emerald-500/5 shadow-sm"
                                                                        />
                                                                        <p className="text-[10px] font-semibold text-emerald-700/80 px-1">
                                                                            This importer also splits continuous pasted questions automatically.
                                                                        </p>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!sectionBulkText.trim()) {
                                                                                    setSectionBulkErrors([]);
                                                                                    setFormError('Paste MCQ bulk text before parsing.');
                                                                                    return;
                                                                                }

                                                                                const { questions: parsed, errors } = parseBulkMCQText(sectionBulkText);
                                                                                if (errors.length > 0) {
                                                                                    setSectionBulkErrors(errors);
                                                                                    setFormError(`Mixed section bulk import failed. Fix ${errors.length} format issue(s).`);
                                                                                    return;
                                                                                }

                                                                                if (parsed.length === 0) {
                                                                                    setSectionBulkErrors(['Could not parse any question. Use Q:/A:/B:/C:/D:/ANS format.']);
                                                                                    setFormError('Mixed section bulk input could not be parsed.');
                                                                                    return;
                                                                                }

                                                                                setSectionBulkErrors([]);
                                                                                setFormError('');
                                                                                setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, mcqQuestions: [...s.mcqQuestions, ...parsed] } : s) }));
                                                                                setSectionBulkText('');
                                                                                setActiveSectionBulkId(null);
                                                                            }}
                                                                            className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center"
                                                                        >Parse Bulk Input</button>
                                                                        {sectionBulkErrors.length > 0 && (
                                                                            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 space-y-1">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Bulk format issues</p>
                                                                                {sectionBulkErrors.slice(0, 6).map((error, idx) => (
                                                                                    <p key={`${error}-${idx}`} className="text-[11px] font-semibold text-rose-700">- {error}</p>
                                                                                ))}
                                                                                {sectionBulkErrors.length > 6 && (
                                                                                    <p className="text-[10px] font-semibold text-rose-600">+{sectionBulkErrors.length - 6} more issues</p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, mcqQuestions: [...s.mcqQuestions, { id: `q-${Date.now()}`, question: '', options: makeEmptyOptions(), correctOptionId: 'opt-1' }] } : s) }))} className="flex-1 py-4 border-2 border-dashed border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all">+ Add Question</button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSectionBulkText('');
                                                                                setSectionBulkErrors([]);
                                                                                setActiveSectionBulkId(section.id);
                                                                            }}
                                                                            className="px-6 py-4 border-2 border-dashed border-gray-100 rounded-3xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:border-emerald-200 hover:text-emerald-500 transition-all"
                                                                        >Bulk Add</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                {section.codeQuestions.map((cq, cqIdx) => (
                                                                    <div key={cq.id} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-6">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Challenge {cqIdx + 1}</span>
                                                                                <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest">
                                                                                    Compiler: {cq.language}
                                                                                </span>
                                                                            </div>
                                                                            <button onClick={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.filter((_, ci) => ci !== cqIdx) } : s) }))} className="text-gray-300 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                                                                        </div>

                                                                        <textarea
                                                                            value={cq.prompt}
                                                                            onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, prompt: e.target.value } : q) } : s) }))}
                                                                            placeholder="Prompt for this code section..."
                                                                            className="w-full text-xs font-semibold p-4 bg-gray-50/30 rounded-2xl outline-none"
                                                                        />
                                                                        <textarea
                                                                            value={cq.codeStarter}
                                                                            onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, codeStarter: e.target.value } : q) } : s) }))}
                                                                            placeholder="Starter code..."
                                                                            className="w-full min-h-[120px] p-4 bg-gray-900 text-gray-100 rounded-2xl text-[10px] font-mono"
                                                                        />

                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Compiler Language</label>
                                                                            <select
                                                                                value={cq.language}
                                                                                onChange={(e) => setForm(p => ({
                                                                                    ...p,
                                                                                    sections: p.sections.map((s, i) => i === sIdx ? {
                                                                                        ...s,
                                                                                        codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, language: e.target.value as CompilerLanguage } : q)
                                                                                    } : s)
                                                                                }))}
                                                                                className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-[10px] font-semibold focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none"
                                                                            >
                                                                                {languageOptions.map((l) => (
                                                                                    <option key={l.value} value={l.value}>{l.label}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between px-1">
                                                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Test Cases</label>
                                                                                <button
                                                                                    onClick={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: [...(q.testCases || []), { input: '', expectedOutput: '' }] } : q) } : s) }))}
                                                                                    className="text-[9px] font-black text-emerald-500 uppercase tracking-widest"
                                                                                >+ Add</button>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                {(cq.testCases || []).map((tc, tcIdx) => (
                                                                                    <div key={tcIdx} className="flex gap-2 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                                                                                        <div className="flex-1 space-y-1">
                                                                                            <input
                                                                                                value={tc.input}
                                                                                                onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.map((qtc, tci) => tci === tcIdx ? { ...qtc, input: e.target.value } : qtc) } : q) } : s) }))}
                                                                                                placeholder="In"
                                                                                                className="w-full px-3 py-1.5 bg-white text-[9px] font-mono rounded-lg border border-gray-100"
                                                                                            />
                                                                                            <input
                                                                                                value={tc.expectedOutput}
                                                                                                onChange={(e) => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.map((qtc, tci) => tci === tcIdx ? { ...qtc, expectedOutput: e.target.value } : qtc) } : q) } : s) }))}
                                                                                                placeholder="Out"
                                                                                                className="w-full px-3 py-1.5 bg-white text-[9px] font-mono rounded-lg border border-gray-100"
                                                                                            />
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: s.codeQuestions.map((q, qi) => qi === cqIdx ? { ...q, testCases: q.testCases.filter((_, tci) => tci !== tcIdx) } : q) } : s) }))}
                                                                                            className="text-gray-300 hover:text-rose-500"
                                                                                        ><X className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void runCompilePreview(`mix-${section.id}-${cq.id}`, {
                                                                                    code: cq.codeStarter,
                                                                                    language: cq.language,
                                                                                    testCases: (cq.testCases || []).filter((tc) => tc.input.trim() && tc.expectedOutput.trim()),
                                                                                })}
                                                                                disabled={compilingKey === `mix-${section.id}-${cq.id}`}
                                                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                                                                            >
                                                                                <Play className="w-3.5 h-3.5" /> {compilingKey === `mix-${section.id}-${cq.id}` ? 'Compiling...' : 'Run Compile Check'}
                                                                            </button>
                                                                            {compilePreviewByKey[`mix-${section.id}-${cq.id}`] && (
                                                                                <div className={cn(
                                                                                    'rounded-xl border p-3 text-xs font-semibold',
                                                                                    compilePreviewByKey[`mix-${section.id}-${cq.id}`].passed
                                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                                                                )}>
                                                                                    <p className="font-black uppercase tracking-widest text-[10px] mb-2">{compilePreviewByKey[`mix-${section.id}-${cq.id}`].message}</p>
                                                                                    {compilePreviewByKey[`mix-${section.id}-${cq.id}`].results.slice(0, 5).map((result, idx) => (
                                                                                        <p key={`${section.id}-${cq.id}-mix-result-${idx}`}>
                                                                                            Case {idx + 1}: {result.pass ? 'Pass' : 'Fail'}
                                                                                        </p>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    onClick={() => setForm(p => ({ ...p, sections: p.sections.map((s, i) => i === sIdx ? { ...s, codeQuestions: [...s.codeQuestions, { id: `cq-${Date.now()}`, prompt: '', codeStarter: '', language: p.language, testCases: [{ input: '', expectedOutput: '' }] }] } : s) }))}
                                                                    className="w-full py-6 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-indigo-200 hover:text-indigo-500 transition-all"
                                                                >+ Add Code Challenge</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-gray-50 bg-white flex items-center justify-between shrink-0">
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
                                        onClick={saveAssignment}
                                        disabled={saving}
                                        className="bg-emerald-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {saving ? 'Processing...' : (editingId ? 'Update Assignment' : 'Create Assignment')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {resultsOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 overflow-auto">
                    <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{selectedResult?.assignment.title || 'Assignment Results'}</h3>
                                <p className="text-xs font-semibold text-gray-500 mt-1">Students who submitted vs pending submissions</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setResultsOpen(false);
                                    setSelectedResult(null);
                                }}
                                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500"
                            >
                                <X className="w-4 h-4 mx-auto" />
                            </button>
                        </div>

                        {resultLoading ? (
                            <div className="p-8 text-sm font-semibold text-gray-500">Loading results...</div>
                        ) : selectedResult ? (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{selectedResult.stats.assignedCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Submitted</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{selectedResult.stats.attemptedCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{selectedResult.stats.pendingCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Best Score</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{selectedResult.stats.averageBestScore}%</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Submitted Students</p>
                                        </div>
                                        <div className="max-h-[380px] overflow-auto">
                                            {selectedResult.attempted.length === 0 ? (
                                                <p className="p-4 text-sm font-semibold text-gray-500">No student has submitted yet.</p>
                                            ) : (
                                                selectedResult.attempted.map((student) => (
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
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending Students</p>
                                        </div>
                                        <div className="max-h-[380px] overflow-auto">
                                            {selectedResult.pending.length === 0 ? (
                                                <p className="p-4 text-sm font-semibold text-gray-500">All assigned students submitted.</p>
                                            ) : (
                                                selectedResult.pending.map((student) => (
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
                            <div className="p-8 text-sm font-semibold text-rose-600">Unable to load assignment results.</div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
