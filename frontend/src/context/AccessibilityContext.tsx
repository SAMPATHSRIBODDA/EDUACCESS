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
    let textToRead = '';
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    
    if (mainContent) {
      const clone = mainContent.cloneNode(true) as HTMLElement;
      
      const toRemove = clone.querySelectorAll('nav, footer, [aria-hidden="true"], #accessibility-panel-root, script, style, noscript');
      toRemove.forEach(el => el.remove());
      
      textToRead = clone.innerText || clone.textContent || '';
    }

    const iframes = document.querySelectorAll('iframe');
    let iframeMessages = 0;
    iframes.forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          const iframeText = iframeDoc.body.innerText || iframeDoc.body.textContent || '';
          if (iframeText.trim()) {
            textToRead += ' . ' + iframeText;
          }
        } else {
          iframeMessages++;
        }
      } catch (e) {
        iframeMessages++;
      }
    });

    if (iframeMessages > 0) {
      textToRead += ` . Note: There ${iframeMessages > 1 ? 'are ' + iframeMessages + ' documents' : 'is a document'} or presentation visible on screen.`;
    }

    textToRead = textToRead.replace(/\s+/g, ' ').trim();
    
    if (textToRead) {
      speak("Reading page: " + textToRead.substring(0, 5000), true);
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
      root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('high-contrast');
    } else {
      root.classList.remove('high-contrast', 'dark');
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
