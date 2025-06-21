import { Message } from '@/lib/messages'
import { FragmentSchema } from '@/lib/schema'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { Download, Expand, LoaderIcon, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'

// Custom scrollbar styles
const modernScrollbarStyles = `
  /* For Webkit browsers (Chrome, Safari) */
  .modern-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .modern-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .modern-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
    transition: background-color 0.3s ease;
  }
  
  .modern-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(155, 155, 155, 0.8);
  }
  
  /* For Firefox */
  .modern-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  }
  
  /* Hide scrollbar when not active - Webkit */
  .hide-scrollbar-inactive::-webkit-scrollbar-thumb {
    background-color: transparent;
  }
  
  .hide-scrollbar-inactive:hover::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
  }
`;

// Basic message animation styles
const messageAnimationStyles = `
  /* No animations to prevent text shaking */
  .message-animation {
    /* No animation */
  }
  
  /* Cursor blink animation */
  @keyframes blink {
    0%, 100% { opacity: 0 }
    50% { opacity: 1 }
  }
  
  .typing-cursor {
    animation: blink 1s infinite;
  }
  
  /* Clean separation between messages */
  .message-divider {
    position: relative;
  }
  
  .message-divider::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 15%;
    right: 15%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.06), transparent);
  }
  
  .dark .message-divider::after {
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08), transparent);
  }
  
  /* Modern conversation UI elements */
  .assistant-message {
    position: relative;
    will-change: auto;
    transform: translateZ(0);
  }
  
  .assistant-message::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    border-radius: 4px;
    background: linear-gradient(to bottom, #3b82f6, #6366f1);
    opacity: 0.6;
  }
  
  .user-message {
    background: linear-gradient(120deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.12));
    border-left: none !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }
  
  .dark .user-message {
    background: linear-gradient(120deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.2));
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* Generated image styles */
  .generated-image-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    max-width: 300px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .generated-image-container:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }
  
  .image-controls {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 8px;
    gap: 8px;
  }
  
  .generated-image-container:hover .image-controls {
    opacity: 1;
  }
  
  .image-control-button {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #1f2937;
  }
  
  .image-control-button:hover {
    background: white;
    transform: scale(1.1);
  }
  
  .image-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .image-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .image-modal-close {
    position: absolute;
    top: -40px;
    right: -40px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: all 0.2s ease;
  }
  
  .image-modal-close:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

// Custom font import styles
const modernFontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  
  .font-modern-ui {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .font-modern-heading {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  
  .font-modern-body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    letter-spacing: -0.01em;
  }
  
  /* Improved typography */
  .prose h3 {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  
  .prose p {
    line-height: 1.65;
  }
  
  .prose ul {
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .prose li {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
`;

// Function to format AI response with modern fonts
const formatAIResponse = (text: string) => {
  // Replace section headings (double asterisks) with proper styling
  let formatted = text.replace(/\*\*(.*?)\*\*:/g, '<h3 class="font-modern-heading font-semibold text-lg mt-5 mb-3 text-foreground">$1</h3>');
  
  // Replace sub-headings with proper styling
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-modern-heading font-semibold text-base">$1</strong>');
  
  // Handle list items - replace * with proper list items
  formatted = formatted.replace(/^\s*\*\s*(.*?)$/gm, '<li class="ml-5 pl-1 mb-2 list-disc font-modern-body">$1</li>');
  
  // Find lists and wrap them in <ul> tags
  // Split the text by list items
  const parts = formatted.split(/<li class=".*?">/).map((part, i) => 
    i === 0 ? part : '<li class="ml-5 pl-1 mb-2 list-disc font-modern-body">' + part
  );
  
  formatted = parts[0];
  let inList = false;
  
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].includes('</li>') && !inList) {
      // Start a new list
      formatted += '<ul class="my-3 space-y-1">';
      inList = true;
    }
    
    formatted += parts[i];
    
    // If this part contains a list end and the next part doesn't start a new list item
    if (inList && parts[i].includes('</li>') && 
        (i === parts.length - 1 || !parts[i+1].includes('<li'))) {
      formatted += '</ul>';
      inList = false;
    }
  }
  
  // Handle paragraphs - add proper spacing between paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p class="my-3 font-modern-body text-foreground/90">');
  
  // Replace single newlines within paragraphs with <br> tags
  formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1<br>$2');
  
  // Wrap in a container div
  formatted = `<div class="text-foreground/95 font-modern-body leading-relaxed"><p class="my-2">${formatted}</p></div>`;
  
  return formatted;
};

