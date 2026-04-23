import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, PlayCircle, Presentation, ShieldAlert, Download, Eye, Search, Maximize2, Minimize2 } from 'lucide-react';
import { init as initPptPreview } from 'pptx-preview';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { CodeRunResultRecord, CourseModuleRecord, CourseRecord, CourseUnitRecord, LearningProgressRecord } from '../../types/api';

type TestResult = {
  score: number;
  total: number;
  passed: boolean;
  details: any[];
};

type WarningState = {
  count: number;
  message: string;
};

type CourseTestPhase = 'countdown' | 'testing' | 'result';

type LectureModulePreview = {
  id: string;
  title: string;
  url: string;
  fileType: 'ppt' | 'pdf' | 'video';
  notes: string;
};

type RazorpayPaymentSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

let razorpayLoader: Promise<boolean> | null = null;
const PRE_START_SECONDS = 30;

function isFreeCourse(price?: string) {
  const normalized = String(price || '').trim().toLowerCase();
  return !normalized || normalized === 'free' || normalized === '0' || normalized === '₹0';
}

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayLoader;
}

const defaultProgress: LearningProgressRecord = {
  totalLectures: 0,
  totalModules: 0,
  completedLectures: 0,
  completedModules: 0,
  lecturePercent: 0,
  modulePercent: 0,
};

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseRecord | null>(null);
  const [progress, setProgress] = useState<LearningProgressRecord>(defaultProgress);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [selectedLectureIndex, setSelectedLectureIndex] = useState(0);

  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testPhase, setTestPhase] = useState<CourseTestPhase>('countdown');
  const [preStartSeconds, setPreStartSeconds] = useState(PRE_START_SECONDS);
  const [testIndex, setTestIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [warning, setWarning] = useState<WarningState>({ count: 0, message: '' });
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [codeAnswer, setCodeAnswer] = useState('');
  const [codeRunResult, setCodeRunResult] = useState<CodeRunResultRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [pptRenderError, setPptRenderError] = useState('');
  const [textPreviewContent, setTextPreviewContent] = useState('');
  const [pptSlideCount, setPptSlideCount] = useState(0);
  const [pptSlideIndex, setPptSlideIndex] = useState(1);
  const [courseNavSearch, setCourseNavSearch] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  const [pptRenderTick, setPptRenderTick] = useState(0);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const testRootRef = useRef<HTMLDivElement | null>(null);
  const viewerScrollRef = useRef<HTMLDivElement | null>(null);
  const pptContainerRef = useRef<HTMLDivElement | null>(null);
  const pptPreviewerRef = useRef<any>(null);
  const lectureStartRef = useRef<number | null>(null);
  const activeLectureIdRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadCourseDetail = async () => {
      if (!id || !user?.email) return;

      try {
        setLoading(true);
        const response = await api.getCourseDetail(Number(id), user.email);
        if (!isMounted) return;

        const loadedCourse = response.data.course;
        setCourse(loadedCourse);
        setProgress(response.data.progress || defaultProgress);
        setIsEnrolled(Boolean(response.data.enrolled));

        setSelectedUnitIndex(0);
        setSelectedLectureIndex(0);
        setExpandedUnits({ 0: true });
      } catch {
        if (isMounted) {
          setCourse(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCourseDetail();

    return () => {
      isMounted = false;
    };
  }, [id, user?.email]);

  const selectedUnit = useMemo(() => {
    const units = course?.units || [];
    if (units.length === 0) return undefined;
    return units[Math.min(selectedUnitIndex, units.length - 1)] || units[0];
  }, [course?.units, selectedUnitIndex]);

  const selectedLecture = useMemo(() => {
    const lectures = selectedUnit?.lectures || [];
    if (lectures.length === 0) return undefined;
    return lectures[Math.min(selectedLectureIndex, lectures.length - 1)] || lectures[0];
  }, [selectedUnit, selectedLectureIndex]);

  const selectedLectureModules = useMemo<LectureModulePreview[]>(() => {
    const modules = (selectedLecture?.modules || []) as CourseModuleRecord[];

    const normalized = modules
      .map((moduleItem, moduleIndex) => {
        const pptUrl = resolveAssetUrl(moduleItem?.pptUrl);
        const pdfUrl = resolveAssetUrl(moduleItem?.pdfUrl);
        const videoUrl = resolveAssetUrl(moduleItem?.videoUrl);
        const url = pptUrl || pdfUrl || videoUrl || '';
        if (!url) return null;

        return {
          id: String(moduleItem?.id || `${selectedLecture?.id || 'lec'}-mod-${moduleIndex + 1}`),
          title: String(moduleItem?.title || `Module ${moduleIndex + 1}`),
          url,
          fileType: pptUrl ? 'ppt' : videoUrl ? 'video' : 'pdf',
          notes: String(moduleItem?.notes || ''),
        } as LectureModulePreview;
      })
      .filter(Boolean) as LectureModulePreview[];

    if (normalized.length > 0) return normalized;

    const fallbackUrl = resolveAssetUrl(selectedLecture?.documentUrl);
    if (!fallbackUrl) return [];

    const lower = `${String(selectedLecture?.documentName || '')} ${fallbackUrl}`.toLowerCase();
    const fileType: LectureModulePreview['fileType'] =
      lower.includes('.ppt') ? 'ppt' : lower.includes('.mp4') || lower.includes('.webm') ? 'video' : 'pdf';

    return [{
      id: `${selectedLecture?.id || 'lecture'}-default-module`,
      title: String(selectedLecture?.documentName || selectedLecture?.title || 'Lecture Document'),
      url: fallbackUrl,
      fileType,
      notes: String(selectedLecture?.summary || ''),
    }];
  }, [selectedLecture]);

  const selectedLectureModule = useMemo(() => {
    if (selectedLectureModules.length === 0) return null;
    return selectedLectureModules.find((moduleItem) => moduleItem.id === selectedModuleId) || selectedLectureModules[0];
  }, [selectedLectureModules, selectedModuleId]);

  useEffect(() => {
    if (selectedLectureModules.length === 0) {
      setSelectedModuleId('');
      return;
    }
    setSelectedModuleId(selectedLectureModules[0].id);
  }, [selectedLecture?.id, selectedLectureModules]);

  const selectedLectureDocumentUrl = useMemo(
    () => selectedLectureModule?.url || '',
    [selectedLectureModule]
  );

  const selectedLectureDocumentName = useMemo(
    () => selectedLectureModule?.title || selectedLecture?.title || 'Lecture Document',
    [selectedLectureModule, selectedLecture?.title]
  );

  const selectedLectureDocumentExtension = useMemo(() => {
    const target = `${selectedLectureDocumentName} ${selectedLectureDocumentUrl}`.toLowerCase();
    const match = target.match(/\.([a-z0-9]{2,5})(\?|#|$)/i);
    return match?.[1] || '';
  }, [selectedLectureDocumentName, selectedLectureDocumentUrl]);

  const selectedLectureDocumentType = useMemo(() => {
    if (selectedLectureModule?.fileType === 'ppt') return 'pptx';
    if (selectedLectureModule?.fileType === 'video') return 'video';
    if (selectedLectureModule?.fileType === 'pdf') return 'pdf';

    const ext = selectedLectureDocumentExtension;
    if (ext === 'pptx') return 'pptx';
    if (ext === 'ppt') return 'ppt';
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (['txt', 'md', 'json', 'csv', 'log'].includes(ext)) return 'text';
    if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) return 'office';
    return 'other';
  }, [selectedLectureDocumentExtension, selectedLectureModule?.fileType]);

  const selectedLectureViewerUrl = useMemo(() => {
    if (!selectedLectureDocumentUrl) return '';
    return selectedLectureDocumentUrl;
  }, [selectedLectureDocumentUrl]);

  const isLocalDocumentUrl = useMemo(() => {
    const lower = String(selectedLectureDocumentUrl || '').toLowerCase();
    return lower.includes('localhost') || lower.includes('127.0.0.1') || lower.startsWith('/');
  }, [selectedLectureDocumentUrl]);

  const legacyPptViewerUrl = useMemo(() => {
    if (selectedLectureDocumentType !== 'ppt' || !selectedLectureDocumentUrl) return '';
    const lower = selectedLectureDocumentUrl.toLowerCase();
    if (lower.includes('localhost') || lower.includes('127.0.0.1') || lower.startsWith('/')) {
      return '';
    }
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(selectedLectureDocumentUrl)}`;
  }, [selectedLectureDocumentType, selectedLectureDocumentUrl]);

  useEffect(() => {
    if (selectedLectureDocumentType !== 'text' || !selectedLectureDocumentUrl) {
      setTextPreviewContent('');
      return;
    }

    let cancelled = false;

    const loadText = async () => {
      try {
        const response = await fetch(selectedLectureDocumentUrl);
        if (!response.ok) throw new Error('Failed to load text file');
        const text = await response.text();
        if (!cancelled) {
          setTextPreviewContent(text.slice(0, 50000));
        }
      } catch {
        if (!cancelled) {
          setTextPreviewContent('Unable to load text preview. Use Download to open this file.');
        }
      }
    };

    void loadText();

    return () => {
      cancelled = true;
    };
  }, [selectedLectureDocumentType, selectedLectureDocumentUrl]);

  useEffect(() => {
    if (selectedLectureDocumentType !== 'pptx' || !selectedLectureDocumentUrl || !pptContainerRef.current) {
      setPptSlideCount(0);
      setPptSlideIndex(1);
      pptPreviewerRef.current = null;
      return;
    }

    let cancelled = false;
    const host = pptContainerRef.current;
    host.innerHTML = '';
    setPptRenderError('');

    const renderPpt = async () => {
      try {
        const response = await fetch(selectedLectureDocumentUrl);
        if (!response.ok) {
          throw new Error('Unable to load presentation file.');
        }

        const fileBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const availableWidth = host.clientWidth > 0
          ? host.clientWidth - 8
          : (isViewerFullscreen ? window.innerWidth - 24 : 960);
        const hostWidth = Math.max(360, availableWidth);
        const hostHeight = isViewerFullscreen
          ? Math.max(520, window.innerHeight - 180)
          : Math.max(340, Math.round((hostWidth * 9) / 16));

        const previewer = initPptPreview(host, {
          width: hostWidth,
          height: hostHeight,
          mode: 'slide',
        });

        pptPreviewerRef.current = previewer;

        await previewer.preview(fileBuffer);

        if (!cancelled) {
          const count = Number(previewer?.slideCount || 0);
          setPptSlideCount(count);
          setPptSlideIndex(Number(previewer?.currentIndex || 0) + 1);
        }
      } catch {
        if (!cancelled) {
          setPptRenderError('Unable to render this PPTX inline. Use Download to open it locally.');
        }
      }
    };

    void renderPpt();

    return () => {
      cancelled = true;
      host.innerHTML = '';
      pptPreviewerRef.current = null;
      setPptSlideCount(0);
      setPptSlideIndex(1);
    };
  }, [selectedLectureDocumentType, selectedLectureDocumentUrl, selectedLecture?.id, isViewerFullscreen, pptRenderTick]);

  const goToNextPptSlide = () => {
    const previewer = pptPreviewerRef.current;
    if (!previewer || typeof previewer.renderNextSlide !== 'function') return;
    previewer.renderNextSlide();
    setPptSlideIndex(Number(previewer?.currentIndex || 0) + 1);
  };

  const goToPrevPptSlide = () => {
    const previewer = pptPreviewerRef.current;
    if (!previewer || typeof previewer.renderPreSlide !== 'function') return;
    previewer.renderPreSlide();
    setPptSlideIndex(Number(previewer?.currentIndex || 0) + 1);
  };

  const lectureTests = selectedLecture?.tests || [];
  const activeTest = lectureTests[testIndex] || null;

  const formatDuration = (seconds: number) => {
    const safe = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const selectedLectureSpentSeconds = useMemo(
    () => Number(progress.topicTimeByLecture?.[selectedLecture?.id || ''] || 0),
    [progress.topicTimeByLecture, selectedLecture?.id]
  );

  const selectedLecturePlannedMinutes = useMemo(
    () => Number((selectedLecture as any)?.testTimeMinutes || (selectedLecture as any)?.testTime || 30),
    [selectedLecture]
  );

  const filteredUnits = useMemo(() => {
    const units = course?.units || [];
    const term = courseNavSearch.trim().toLowerCase();
    if (!term) return units;

    return units
      .map((unit) => {
        const lectureMatches = (unit.lectures || []).filter((lecture) =>
          String(lecture.title || '').toLowerCase().includes(term)
        );

        const unitMatch = String(unit.title || '').toLowerCase().includes(term);
        if (unitMatch) return unit;
        if (lectureMatches.length === 0) return null;
        return { ...unit, lectures: lectureMatches };
      })
      .filter(Boolean) as CourseUnitRecord[];
  }, [course?.units, courseNavSearch]);

  useEffect(() => {
    if (!viewerScrollRef.current) return;
    viewerScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedLecture?.id, selectedLectureDocumentUrl, selectedLectureDocumentType]);

  const supportsStageControls = useMemo(
    () => ['pptx', 'ppt', 'pdf'].includes(selectedLectureDocumentType),
    [selectedLectureDocumentType]
  );

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsViewerFullscreen(document.fullscreenElement === viewerScrollRef.current);
      if (selectedLectureDocumentType === 'pptx') {
        setPptRenderTick((value) => value + 1);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [selectedLectureDocumentType]);

  useEffect(() => {
    if (selectedLectureDocumentType !== 'pptx') return;

    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setPptRenderTick((value) => value + 1);
      }, 120);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [selectedLectureDocumentType]);

  const toggleViewerFullscreen = async () => {
    const target = viewerScrollRef.current;
    if (!target) return;

    if (document.fullscreenElement === target) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      return;
    }

    if (target.requestFullscreen) {
      await target.requestFullscreen();
    }
  };

  useEffect(() => {
    if (!isTestOpen || testPhase !== 'countdown') return;
    if (preStartSeconds <= 0) {
      setTestPhase('testing');
      return;
    }

    const timer = window.setInterval(() => {
      setPreStartSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTestOpen, testPhase, preStartSeconds]);

  useEffect(() => {
    if (!isTestOpen || testPhase !== 'testing') return;
    if (isPaused) return;
    if (secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTestOpen, testPhase, isPaused, secondsLeft]);

  useEffect(() => {
    if (!isTestOpen || testPhase !== 'testing') return;
    if (secondsLeft > 0) return;
    if (!activeTest) return;

    void handleSubmitTest();
  }, [isTestOpen, testPhase, secondsLeft, activeTest]);

  useEffect(() => {
    if (!isTestOpen || testPhase !== 'testing') return;

    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onCopyPasteCut = (event: ClipboardEvent) => event.preventDefault();
    const onVisibilityChange = () => {
      if (document.hidden) {
        setWarning((current) => ({
          count: current.count + 1,
          message: 'Tab switch detected. Please stay on the test screen.',
        }));
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const blocked = (event.ctrlKey || event.metaKey) && ['c', 'v', 'x'].includes(event.key.toLowerCase());
      if (blocked) {
        event.preventDefault();
      }

      if (event.key === 'Escape' && document.fullscreenElement) {
        event.preventDefault();
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isTestOpen) {
        setWarning((current) => ({
          count: current.count + 1,
          message: 'Fullscreen exited. Please return to fullscreen to continue test.',
        }));
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopyPasteCut);
    document.addEventListener('paste', onCopyPasteCut);
    document.addEventListener('cut', onCopyPasteCut);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopyPasteCut);
      document.removeEventListener('paste', onCopyPasteCut);
      document.removeEventListener('cut', onCopyPasteCut);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [isTestOpen, testPhase]);

  useEffect(() => {
    if (!user?.email || !course?.id || !isEnrolled || !selectedLecture?.id) return;

    const syncTopicTime = () => {
      const startedAt = lectureStartRef.current;
      const lectureId = activeLectureIdRef.current;
      if (!startedAt || !lectureId) return;

      const deltaSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      lectureStartRef.current = Date.now();
      if (deltaSeconds < 3) return;

      void api.trackTopicTime({
        studentEmail: user.email,
        courseId: course.id,
        lectureId,
        secondsSpent: deltaSeconds,
      }).catch(() => {
        // keep UI responsive on sync failures
      });
    };

    if (activeLectureIdRef.current && activeLectureIdRef.current !== selectedLecture.id) {
      syncTopicTime();
    }

    activeLectureIdRef.current = selectedLecture.id;
    lectureStartRef.current = Date.now();

    const intervalId = window.setInterval(syncTopicTime, 30000);

    return () => {
      window.clearInterval(intervalId);
      syncTopicTime();
    };
  }, [selectedLecture?.id, user?.email, course?.id, isEnrolled]);

  useEffect(() => {
    if (!isTestOpen || testPhase !== 'testing' || !activeTest || activeTest.type !== 'code') return;
    setCodeAnswer('');
    setCodeRunResult(null);
  }, [isTestOpen, testPhase, testIndex]);

  const markModuleComplete = async (lectureId: string, moduleId: string) => {
    if (!user?.email || !course?.id) return;
    if (!isEnrolled) {
      setEnrollMessage({ type: 'error', text: 'Enroll first to access this course content.' });
      return;
    }

    try {
      await api.markModuleCompleted({
        studentEmail: user.email,
        courseId: course.id,
        lectureId,
        moduleId,
      });

      const updated = await api.getCourseDetail(course.id, user.email);
      setProgress(updated.data.progress || defaultProgress);
      setIsEnrolled(Boolean(updated.data.enrolled));
    } catch {
      // keep UI responsive even if progress update fails
    }
  };

  const handleEnroll = async () => {
    if (!user?.email || !course?.id) return;

    setEnrollMessage(null);
    setEnrolling(true);

    try {
      if (isFreeCourse(course.price)) {
        const confirmed = window.confirm(`This course is free. Confirm enrollment for ${course.title}?`);
        if (!confirmed) {
          setEnrolling(false);
          return;
        }

        await api.enrollInCourse(user.email, course.id);
      } else {
        const confirmed = window.confirm(`This is a paid course (${course.price}). Continue to Razorpay payment?`);
        if (!confirmed) {
          setEnrolling(false);
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !(window as any).Razorpay) {
          throw new Error('Razorpay checkout failed to load. Please try again.');
        }

        const orderRes = await api.createCoursePaymentOrder(user.email, course.id);

        await new Promise<void>((resolve, reject) => {
          const options = {
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
            handler: async (response: RazorpayPaymentSuccess) => {
              try {
                await api.verifyCoursePaymentAndEnroll({
                  studentEmail: user.email,
                  courseId: course.id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                resolve();
              } catch (verificationError) {
                reject(verificationError);
              }
            },
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.on('payment.failed', (event: any) => {
            reject(new Error(event?.error?.description || 'Payment was not completed.'));
          });
          razorpay.open();
        });
      }

      const updated = await api.getCourseDetail(course.id, user.email);
      setProgress(updated.data.progress || defaultProgress);
      setIsEnrolled(Boolean(updated.data.enrolled));
      setEnrollMessage({
        type: 'success',
        text: isFreeCourse(course.price) ? 'Successfully enrolled in free course.' : 'Payment successful. Enrollment completed.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enrollment failed. Please try again.';
      setEnrollMessage({ type: 'error', text: message });
    } finally {
      setEnrolling(false);
    }
  };

  const openTest = async () => {
    if (!activeTest || !selectedLecture) return;
    if (!isEnrolled) {
      setEnrollMessage({ type: 'error', text: 'Enroll first to attempt tests.' });
      return;
    }

    setIsTestOpen(true);
    setTestPhase('countdown');
    setPreStartSeconds(PRE_START_SECONDS);
    setResult(null);
    setCodeRunResult(null);
    setMcqAnswers({});
    setCodeAnswer('');

    const minutes = Math.max(1, Number((selectedLecture as any).testTimeMinutes || (selectedLecture as any).testTime || 30));
    setSecondsLeft(minutes * 60);
    setIsPaused(false);
    setWarning({ count: 0, message: '' });

    if (testRootRef.current?.requestFullscreen) {
      try {
        await testRootRef.current.requestFullscreen();
      } catch {
        setWarning({ count: 1, message: 'Fullscreen was blocked by browser. Please allow fullscreen for secure test mode.' });
      }
    }
  };

  const closeTest = async () => {
    setIsTestOpen(false);
    setIsPaused(false);
    setTestPhase('countdown');
    setPreStartSeconds(PRE_START_SECONDS);

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
  };

  const runCode = async () => {
    if (!activeTest || activeTest.type !== 'code') return;

    try {
      const runRes = await api.runLearningCode({
        code: codeAnswer,
        functionName: activeTest.functionName || 'solve',
        testCases: activeTest.testCases || [],
        language: activeTest.language || 'js',
      });
      setCodeRunResult(runRes.data);
    } catch {
      setCodeRunResult({
        passed: false,
        message: 'Run failed',
        results: [],
      });
    }
  };

  const handleSubmitTest = async () => {
    if (!activeTest || !selectedLecture || !course || !user?.email || submitting) return;

    try {
      setSubmitting(true);

      const answerPayload: Record<string, string> | undefined =
        activeTest.type === 'mcq' ? { selectedOptionId: mcqAnswers[activeTest.id] || '' } : undefined;

      const payload = {
        studentEmail: user.email,
        courseId: course.id,
        lectureId: selectedLecture.id,
        testId: activeTest.id,
        answers: answerPayload,
        code: activeTest.type === 'code' ? codeAnswer : '',
        language: activeTest.language || 'js',
        warningCount: warning.count,
        timeTakenSeconds: Math.max(
          0,
          Math.round((Math.max(1, Number((selectedLecture as any).testTimeMinutes || (selectedLecture as any).testTime || 30)) * 60) - secondsLeft)
        ),
      };

      const submitRes = await api.submitLearningTest(payload);
      setResult({
        score: submitRes.data.score,
        total: submitRes.data.total,
        passed: submitRes.data.passed,
        details: submitRes.data.details,
      });
      setTestPhase('result');

      await markModuleComplete(selectedLecture.id, `${selectedLecture.id}-module-1`);
    } catch {
      setResult({
        score: 0,
        total: 1,
        passed: false,
        details: [],
      });
      setTestPhase('result');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-sm font-semibold text-gray-500">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-sm font-semibold text-gray-600">Course not found.</p>
        <button onClick={() => navigate('/courses')} className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden" ref={testRootRef}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-emerald-600 mb-3">
            <ChevronLeft className="w-4 h-4" /> Back to Courses
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight break-all">{course.title}</h1>
          <p className="text-sm text-gray-500 font-semibold mt-1 break-all">{course.description}</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 break-all">Teacher: {course.teacherName || course.createdBy || 'Teacher'}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 min-w-[220px]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Course Progress</p>
          <p className="text-lg font-black text-gray-900 mt-1">{isEnrolled ? `${progress.modulePercent}%` : 'Not Enrolled'}</p>
          <div className="h-2 mt-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${isEnrolled ? progress.modulePercent : 0}%` }} />
          </div>
          <p className="text-[11px] mt-2 text-gray-500 font-semibold">
            {isEnrolled ? `${progress.completedModules}/${progress.totalModules} modules completed` : 'Enroll to start tracking'}
          </p>
          {isEnrolled && (
            <p className="text-[11px] mt-1 text-indigo-600 font-semibold">
              Time Progress: {formatDuration(progress.topicTimeSpentSeconds || 0)} / {formatDuration(progress.expectedTopicSeconds || 0)} ({progress.topicTimePercent || 0}%)
            </p>
          )}
          {enrollMessage && (
            <p className={`text-[11px] font-black uppercase tracking-wider mt-2 ${enrollMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {enrollMessage.text}
            </p>
          )}
          {!isEnrolled && (
            <button
              type="button"
              onClick={() => void handleEnroll()}
              disabled={enrolling}
              className="mt-3 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
            >
              {enrolling ? 'Processing...' : isFreeCourse(course?.price) ? 'Enroll Free' : `Pay & Enroll (${course?.price || 'Paid'})`}
            </button>
          )}
        </div>
      </div>

      {!isEnrolled ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">Course Locked</p>
          <h2 className="text-xl font-black text-amber-900 mt-1">Enroll to access lectures, files, and tests.</h2>
          <p className="text-sm font-semibold text-amber-800 mt-2">
            After enrollment, all modules and assessments for this course will unlock instantly.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <aside className="xl:col-span-4 bg-white border border-gray-100 rounded-[22px] p-3 h-fit max-h-[78vh] overflow-auto">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={courseNavSearch}
              onChange={(event) => setCourseNavSearch(event.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-gray-100 bg-gray-50 pl-9 pr-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="space-y-2">
            {filteredUnits.map((unit: CourseUnitRecord, unitIndex) => {
              const globalUnitIndex = (course.units || []).findIndex((entry) => entry.id === unit.id);
              const actualUnitIndex = globalUnitIndex >= 0 ? globalUnitIndex : unitIndex;
              const unitLectures = unit.lectures || [];
              const completedInUnit = unitLectures.filter((lecture) => Number(progress.topicTimeByLecture?.[lecture.id] || 0) > 0).length;
              const unitProgress = unitLectures.length > 0 ? Math.round((completedInUnit / unitLectures.length) * 100) : 0;
              const isExpanded = expandedUnits[actualUnitIndex] ?? actualUnitIndex === selectedUnitIndex;

              return (
                <div key={`${unit.id}-${actualUnitIndex}`} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedUnits((current) => ({ ...current, [actualUnitIndex]: !isExpanded }));
                      setSelectedUnitIndex(actualUnitIndex);
                      setSelectedLectureIndex(0);
                      setTestIndex(0);
                    }}
                    className="w-full px-3 py-3 flex items-center justify-between gap-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                      <p className="text-[13px] font-black text-gray-800 break-all text-left">{unit.title}</p>
                    </div>
                    <div className="w-11 h-11 rounded-full p-[3px]" style={{ background: `conic-gradient(#4f46e5 ${unitProgress}%, #e5e7eb ${unitProgress}% 100%)` }}>
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-black text-gray-500">{unitProgress}%</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {unitLectures.map((lecture, lectureIndex) => {
                        const globalLectureIndex = (course.units?.[actualUnitIndex]?.lectures || []).findIndex((entry) => entry.id === lecture.id);
                        const actualLectureIndex = globalLectureIndex >= 0 ? globalLectureIndex : lectureIndex;
                        const lectureSelected = selectedUnitIndex === actualUnitIndex && selectedLectureIndex === actualLectureIndex;
                        const lectureTime = Number(progress.topicTimeByLecture?.[lecture.id] || 0);

                        return (
                          <button
                            key={`${lecture.id}-${actualUnitIndex}-${actualLectureIndex}`}
                            type="button"
                            onClick={() => {
                              setSelectedUnitIndex(actualUnitIndex);
                              setSelectedLectureIndex(actualLectureIndex);
                              setTestIndex(0);
                            }}
                            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${lectureSelected ? 'border-indigo-200 bg-indigo-50/60' : 'border-transparent hover:border-gray-100 hover:bg-gray-50'}`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`mt-1 w-2.5 h-2.5 rounded-full ${lectureSelected ? 'bg-indigo-500' : lectureTime > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              <div className="min-w-0">
                                <p className={`text-sm font-black break-all ${lectureSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                                  {lectureIndex + 1}. {lecture.title}
                                </p>
                                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-semibold text-gray-500">
                                  <p className="break-all">{selectedLectureDocumentType.toUpperCase() || 'DOC'} • {selectedLecturePlannedMinutes}m</p>
                                  <p className="text-right">Spent: {formatDuration(lectureTime)}</p>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="xl:col-span-8 space-y-4">
          <section className="bg-white border border-gray-100 rounded-[22px] overflow-hidden">
            <div className="px-5 py-4 bg-[radial-gradient(circle_at_20%_20%,_rgba(99,102,241,0.12)_0%,_rgba(255,255,255,1)_55%)] border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h2 className="text-[32px] font-black text-gray-900 break-all leading-tight">{selectedLecture?.title || 'Lecture'}</h2>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Eye className="w-4 h-4" /> {Math.max(1, Math.round(selectedLectureSpentSeconds / 240))} Views</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Clock3 className="w-4 h-4" /> {formatDuration(selectedLectureSpentSeconds)} Time Spent</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {selectedLectureDocumentUrl ? (
                <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-800 font-bold">
                      {selectedLectureDocumentType === 'ppt' || selectedLectureDocumentType === 'pptx' ? (
                        <Presentation className="w-4 h-4 text-blue-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-emerald-500" />
                      )}
                      {selectedLectureDocumentType === 'ppt' || selectedLectureDocumentType === 'pptx' ? 'PPT Content' : 'Document Content'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 break-all">{selectedLectureDocumentName}</p>
                  </div>
                  <a
                    href={selectedLectureDocumentUrl}
                    download
                    className="rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-2 text-gray-800 font-bold"><Download className="w-4 h-4 text-blue-500" /> Download</div>
                    <p className="text-xs text-gray-500 mt-1">Save file to your device</p>
                  </a>
                </div>

                {selectedLectureModules.length > 1 && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-2">Lecture Modules</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLectureModules.map((moduleItem, moduleIndex) => (
                        <button
                          key={moduleItem.id}
                          type="button"
                          onClick={() => setSelectedModuleId(moduleItem.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${selectedLectureModule?.id === moduleItem.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            }`}
                        >
                          {moduleIndex + 1}. {moduleItem.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLectureModule?.notes && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Module Note</p>
                    <p className="text-xs font-semibold text-gray-700 whitespace-pre-wrap break-words">{selectedLectureModule.notes}</p>
                  </div>
                )}

                <div
                  ref={viewerScrollRef}
                  className={`relative rounded-2xl border border-gray-200 overflow-auto bg-gray-50 ${isViewerFullscreen ? 'h-[calc(100vh-40px)]' : 'h-[540px]'}`}
                >
                  {supportsStageControls && (
                    <button
                      type="button"
                      onClick={() => void toggleViewerFullscreen()}
                      className="absolute bottom-3 right-3 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full border border-indigo-200 bg-white/95 text-indigo-700 shadow hover:bg-indigo-50"
                      title={isViewerFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isViewerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  )}
                  {selectedLectureDocumentType === 'pptx' ? (
                    <div className="h-full bg-white flex flex-col">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-white sticky top-0 z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Slide {Math.min(pptSlideIndex, Math.max(1, pptSlideCount))}/{Math.max(1, pptSlideCount)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={goToPrevPptSlide}
                            disabled={pptSlideIndex <= 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                          >
                            Prev Slide
                          </button>
                          <button
                            type="button"
                            onClick={goToNextPptSlide}
                            disabled={pptSlideCount === 0 || pptSlideIndex >= pptSlideCount}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                          >
                            Next Slide
                          </button>
                        </div>
                      </div>
                      {pptRenderError ? (
                        <div className="h-full overflow-auto p-4 text-sm font-semibold text-red-600">
                          <p>{pptRenderError}</p>
                          {!isLocalDocumentUrl ? (
                            <iframe
                              src={selectedLectureViewerUrl}
                              title="PPTX fallback viewer"
                              className="w-full h-[980px] mt-3 bg-white border border-gray-200 rounded-xl"
                            />
                          ) : (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-800">
                              <p className="text-xs font-black uppercase tracking-widest">Localhost Preview Limitation</p>
                              <p className="text-sm font-semibold mt-2">
                                Browser blocked iframe preview for local PPTX. Use Download to view this file.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white p-3">
                          <div ref={pptContainerRef} className="w-full" />
                        </div>
                      )}
                    </div>
                  ) : selectedLectureDocumentType === 'ppt' ? (
                    <div className="h-full bg-white p-3">
                      {legacyPptViewerUrl ? (
                        <iframe
                          src={legacyPptViewerUrl}
                          title="PPT viewer"
                          className="w-full h-[980px] border border-gray-200 rounded-xl bg-white"
                        />
                      ) : (
                        <div className="h-full border border-dashed border-gray-200 rounded-xl flex items-center justify-center p-6 text-center">
                          <div>
                            <p className="text-sm font-black text-gray-800">Inline preview is not available for this legacy .ppt file</p>
                            <p className="text-xs text-gray-500 font-semibold mt-2">Please download it, or re-upload as .pptx for full inline preview.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedLectureDocumentType === 'pdf' ? (
                    <div className="h-full bg-white p-3">
                      <iframe
                        src={selectedLectureViewerUrl}
                        title="Lecture PDF Viewer"
                        className="w-full h-[980px] border border-gray-200 rounded-xl bg-white"
                      />
                    </div>
                  ) : selectedLectureDocumentType === 'image' ? (
                    <div className="h-full bg-white p-3 flex items-center justify-center">
                      <img src={selectedLectureViewerUrl} alt={selectedLectureDocumentName} className="max-w-full max-h-[520px] object-contain rounded-xl border border-gray-200" />
                    </div>
                  ) : selectedLectureDocumentType === 'video' ? (
                    <div className="h-full bg-black p-3 flex items-center justify-center">
                      <video src={selectedLectureViewerUrl} controls className="w-full max-h-[520px] rounded-xl" />
                    </div>
                  ) : selectedLectureDocumentType === 'audio' ? (
                    <div className="h-full bg-white p-6 flex items-center justify-center">
                      <div className="w-full max-w-2xl rounded-2xl border border-gray-100 p-6 bg-gray-50">
                        <p className="text-sm font-black text-gray-800 mb-4">Audio Preview</p>
                        <audio src={selectedLectureViewerUrl} controls className="w-full" />
                      </div>
                    </div>
                  ) : selectedLectureDocumentType === 'text' ? (
                    <div className="h-full bg-white p-3">
                      <pre className="w-full h-full overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs font-mono text-gray-800 whitespace-pre-wrap">
                        {textPreviewContent}
                      </pre>
                    </div>
                  ) : selectedLectureDocumentType === 'office' ? (
                    <div className="h-full bg-white p-6 flex items-center justify-center text-center">
                      <div>
                        <p className="text-sm font-black text-gray-800">Office file uploaded successfully</p>
                        <p className="text-xs text-gray-500 font-semibold mt-2">For reliable inline preview, upload as PDF or PPTX.</p>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={selectedLectureViewerUrl}
                      title="Lecture Document Viewer"
                      className="w-full h-[980px] bg-white"
                    />
                  )}
                </div>
                {(selectedLectureDocumentType === 'pptx' || selectedLectureDocumentType === 'ppt') && (
                  <p className="text-xs text-gray-500 font-semibold">
                    {selectedLectureDocumentType === 'pptx'
                      ? 'PPTX is rendered inline directly inside this page.'
                      : legacyPptViewerUrl
                        ? 'Legacy PPT is shown with Office embed when the file URL is publicly accessible.'
                        : 'Legacy PPT from local/private storage cannot be embedded reliably. Use Download or upload as .pptx.'}
                  </p>
                )}
                {selectedLectureDocumentType === 'pdf' && (
                  <p className="text-xs text-gray-500 font-semibold">PDF preview is rendered inline.</p>
                )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 font-semibold">
                  No PDF/PPT uploaded for this lecture yet.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-black text-gray-900">Lecture Test</h3>
              {lectureTests.length > 0 && (
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                  {testIndex + 1}/{lectureTests.length}
                </span>
              )}
            </div>

            {lectureTests.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold">No tests added for this lecture yet.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">{activeTest?.type === 'code' ? 'Coding Test' : 'MCQ Test'}</p>
                  <h4 className="text-lg font-black text-gray-900 mt-1">{activeTest?.title}</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-100 p-3 bg-gray-50/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Question Type</p>
                    <p className="text-sm font-black text-gray-900 mt-1">{activeTest?.type === 'code' ? 'Code Challenge' : 'Single MCQ'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-3 bg-gray-50/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Tests</p>
                    <p className="text-sm font-black text-gray-900 mt-1">{lectureTests.length}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-3 bg-gray-50/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Test</p>
                    <p className="text-sm font-black text-gray-900 mt-1">#{testIndex + 1}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTestIndex((current) => Math.max(0, current - 1))}
                    disabled={testIndex === 0}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestIndex((current) => Math.min(lectureTests.length - 1, current + 1))}
                    disabled={testIndex >= lectureTests.length - 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={openTest}
                    className="ml-auto px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600"
                  >
                    Take Test
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
      )}

      {isTestOpen && activeTest && (
        <div className="fixed inset-0 z-[120] bg-white p-4 sm:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {testPhase === 'countdown' ? (
              <div className="max-w-4xl mx-auto py-12">
                <div className="rounded-3xl border border-emerald-100 bg-white p-8 sm:p-10 text-center shadow-soft">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Get Ready</p>
                  <h2 className="text-3xl font-black text-gray-900 mt-2">{activeTest.title}</h2>
                  <p className="text-sm font-semibold text-gray-500 mt-2">Secure test mode starts in</p>
                  <div className="mt-6 text-6xl font-black text-emerald-600">{preStartSeconds}</div>
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">
                    No tab switching, no copy-paste, and stay focused on this test.
                  </p>
                  <button
                    type="button"
                    onClick={() => void closeTest()}
                    className="mt-8 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-black text-gray-900">Secure Test Mode: {activeTest.title}</h2>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                  <Clock3 className="w-3.5 h-3.5" /> {formatTime(secondsLeft)}
                </span>
                <button type="button" onClick={() => setIsPaused((current) => !current)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest">
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={closeTest} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest">
                  End Test
                </button>
              </div>
            </div>

            {warning.message && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-amber-800">Security Warning ({warning.count})</p>
                  <p className="text-xs text-amber-700 font-semibold mt-1">{warning.message}</p>
                </div>
              </div>
            )}

            {testPhase !== 'result' && !result ? (
              activeTest.type === 'mcq' ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-5">
                  <p className="text-sm font-bold text-gray-900">{activeTest.mcqQuestion || 'Question not configured.'}</p>
                  <div className="space-y-2">
                    {(activeTest.options || []).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMcqAnswers((current) => ({ ...current, [activeTest.id]: option.id }))}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold ${
                          mcqAnswers[activeTest.id] === option.id ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>

                  {!mcqAnswers[activeTest.id] && (
                    <p className="text-xs font-semibold text-amber-600">Select one option before submitting.</p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setTestIndex((current) => Math.max(0, current - 1))}
                      disabled={testIndex === 0}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                    >
                      <ChevronLeft className="w-4 h-4 inline-block mr-1" /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestIndex((current) => Math.min(lectureTests.length - 1, current + 1))}
                      disabled={testIndex >= lectureTests.length - 1}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                    >
                      Next <ChevronRight className="w-4 h-4 inline-block ml-1" />
                    </button>
                    <button
                      type="button"
                      disabled={submitting || !mcqAnswers[activeTest.id]}
                      onClick={() => void handleSubmitTest()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Problem</p>
                    <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">{activeTest.prompt || 'Problem statement not configured.'}</p>

                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 pt-2">Test Cases</p>
                    <div className="space-y-2">
                      {(activeTest.testCases || []).map((testCase, index) => (
                        <div key={index} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Input</p>
                          <p className="text-xs font-mono text-gray-700">{testCase.input}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Expected</p>
                          <p className="text-xs font-mono text-gray-700">{testCase.expectedOutput}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Compiler ({activeTest.language || 'js'})</p>
                      <button type="button" onClick={() => void runCode()} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-black uppercase tracking-widest inline-flex items-center gap-1">
                        <PlayCircle className="w-4 h-4" /> Run Code
                      </button>
                    </div>

                    <textarea
                      value={codeAnswer}
                      onChange={(event) => setCodeAnswer(event.target.value)}
                      placeholder={`Write your solution here. Define function ${activeTest.functionName || 'solve'}(...) and return output.`}
                      spellCheck={false}
                      className="w-full min-h-[280px] rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />

                    {!codeAnswer.trim() && (
                      <p className="text-xs font-semibold text-amber-600">Write your code solution before submitting this test.</p>
                    )}

                    {codeRunResult && (
                      <div className="rounded-2xl border border-gray-100 p-4">
                        <p className={`text-sm font-black ${codeRunResult.passed ? 'text-emerald-600' : 'text-red-600'}`}>{codeRunResult.message}</p>
                        <div className="mt-2 space-y-2">
                          {codeRunResult.results.map((row, index) => (
                            <div key={index} className={`rounded-xl p-2 text-xs font-mono ${row.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {row.pass ? 'PASS' : 'FAIL'} | input: {row.input} | expected: {row.expectedOutput} | actual: {row.actualOutput}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setTestIndex((current) => Math.max(0, current - 1))}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                      >
                        <ChevronLeft className="w-4 h-4 inline-block mr-1" /> Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestIndex((current) => Math.min(lectureTests.length - 1, current + 1))}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                      >
                        Next <ChevronRight className="w-4 h-4 inline-block ml-1" />
                      </button>
                      <button
                        type="button"
                        disabled={submitting || !codeAnswer.trim()}
                        onClick={() => void handleSubmitTest()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {submitting ? 'Submitting...' : 'Submit Test'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : result ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Result</p>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">{result.score}/{result.total}</h3>
                    <p className={`text-sm font-black mt-1 ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.passed ? 'Pass' : 'Fail'}
                    </p>
                  </div>
                  <AlertTriangle className={`w-6 h-6 ${result.passed ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>

                <div className="mt-4 space-y-3">
                  {(result.details || []).map((detail, index) => (
                    <div key={index} className={`rounded-xl p-4 border-l-4 ${detail.isCorrect || detail.pass ? 'bg-emerald-50 border-l-emerald-500' : 'bg-red-50 border-l-red-500'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          {typeof detail.input !== 'undefined' ? (
                            <div className="space-y-2">
                              <p className="text-xs font-black uppercase tracking-widest text-gray-500">Test Case {index + 1}</p>
                              <p className="text-xs font-mono text-gray-700">Input: {detail.input}</p>
                              <p className="text-xs font-mono text-gray-700">Expected: {detail.expectedOutput}</p>
                              <p className={`text-xs font-mono ${detail.pass ? 'text-emerald-700' : 'text-red-700'}`}>Actual: {detail.actualOutput}</p>
                            </div>
                          ) : (
                            <>
                          {detail.question && (
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Question</p>
                          )}
                          {detail.question && (
                            <p className="text-sm font-semibold mb-3 text-gray-900">
                              {detail.question}
                            </p>
                          )}
                          
                          {(detail.isCorrect || detail.pass) ? (
                            <div className="space-y-2">
                              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">✓ Correct Answer</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {detail.selectedOptionId ? (
                                  <span>{detail.correctOptionText || detail.correctOption || detail.correctOptionId || 'Correct'}</span>
                                ) : (
                                  <span>{detail.correctAnswer || 'Correct'}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-black uppercase tracking-widest text-red-700">✗ Your Answer</p>
                              <p className="text-sm font-semibold text-gray-900 line-through opacity-60">
                                {detail.selectedOptionText || detail.selectedOption || detail.selectedOptionId || 'Not answered'}
                              </p>
                              <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mt-2">Correct Answer</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {detail.correctOptionText || detail.correctOption || detail.correctOptionId || 'N/A'}
                              </p>
                            </div>
                          )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResult(null);
                          setTestPhase('testing');
                        }}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest"
                      >
                    Retry
                  </button>
                  <button type="button" onClick={() => void closeTest()} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                    Close
                  </button>
                </div>
              </div>
            ) : null}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
