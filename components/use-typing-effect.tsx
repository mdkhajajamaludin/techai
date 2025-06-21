import { useState, useEffect } from 'react';

// Hook for creating a typing animation effect on text
export function useTypingEffect(text: string, speed = 10) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setIndex(0);
    setIsTyping(true);
  }, [text]);

  useEffect(() => {
    if (!isTyping) return;
    
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text.charAt(index));
        setIndex(index + 1);
      }, speed);
      
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [index, text, speed, isTyping]);

  return {
    displayText,
    isTyping,
    completed: !isTyping,
  };
} 