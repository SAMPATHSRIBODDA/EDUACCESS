import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

type FontSize = 'small' | 'medium' | 'large';
type Theme = 'light' | 'dark' | 'high-contrast';

interface AccessibilityContextType {
  fontSize: FontSize;
  theme: Theme;
  ttsEnabled: boolean;
  audioMode: boolean;
  setFontSize: (size: FontSize) => void;
  setTheme: (theme: Theme) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setAudioMode: (enabled: boolean) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  repeatLastSpeech: () => void;
  readPage: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [theme, setTheme] = useState<Theme>('light');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');

  const speak = useCallback((text: string, force = false) => {
    if (!ttsEnabled && !force) return;
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.rate = 0.9;
    utterance.pitch = 1.1; 
    setLastSpokenText(normalizedText);
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const repeatLastSpeech = useCallback(() => {
    if (!lastSpokenText) return;
    const utterance = new SpeechSynthesisUtterance(lastSpokenText);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [lastSpokenText]);

  const readPage = useCallback(() => {
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'p', 'li', 'article', 'section', 'main', 
      '[role="main"]', '.course-card h3', 
      '.hero-content h1', '.hero-content p',
      '.announcement-title', '.event-name'
    ];
    const elements = document.querySelectorAll(selectors.join(','));
    const textToRead = Array.from(elements)
      .map(el => {
         if (
           el.closest('nav') || 
           el.closest('footer') || 
           el.closest('[aria-hidden="true"]') || 
           el.closest('#accessibility-panel-root')
         ) return '';
         
         const text = el.textContent?.trim() || '';
         // Filter out short fragments or nav items that slipped through
         if (text.length < 3) return '';
         return text;
      })
      .filter(text => text.length > 0)
      .join('. ');
    
    if (textToRead) {
      speak("Reading page: " + textToRead, true);
    } else {
      speak("No readable content found on this section.", true);
    }
  }, [speak]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(`font-size-${fontSize}`);

    if (theme === 'high-contrast') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [fontSize, theme]);

  const contextValue = useMemo(() => ({
    fontSize, theme, ttsEnabled, audioMode,
    setFontSize, setTheme, setTtsEnabled, setAudioMode,
    speak, stopSpeaking, repeatLastSpeech, readPage
  }), [
    fontSize,
    theme,
    ttsEnabled,
    audioMode,
    speak,
    stopSpeaking,
    repeatLastSpeech,
    readPage,
  ]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within an AccessibilityProvider');
  return context;
};
