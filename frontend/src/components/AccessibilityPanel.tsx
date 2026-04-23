import React, { useEffect, useRef, useState } from 'react';
import { 
  Settings, X, Volume2, Sun, Moon, Mic,
  Headphones, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Point = { x: number; y: number };

const STORAGE_KEY = 'eduaccess-accessibility-panel-position';
const BUTTON_SIZE = 64;
const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 340;

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInitialPosition(): Point {
  if (typeof window === 'undefined') {
    return { x: 24, y: 24 };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Point>;
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return {
          x: clamp(parsed.x, 12, Math.max(12, window.innerWidth - BUTTON_SIZE - 12)),
          y: clamp(parsed.y, 12, Math.max(12, window.innerHeight - BUTTON_SIZE - 12)),
        };
      }
    }
  } catch {
    // Fall through to default placement.
  }

  return {
    x: Math.max(12, window.innerWidth - BUTTON_SIZE - 24),
    y: Math.max(12, window.innerHeight - BUTTON_SIZE - 24),
  };
}

export const AccessibilityPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Point>(() => getInitialPosition());
  const [isListening, setIsListening] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'ready' | 'blocked'>('idle');
  const [lastHeard, setLastHeard] = useState('');
  const [lastAction, setLastAction] = useState('Voice assistant is idle');
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const lastCommandRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const noSpeechRetryRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    fontSize, setFontSize, 
    theme, setTheme, 
    ttsEnabled, setTtsEnabled,
    audioMode, setAudioMode,
    readPage, stopSpeaking, repeatLastSpeech, speak
  } = useAccessibility();

  useEffect(() => {
    return () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      recognitionRef.current?.stop();
      setIsListening(false);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => ({
        x: clamp(current.x, 12, Math.max(12, window.innerWidth - BUTTON_SIZE - 12)),
        y: clamp(current.y, 12, Math.max(12, window.innerHeight - BUTTON_SIZE - 12)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    draggingRef.current = false;
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = moveEvent.clientX - dragOffsetRef.current.x;
      const nextY = moveEvent.clientY - dragOffsetRef.current.y;
      if (Math.abs(moveEvent.clientX - event.clientX) > 4 || Math.abs(moveEvent.clientY - event.clientY) > 4) {
        draggingRef.current = true;
      }

      setPosition({
        x: clamp(nextX, 12, Math.max(12, window.innerWidth - BUTTON_SIZE - 12)),
        y: clamp(nextY, 12, Math.max(12, window.innerHeight - BUTTON_SIZE - 12)),
      });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const openAbove = position.y > PANEL_HEIGHT + BUTTON_SIZE;

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    noSpeechRetryRef.current = 0;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setMicStatus((current) => (current === 'blocked' ? current : 'idle'));
    setLastAction('Voice assistant stopped');
  };

  const scrollPage = (deltaY: number) => {
    window.scrollBy({ top: deltaY, behavior: 'smooth' });
    speak(deltaY > 0 ? 'Scrolling down' : 'Scrolling up');
  };

  const goToRolePath = (studentPath: string, teacherPath?: string) => {
    if (user?.role === 'teacher') {
      navigate(teacherPath || studentPath);
      return;
    }
    navigate(studentPath);
  };

  const getFocusableElements = () => {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]'
      )
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  };

  const normalizeCommand = (input: string) => {
    const value = String(input || '').toLowerCase().trim();
    const cleaned = value
      .replace(/[.,!?;:()[\]{}"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const replacements: Array<[RegExp, string]> = [
      [/\bquizes\b/g, 'quizzes'],
      [/\bquizs\b/g, 'quizzes'],
      [/\bassingment\b/g, 'assignment'],
      [/\bassignement\b/g, 'assignment'],
      [/\bresourses\b/g, 'resources'],
      [/\bmesseges\b/g, 'messages'],
      [/\bsetings\b/g, 'settings'],
      [/\bdash board\b/g, 'dashboard'],
      [/\bvoice assistance\b/g, 'voice assistant'],
      [/\btext to speach\b/g, 'text to speech'],
    ];

    return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), cleaned);
  };

  const matchesIntent = (input: string, phrases: string[]) => {
    if (!input) return false;

    const text = normalizeCommand(input);
    const words = text.split(' ').filter(Boolean);
    if (!words.length) return false;

    return phrases.some((phrase) => {
      const normalizedPhrase = normalizeCommand(phrase);
      if (!normalizedPhrase) return false;
      if (text.includes(normalizedPhrase)) return true;

      const phraseWords = normalizedPhrase.split(' ').filter(Boolean);
      if (phraseWords.length === 1) {
        return words.some((word) => word === phraseWords[0]);
      }

      const matched = phraseWords.filter((token) =>
        words.some((word) => word === token || word.startsWith(token) || token.startsWith(word))
      ).length;

      return matched >= Math.max(2, Math.ceil(phraseWords.length * 0.7));
    });
  };

  const parseCommandIndex = (input: string): number | null => {
    const normalized = normalizeCommand(input);

    const explicit = normalized.match(/(?:number|no\.?|#)\s*(\d{1,2})/);
    if (explicit) {
      return Math.max(1, Number(explicit[1]));
    }

    const trailing = normalized.match(/(\d{1,2})\s*$/);
    if (trailing) {
      return Math.max(1, Number(trailing[1]));
    }

    const words: Record<string, number> = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
    };

    for (const [word, value] of Object.entries(words)) {
      if (normalized.includes(word)) {
        return value;
      }
    }

    return null;
  };

  const activateByKeywords = (keywords: string[], index = 1) => {
    const activatables = Array.from(
      document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], [data-action], [onclick]')
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.hasAttribute('disabled')) return false;
      const label = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      return keywords.some((keyword) => label.includes(keyword));
    });

    const selected = activatables[index - 1];
    if (selected) {
      selected.click();
      return true;
    }

    return false;
  };

  const runCommand = (command: string) => {
    const value = normalizeCommand(command);
    if (!value) return;

    const now = Date.now();
    if (lastCommandRef.current.text === value && now - lastCommandRef.current.at < 1200) {
      return;
    }
    lastCommandRef.current = { text: value, at: now };

    setLastHeard(value);

    const has = (...phrases: string[]) => matchesIntent(value, phrases);

    if (has('start reading', 'read page', 'listen to page', 'read this page')) {
      setLastAction('Reading page content');
      readPage();
      return;
    }

    if (has('read selected text', 'read selection', 'read highlighted text')) {
      const selectedText = window.getSelection?.()?.toString().trim();
      if (selectedText) {
        setLastAction('Reading selected text');
        speak(selectedText);
      } else {
        setLastAction('No selected text to read');
        speak('No selected text found.');
      }
      return;
    }

    const stopReadingIntent =
      value === 'stop' ||
      /stop\s+.*read/.test(value) ||
      has('stop reading', 'stop the reading', 'stop narration', 'stop talking', 'be quiet', 'pause reading');

    if (stopReadingIntent) {
      setLastAction('Stopped narration and disabled narrative mode');
      setAudioMode(false);
      stopSpeaking();
      return;
    }

    if (has('repeat', 'say again', 'repeat that')) {
      setLastAction('Repeating last speech');
      repeatLastSpeech();
      return;
    }

    if (has('open dashboard', 'go to dashboard', 'show dashboard', 'dashboard')) {
      setLastAction('Opening dashboard');
      goToRolePath('/dashboard', '/teacher/dashboard');
      return;
    }

    if (has('open teacher dashboard', 'go to teacher dashboard')) {
      if (user?.role !== 'teacher') {
        setLastAction('Teacher dashboard unavailable for student role');
        speak('Teacher dashboard is available only in teacher panel.');
        return;
      }
      setLastAction('Opening teacher dashboard');
      navigate('/teacher/dashboard');
      return;
    }

    if (has('open student dashboard', 'go to student dashboard')) {
      if (user?.role !== 'student') {
        setLastAction('Student dashboard unavailable for teacher role');
        speak('Student dashboard is available only in student panel.');
        return;
      }
      setLastAction('Opening student dashboard');
      navigate('/dashboard');
      return;
    }

    if (has('open home', 'go home', 'home page', 'open landing')) {
      setLastAction('Opening home page');
      navigate('/');
      return;
    }

    if (has('open courses', 'open my courses', 'go to courses', 'show courses', 'my courses')) {
      setLastAction('Opening courses');
      goToRolePath('/courses', '/teacher/courses');
      return;
    }

    if (has('open assignments', 'go to assignments', 'show assignments')) {
      setLastAction('Opening assignments');
      goToRolePath('/assignments', '/teacher/assignments');
      return;
    }

    if (has('open quizzes', 'go to quizzes', 'show quizzes')) {
      setLastAction('Opening quizzes');
      goToRolePath('/quizzes', '/teacher/quizzes');
      return;
    }

    if (has('open messages', 'go to messages', 'show messages')) {
      setLastAction('Opening messages');
      goToRolePath('/messages', '/teacher/messages');
      return;
    }

    if (has('open resources', 'go to resources', 'show resources')) {
      setLastAction('Opening resources');
      goToRolePath('/resources', '/teacher/resources');
      return;
    }

    if (has('open profile', 'go to profile', 'show profile')) {
      setLastAction('Opening profile/settings');
      goToRolePath('/profile', '/teacher/settings');
      return;
    }

    if (has('open notifications', 'go to notifications', 'show notifications')) {
      if (user?.role === 'teacher') {
        setLastAction('Notifications unavailable for teacher');
        speak('Notifications page is available only in student panel.');
        return;
      }
      setLastAction('Opening notifications');
      navigate('/notifications');
      return;
    }

    if (has('open community', 'go to community', 'show community')) {
      if (user?.role === 'teacher') {
        setLastAction('Community unavailable for teacher');
        speak('Community page is available only in student panel.');
        return;
      }
      setLastAction('Opening community');
      navigate('/community');
      return;
    }

    if (has('open students', 'go to students', 'show students')) {
      if (user?.role !== 'teacher') {
        setLastAction('Students unavailable for student role');
        speak('Students page is available only in teacher panel.');
        return;
      }
      setLastAction('Opening students');
      navigate('/teacher/students');
      return;
    }

    if (has('open grades', 'go to grades', 'show grades')) {
      if (user?.role !== 'teacher') {
        setLastAction('Grades unavailable for student role');
        speak('Grades page is available only in teacher panel.');
        return;
      }
      setLastAction('Opening grades');
      navigate('/teacher/grades');
      return;
    }

    if (has('open attendance', 'go to attendance', 'show attendance')) {
      if (user?.role !== 'teacher') {
        setLastAction('Attendance unavailable for student role');
        speak('Attendance page is available only in teacher panel.');
        return;
      }
      setLastAction('Opening attendance');
      navigate('/teacher/attendance');
      return;
    }

    if (has('open reports', 'go to reports', 'show reports')) {
      if (user?.role !== 'teacher') {
        setLastAction('Reports unavailable for student role');
        speak('Reports page is available only in teacher panel.');
        return;
      }
      setLastAction('Opening reports');
      navigate('/teacher/reports');
      return;
    }

    if (has('open settings', 'go to settings', 'show settings')) {
      if (user?.role !== 'teacher') {
        setLastAction('Settings unavailable for student role');
        speak('Settings page is available only in teacher panel.');
        return;
      }
      setLastAction('Opening settings');
      navigate('/teacher/settings');
      return;
    }

    if (has('open latest assignment', 'open newest assignment')) {
      setLastAction('Opening latest assignment');
      goToRolePath('/assignments', '/teacher/assignments');
      window.setTimeout(() => {
        activateByKeywords(['assignment', 'view', 'open', 'start'], 1);
      }, 200);
      return;
    }

    if (has('open latest quiz', 'open newest quiz')) {
      setLastAction('Opening latest quiz');
      goToRolePath('/quizzes', '/teacher/quizzes');
      window.setTimeout(() => {
        activateByKeywords(['quiz', 'view', 'open', 'start'], 1);
      }, 200);
      return;
    }

    if (has('open latest resource', 'open newest resource')) {
      setLastAction('Opening latest resource');
      goToRolePath('/resources', '/teacher/resources');
      window.setTimeout(() => {
        activateByKeywords(['resource', 'view', 'open', 'download'], 1);
      }, 200);
      return;
    }

    if (has('open latest message', 'open newest message')) {
      setLastAction('Opening latest message');
      goToRolePath('/messages', '/teacher/messages');
      window.setTimeout(() => {
        activateByKeywords(['message', 'chat', 'open', 'view'], 1);
      }, 200);
      return;
    }

    if (has('open assignment number', 'open assignment no', 'open assignment')) {
      const idx = parseCommandIndex(value);
      if (idx) {
        setLastAction(`Opening assignment number ${idx}`);
        goToRolePath('/assignments', '/teacher/assignments');
        window.setTimeout(() => {
          const ok = activateByKeywords(['assignment', 'view', 'open', 'start'], idx);
          if (!ok) {
            speak(`Assignment number ${idx} is not visible on this page.`);
          }
        }, 220);
        return;
      }
    }

    if (has('open quiz number', 'open quiz no', 'start quiz number', 'open quiz')) {
      const idx = parseCommandIndex(value);
      if (idx) {
        setLastAction(`Opening quiz number ${idx}`);
        goToRolePath('/quizzes', '/teacher/quizzes');
        window.setTimeout(() => {
          const ok = activateByKeywords(['quiz', 'view', 'open', 'start'], idx);
          if (!ok) {
            speak(`Quiz number ${idx} is not visible on this page.`);
          }
        }, 220);
        return;
      }
    }

    if (has('open resource number', 'open resource no', 'open resource')) {
      const idx = parseCommandIndex(value);
      if (idx) {
        setLastAction(`Opening resource number ${idx}`);
        goToRolePath('/resources', '/teacher/resources');
        window.setTimeout(() => {
          const ok = activateByKeywords(['resource', 'view', 'open', 'download'], idx);
          if (!ok) {
            speak(`Resource number ${idx} is not visible on this page.`);
          }
        }, 220);
        return;
      }
    }

    if (has('open course number', 'open course no', 'open course')) {
      const idx = parseCommandIndex(value);
      if (idx) {
        setLastAction(`Opening course number ${idx}`);
        goToRolePath('/courses', '/teacher/courses');
        window.setTimeout(() => {
          const ok = activateByKeywords(['course', 'view', 'open', 'start'], idx);
          if (!ok) {
            speak(`Course number ${idx} is not visible on this page.`);
          }
        }, 220);
        return;
      }
    }

    if (has('log out', 'logout', 'sign out')) {
      setLastAction('Logging out');
      logout();
      navigate('/');
      return;
    }

    if (has('enable t t s', 'enable tts', 'turn on tts', 'start tts', 'text to speech on')) {
      setLastAction('Enabled text to speech');
      setTtsEnabled(true);
      speak('Text to speech enabled');
      return;
    }

    if (has('disable t t s', 'disable tts', 'turn off tts', 'stop tts', 'text to speech off')) {
      setLastAction('Disabled text to speech');
      setTtsEnabled(false);
      stopSpeaking();
      return;
    }

    if (has('turn on high contrast', 'enable high contrast', 'high contrast on')) {
      setLastAction('Enabled high contrast');
      setTheme('high-contrast');
      speak('High contrast mode enabled');
      return;
    }

    if (has('turn off high contrast', 'disable high contrast', 'normal contrast', 'standard mode')) {
      setLastAction('Disabled high contrast');
      setTheme('light');
      speak('Standard contrast mode enabled');
      return;
    }

    if (has('increase font', 'larger text', 'bigger text', 'font up')) {
      if (fontSize === 'small') {
        setFontSize('medium');
        setLastAction('Increased font size to medium');
      } else if (fontSize === 'medium') {
        setFontSize('large');
        setLastAction('Increased font size to large');
      } else {
        setLastAction('Font size already large');
      }
      return;
    }

    if (has('decrease font', 'smaller text', 'font down')) {
      if (fontSize === 'large') {
        setFontSize('medium');
        setLastAction('Decreased font size to medium');
      } else if (fontSize === 'medium') {
        setFontSize('small');
        setLastAction('Decreased font size to small');
      } else {
        setLastAction('Font size already small');
      }
      return;
    }

    if (has('font medium', 'normal font')) {
      setFontSize('medium');
      setLastAction('Set font size to medium');
      return;
    }

    if (has('font large', 'set large font')) {
      setFontSize('large');
      setLastAction('Set font size to large');
      return;
    }

    if (has('font small', 'set small font')) {
      setFontSize('small');
      setLastAction('Set font size to small');
      return;
    }

    if (has('go back', 'back', 'previous page', 'go previous')) {
      setLastAction('Navigating back');
      window.history.back();
      return;
    }

    if (has('refresh page', 'reload page')) {
      setLastAction('Refreshing page');
      window.location.reload();
      return;
    }

    if (has('submit', 'submit form', 'save', 'save form')) {
      const activeForm = (document.activeElement as HTMLElement | null)?.closest('form') as HTMLFormElement | null;
      if (activeForm && typeof activeForm.requestSubmit === 'function') {
        setLastAction('Submitting active form');
        activeForm.requestSubmit();
      } else {
        setLastAction('No active form to submit');
        speak('No active form to submit on this section.');
      }
      return;
    }

    if (has('click new course', 'open new course', 'create course', 'new course')) {
      const target = document.getElementById('newCourseBtn') || document.querySelector('[aria-label*="new course" i]');
      if (target instanceof HTMLElement) {
        setLastAction('Triggering new course action');
        target.click();
      } else {
        setLastAction('New course action not found');
        speak('New course action is not available on this page.');
      }
      return;
    }

    if (has('scroll down', 'go down', 'down')) {
      setLastAction('Scrolling down');
      scrollPage(420);
      return;
    }

    if (has('scroll up', 'go up', 'up')) {
      setLastAction('Scrolling up');
      scrollPage(-420);
      return;
    }

    if (has('scroll to top', 'go to top', 'top of page')) {
      setLastAction('Scrolling to top');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (has('scroll to bottom', 'go to bottom', 'bottom of page')) {
      setLastAction('Scrolling to bottom');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    if (has('focus next', 'next control', 'next button')) {
      const elements = getFocusableElements();
      if (!elements.length) {
        setLastAction('No focusable controls found');
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const index = current ? elements.indexOf(current) : -1;
      const next = elements[(index + 1 + elements.length) % elements.length];
      next.focus();
      setLastAction('Focused next control');
      speak(next.getAttribute('aria-label') || next.textContent?.trim() || 'Focused next control');
      return;
    }

    if (has('focus previous', 'previous control', 'previous button')) {
      const elements = getFocusableElements();
      if (!elements.length) {
        setLastAction('No focusable controls found');
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const index = current ? elements.indexOf(current) : 0;
      const prev = elements[(index - 1 + elements.length) % elements.length];
      prev.focus();
      setLastAction('Focused previous control');
      speak(prev.getAttribute('aria-label') || prev.textContent?.trim() || 'Focused previous control');
      return;
    }

    if (has('click focused', 'activate focused', 'press focused', 'click this')) {
      const current = document.activeElement as HTMLElement | null;
      if (current && typeof current.click === 'function') {
        current.click();
        setLastAction('Activated focused control');
      } else {
        setLastAction('No focused control to activate');
        speak('No focused control found to activate.');
      }
      return;
    }

    if (has('help', 'what can i say', 'voice commands')) {
      setLastAction('Reading command help');
      speak('You can say open dashboard, open courses, open assignments, open quizzes, open messages, open resources, read page, scroll down, scroll up, scroll to top, scroll to bottom, increase font, decrease font, enable high contrast, disable high contrast, focus next, focus previous, or click focused.');
      return;
    }

    if (has('stop listening', 'disable voice', 'turn off voice assistant')) {
      setLastAction('Stopping voice assistant');
      stopListening();
      speak('Voice assistant stopped.');
      return;
    }

    if (has('start listening', 'enable voice', 'turn on voice assistant')) {
      setLastAction('Starting voice assistant');
      void startListening();
      return;
    }

    setLastAction('Command not recognized');
    speak('Command not recognized. Try saying open dashboard, open courses, or read page.');
  };

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is not supported in this browser.');
    }

    setMicStatus('requesting');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setMicStatus('ready');
  };

  const startListening = async () => {
    const RecognitionCtor = getRecognitionCtor();
    if (!RecognitionCtor) {
      setMicStatus('blocked');
      setLastAction('Browser does not support speech recognition');
      speak('Voice commands are not supported in this browser.');
      return;
    }

    if (recognitionRef.current && isListening) {
      return;
    }

    try {
      await requestMicrophonePermission();
      const recognition = new RecognitionCtor();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      shouldKeepListeningRef.current = true;
      noSpeechRetryRef.current = 0;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const latestResult = event.results[event.resultIndex];
        if (!latestResult || !latestResult.isFinal) {
          return;
        }

        const alternatives = Array.from(latestResult);
        const best = alternatives.reduce((currentBest, option) => {
          if (!currentBest) return option;
          return (option.confidence || 0) > (currentBest.confidence || 0) ? option : currentBest;
        }, alternatives[0]);

        const confidence = typeof best?.confidence === 'number' ? best.confidence : 1;
        const transcript = (best?.transcript || '').trim();
        if (!transcript) {
          return;
        }

        if (confidence >= 0 && confidence < 0.2) {
          setLastAction('Low confidence command, trying best match');
        }

        runCommand(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          noSpeechRetryRef.current += 1;
          setLastAction('Listening... say a command');
          if (shouldKeepListeningRef.current && recognitionRef.current && noSpeechRetryRef.current <= 10) {
            if (restartTimerRef.current !== null) {
              window.clearTimeout(restartTimerRef.current);
            }
            restartTimerRef.current = window.setTimeout(() => {
              try {
                recognitionRef.current?.stop();
                recognitionRef.current?.start();
                setIsListening(true);
              } catch {
                // Ignore transient restart errors.
              }
            }, 250);
          }
          setIsListening(true);
          return;
        }

        noSpeechRetryRef.current = 0;

        setLastAction(`Voice error: ${event.error}`);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicStatus('blocked');
          shouldKeepListeningRef.current = false;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (!shouldKeepListeningRef.current) {
          setIsListening(false);
          recognitionRef.current = null;
          return;
        }

        try {
          recognition.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
          recognitionRef.current = null;
          shouldKeepListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setLastAction('Voice assistant is listening');
      speak('Voice assistant is listening.');
    } catch {
      setMicStatus('blocked');
      stopListening();
      setLastAction('Microphone permission denied or unavailable');
      speak('Microphone permission is required for voice commands.');
    }
  };

  const handleAudioMode = async () => {
    const newState = !audioMode;
    setAudioMode(newState);
    if (newState) {
      setTtsEnabled(true);
      setLastAction('Narrative mode enabled');
      readPage();
      await startListening();
    } else {
      stopListening();
      stopSpeaking();
    }
  };
    const openLeft = position.x > PANEL_WIDTH / 2;

  if (user?.role !== 'student' && user?.role !== 'teacher') {
    return null;
  }

  return (
    <div
      className="fixed z-[60]"
      style={{ left: position.x, top: position.y, width: BUTTON_SIZE, height: BUTTON_SIZE, overflow: 'visible' }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`absolute w-72 bg-white rounded-3xl shadow-premium border border-emerald-50 overflow-hidden ${openLeft ? 'right-0' : 'left-0'} ${openAbove ? 'bottom-20' : 'top-20'}`}
          >
            {/* Header */}
            <div
              className="bg-emerald-500 p-4 flex justify-between items-center text-white cursor-move select-none"
              onPointerDown={startDrag}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 animate-spin-slow" />
                <span className="font-bold font-display tracking-tight text-sm uppercase">Accessibility Hub</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                onPointerDown={(event) => event.stopPropagation()}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 space-y-6">
              {/* Text to Speech */}
              <div className="group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Text-to-Speech</span>
                  <div className={`w-10 h-5 rounded-full p-1 transition-colors cursor-pointer ${ttsEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`} onClick={() => setTtsEnabled(!ttsEnabled)}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${ttsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
                <button 
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`flex items-center gap-3 w-full p-3 rounded-2xl border transition-all ${ttsEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="text-sm font-bold">{ttsEnabled ? 'TTS is Active' : 'Enable TTS'}</span>
                </button>
              </div>

              {/* Font Size */}
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Font Scaling</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'small', label: 'A-', size: 'text-xs' },
                    { id: 'medium', label: 'A', size: 'text-sm' },
                    { id: 'large', label: 'A+', size: 'text-lg' }
                  ].map((s) => (
                    <button 
                      key={s.id}
                      onClick={() => setFontSize(s.id as any)}
                      className={`h-12 rounded-xl font-black transition-all border ${fontSize === s.id ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span className={s.size}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast */}
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Visual Contrast</span>
                <button 
                  onClick={() => setTheme(theme === 'high-contrast' ? 'light' : 'high-contrast')}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all ${theme === 'high-contrast' ? 'bg-emerald-950 border-emerald-800 text-yellow-400' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {theme === 'high-contrast' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="text-sm font-bold">{theme === 'high-contrast' ? 'Standard Mode' : 'High Contrast'}</span>
                  </div>
                  {theme === 'high-contrast' && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Audio Mode */}
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Narrative Mode</span>
                <button 
                  onClick={() => void handleAudioMode()}
                  className={`flex items-center gap-3 w-full p-4 rounded-2xl border transition-all ${audioMode ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Headphones className="w-5 h-5" />
                  <div className="text-left">
                    <span className="text-sm font-bold block">{audioMode ? 'Reading Page...' : 'Listen to Page'}</span>
                    <span className="text-[10px] opacity-70 font-semibold uppercase">{audioMode ? 'Click to stop' : 'Auto-read enabled'}</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      void startListening();
                    }
                  }}
                  className={`mt-2 flex items-center gap-3 w-full p-3 rounded-2xl border transition-all ${isListening ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isListening ? 'Stop Listening' : micStatus === 'requesting' ? 'Requesting mic...' : 'Start Voice Assistant'}
                  </span>
                </button>
                {micStatus === 'blocked' && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
                    Microphone blocked. Allow permission in browser site settings.
                  </p>
                )}
                <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-black">Last Action</p>
                  <p className="text-xs font-bold text-gray-700 mt-1">{lastAction}</p>
                  {lastHeard ? (
                    <p className="text-[11px] text-gray-500 mt-1">Heard: "{lastHeard}"</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Designed for All Learners</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onPointerDown={startDrag}
        onClick={() => {
          if (draggingRef.current) {
            draggingRef.current = false;
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={`w-16 h-16 rounded-full shadow-premium flex items-center justify-center transition-all ${isOpen ? 'bg-white text-emerald-500 rotate-90 border border-emerald-50' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
      >
        {isOpen ? <X className="w-8 h-8" /> : (
          <div className="relative">
             <Settings className="w-8 h-8" />
             <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-emerald-900">!</span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