// Component to animate text typing character by character
function TypingAnimation({ content }: { content: string }) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (currentIndex < content.length) {
      const typingTimeout = setTimeout(() => {
        setDisplayText(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 10); // Speed of typing
      
      return () => clearTimeout(typingTimeout);
    } else {
      // When done typing, blink the cursor
      const cursorTimeout = setTimeout(() => {
        setShowCursor(prev => !prev);
      }, 500);
      
      return () => clearTimeout(cursorTimeout);
    }
  }, [currentIndex, content]);

  return (
    <div className="message-animation">
      <span className="font-modern-body">{displayText}</span>
      {showCursor && <span className="cursor"></span>}
    </div>
  );
}

// Component for displaying generated images with controls
function GeneratedImage({ url }: { url: string }) {
  const [showModal, setShowModal] = useState(false);
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <>
      <div className="generated-image-container message-animation my-2">
        <img 
          src={url} 
          alt="AI generated image" 
          className="w-full h-auto object-cover rounded-lg"
          onClick={() => setShowModal(true)}
        />
        <div className="image-controls">
          <div className="image-control-button" onClick={handleDownload}>
            <Download size={16} />
          </div>
          <div className="image-control-button" onClick={() => setShowModal(true)}>
            <Expand size={16} />
          </div>
        </div>
      </div>
      
      {showModal && (
        <div className="image-modal" onClick={() => setShowModal(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={url} 
              alt="AI generated image (full size)" 
              className="max-w-full max-h-full object-contain"
            />
            <div className="image-modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Chat({
  messages,
  isLoading,
  isImageGenerating,
  isPDFProcessing,
  isDeepSearching,
  isLiveSearching,
  setCurrentPreview,
}: {
  messages: Message[]
  isLoading: boolean
  isImageGenerating?: boolean
  isPDFProcessing?: boolean
  isDeepSearching?: boolean
  isLiveSearching?: boolean
  setCurrentPreview: (preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) => void
}) {
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, [JSON.stringify(messages)])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: modernScrollbarStyles }} />
      <style dangerouslySetInnerHTML={{ __html: messageAnimationStyles }} />
      <style dangerouslySetInnerHTML={{ __html: modernFontStyles }} />
      <div
        id="chat-container"
        className="flex flex-col pb-12 gap-5 overflow-y-auto max-h-full modern-scrollbar hide-scrollbar-inactive px-2 sm:px-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message: Message, index: number) => (
          <div
            className={`flex flex-col ${
              message.role !== 'user'
                ? 'text-accent-foreground dark:text-muted-foreground py-4 gap-4 w-full font-modern-body message-divider pl-5 assistant-message'
                : 'py-3 px-4 rounded-lg gap-2 w-fit whitespace-pre-wrap font-modern-ui user-message'
            }`}
            key={index}
          >
            {message.content.map((content, id) => {
              if (content.type === 'text') {
                if (message.role === 'assistant') {
                  // For AI responses, we have two options:
                  
                  // 1. Rich HTML formatting (dangerouslySetInnerHTML)
                  if (content.text.includes('**') || content.text.includes('* ')) {
                    return (
                      <div
                        key={id}
                        className="prose prose-sm dark:prose-invert max-w-none leading-relaxed font-modern-body px-0.5"
                        dangerouslySetInnerHTML={{
                          __html: formatAIResponse(content.text)
                        }}
                      />
                    );
                  }
                  
                  // 2. Simple text without any animation for plain text
                  return (
                    <div key={id} className="prose prose-sm dark:prose-invert max-w-none leading-relaxed font-modern-body px-0.5">
                      <span className="font-modern-body">{content.text}</span>
                    </div>
                  );
                }
                
                // User messages - no animation
                return <div key={id} className="font-modern-ui text-sm md:text-base">{content.text}</div>;
              }
              
              if (content.type === 'image') {
                return (
                  <div key={id} className="my-2">
                    <img
                      src={content.image}
                      alt="Uploaded image"
                      className="max-w-sm max-h-64 object-contain rounded-lg shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => {
                        // Open image in new tab for full view
                        window.open(content.image, '_blank');
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1 font-modern-ui">
                      Click to view full size
                    </p>
                  </div>
                )
              }

              if (content.type === 'generated-image') {
                return (
                  <GeneratedImage key={id} url={content.url} />
                )
              }

              if (content.type === 'pdf') {
                return (
                  <div key={id} className="my-3 p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-lg">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 font-modern-heading">
                          📄 {content.fileName}
                        </h4>
                        <p className="text-sm text-green-600 dark:text-green-400 font-modern-ui">
                          {content.pageCount} pages • {content.fileSize}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 font-modern-body">
                      <div dangerouslySetInnerHTML={{ __html: content.summary.replace(/\n/g, '<br/>') }} />
                    </div>
                  </div>
                )
              }

              return null;
            })}
            {message.object && (
              <div
                onClick={() =>
                  setCurrentPreview({
                    fragment: message.object,
                    result: message.result,
                  })
                }
                className="py-2.5 pl-3 w-full md:w-max flex items-center border border-indigo-100 dark:border-indigo-900/30 rounded-lg select-none hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:cursor-pointer transition-colors duration-200 mt-2"
              >
                <div className="rounded-md w-10 h-10 bg-indigo-100 dark:bg-indigo-900/20 self-stretch flex items-center justify-center">
                  <Terminal strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="pl-3 pr-4 flex flex-col">
                  <span className="font-semibold font-modern-heading text-sm text-indigo-700 dark:text-indigo-300">
                    {message.object.title}
                  </span>
                  <span className="font-modern-ui text-xs text-slate-500 dark:text-slate-400">
                    Click to view fragment
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && !isImageGenerating && !isPDFProcessing && !isDeepSearching && !isLiveSearching && (
          <div className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 px-4 py-2.5 animate-pulse font-modern-ui">
            <LoaderIcon strokeWidth={2.5} className="animate-spin w-4 h-4" />
            <span className="tracking-wide">
              {messages.length > 0 && messages[messages.length - 1]?.content.some(c => c.type === 'image')
                ? 'Scanning image for questions...'
                : 'Generating...'}
            </span>
          </div>
        )}
        {isImageGenerating && (
          <div className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 px-4 py-2.5 animate-pulse font-modern-ui">
            <LoaderIcon strokeWidth={2.5} className="animate-spin w-4 h-4" />
            <span className="tracking-wide">Generating image...</span>
          </div>
        )}
        {isPDFProcessing && (
          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 px-4 py-2.5 animate-pulse font-modern-ui">
            <LoaderIcon strokeWidth={2.5} className="animate-spin w-4 h-4" />
            <span className="tracking-wide">Processing PDF document...</span>
          </div>
        )}
        {isDeepSearching && (
          <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 px-4 py-2.5 animate-pulse font-modern-ui">
            <LoaderIcon strokeWidth={2.5} className="animate-spin w-4 h-4" />
            <span className="tracking-wide">🔍 Searching the web for comprehensive information...</span>
          </div>
        )}
        {isLiveSearching && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 px-4 py-2.5 animate-pulse font-modern-ui">
            <LoaderIcon strokeWidth={2.5} className="animate-spin w-4 h-4" />
            <span className="tracking-wide">🔴 LIVE: Searching the internet for real-time information...</span>
          </div>
        )}
      </div>
    </>
  )
}
