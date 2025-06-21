import React from 'react';
import { useTypingEffect } from './use-typing-effect';

// Typing cursor styles
const cursorStyles = {
  display: 'inline-block',
  width: '2px',
  height: '1.1em',
  backgroundColor: '#4f46e5', // Indigo color for the cursor
  marginLeft: '2px',
  verticalAlign: 'middle',
  opacity: 1,
  animation: 'blink 1s infinite',
  borderRadius: '1px',
};

// Style for typing animation container
const containerStyles = {
  position: 'relative' as 'relative',
};

interface TypingTextProps {
  content: string;
  className?: string;
  speed?: number;
  showCursor?: boolean;
}

export default function TypingText({
  content,
  className = '',
  speed = 10,
  showCursor = true
}: TypingTextProps) {
  const { displayText, isTyping } = useTypingEffect(content, speed);

  return (
    <div style={containerStyles} className={`${className} text-foreground/95 leading-relaxed`}>
      <span>{displayText}</span>
      {(isTyping || showCursor) && (
        <span 
          style={cursorStyles}
          className="typing-cursor"
        />
      )}
    </div>
  );
} 