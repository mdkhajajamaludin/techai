"use client"

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { isFileInArray } from '@/lib/utils'
import { ArrowUp, Square, X, Camera, FileText, Image } from 'lucide-react'
import { SetStateAction, useEffect, useMemo, useState, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TextareaAutosize from 'react-textarea-autosize'

// Styles for hiding scrollbar across browsers
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Import the same modern font styles
const modernFontImport = `
  /* This will only be loaded once, even if included in multiple components */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap');
`;

export function ChatInput({
  retry,
  isErrored,
  isLoading,
  isRateLimited,
  stop,
  input,
  handleInputChange,
  handleSubmit,
  isMultiModal,
  files,
  handleFileChange,
  onImageExplain,
  onPDFUpload,
  selectedImage,
  isUploadingImage,
  fileInputRef,
  handleImageUpload,
  triggerFileInput,
  setSelectedImage,
  children,
}: {
  retry: () => void
  isErrored: boolean
  isLoading: boolean
  isRateLimited: boolean
  stop: () => void
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isMultiModal: boolean
  files: File[]
  handleFileChange: (change: SetStateAction<File[]>) => void
  onImageExplain?: (files: File[]) => void
  onPDFUpload?: (file: File) => void
  selectedImage?: string | null
  isUploadingImage?: boolean
  fileInputRef?: React.RefObject<HTMLInputElement>
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  triggerFileInput?: () => void
  setSelectedImage?: (image: string | null) => void
  children: React.ReactNode
}) {
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange((prev) => {
      const newFiles = Array.from(e.target.files || [])
      const uniqueFiles = newFiles.filter(
        (file) => !isFileInArray(file, prev),
      )
      return [...prev, ...uniqueFiles]
    })
  }

  function handleImageExplainInput(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length > 0 && onImageExplain) {
      onImageExplain(newFiles)
    }
  }



  function handleFileRemove(file: File) {
    handleFileChange((prev) => prev.filter((f) => f !== file))
  }

  function handlePDFInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && onPDFUpload) {
      onPDFUpload(file)
    }
    // Reset the input so the same file can be uploaded again
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          handleFileChange((prev) => {
            if (!isFileInArray(file, prev)) {
              return [...prev, file];
            }
            return prev;
          });
        }
      }
    }
  }

  const [dragActive, setDragActive] = useState(false);

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      handleFileChange(prev => {
        const uniqueFiles = droppedFiles.filter(file => !isFileInArray(file, prev));
        return [...prev, ...uniqueFiles];
      });
    }
  }

  const filePreview = useMemo(() => {
    if (files.length === 0) return null
    return Array.from(files).map((file) => {
      return (
        <div className="relative" key={file.name}>
          <span
            onClick={() => handleFileRemove(file)}
            className="absolute top-[-8] right-[-8] bg-muted rounded-full p-1"
          >
            <X className="h-3 w-3 cursor-pointer" />
          </span>
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="rounded-xl w-10 h-10 object-cover"
          />
        </div>
      )
    })
  }, [files])

  function onEnter(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (e.currentTarget.checkValidity()) {
        handleSubmit(e)
      } else {
        e.currentTarget.reportValidity()
      }
    }
  }

  useEffect(() => {
    if (!isMultiModal) {
      handleFileChange([])
    }
  }, [isMultiModal])

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={onEnter}
      className="mb-4 mt-auto flex flex-col bg-background"
      onDragEnter={isMultiModal ? handleDrag : undefined}
      onDragLeave={isMultiModal ? handleDrag : undefined}
      onDragOver={isMultiModal ? handleDrag : undefined}
      onDrop={isMultiModal ? handleDrop : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyle }} />
      <style dangerouslySetInnerHTML={{ __html: modernFontImport }} />
      
      {isErrored && (
        <div
          className={`flex items-center p-1.5 text-sm font-medium mx-4 mb-10 rounded-xl font-modern-ui ${
            isRateLimited
              ? 'bg-orange-400/10 text-orange-400'
              : 'bg-red-400/10 text-red-400'
          }`}
        >
          <span className="flex-1 px-1.5">
            {isRateLimited
              ? 'You have reached your request limit for the day.'
              : 'An unexpected error has occurred.'}
          </span>
          <button
            className={`px-2 py-1 rounded-sm ${
              isRateLimited ? 'bg-orange-400/20' : 'bg-red-400/20'
            }`}
            onClick={retry}
          >
            Try again
          </button>
        </div>
      )}
      <div className="relative">
        <div className="shadow-md rounded-3xl relative z-10 bg-background border">
          <input
            type="file"
            id="multimodal"
            name="multimodal"
            accept="image/*"
            multiple={true}
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            type="file"
            id="image-explain"
            name="image-explain"
            accept="image/*"
            multiple={true}
            className="hidden"
            onChange={handleImageExplainInput}
          />

          {/* Hidden file input for PDF upload */}
          <input
            type="file"
            id="pdf-upload"
            name="pdf-upload"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handlePDFInput}
          />

          {/* Hidden file input for image upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="flex items-center px-4 py-4 gap-2">
            {/* Single attachment dropdown */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={isErrored}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <img
                          src="https://i.postimg.cc/k4pydKfM/attach-document.png"
                          alt="Attach document"
                          className="h-5 w-5"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="font-modern-ui">Add attachments</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById('multimodal')?.click()
                  }}
                  disabled={!isMultiModal}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Image className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">Upload Image</div>
                    <div className="text-xs text-muted-foreground">JPG, PNG, GIF</div>
                  </div>
                </DropdownMenuItem>

                {/* PDF Upload Option */}
                {onPDFUpload && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('pdf-upload')?.click()
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">Upload PDF</div>
                      <div className="text-xs text-muted-foreground">Chat with PDF documents</div>
                    </div>
                  </DropdownMenuItem>
                )}

                {onImageExplain && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('image-explain')?.click()
                    }}
                    disabled={!isMultiModal || isLoading}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium">Smart Analysis</div>
                      <div className="text-xs text-muted-foreground">Math & questions</div>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <TextareaAutosize
              autoFocus={true}
              minRows={1}
              maxRows={1}
              className="text-normal resize-none ring-0 bg-inherit w-full sm:w-full md:w-full lg:w-full max-w-[85%] sm:max-w-none m-0 outline-none font-modern-ui"
              required={true}
              placeholder="What can I help with?"
              disabled={isErrored}
              value={input}
              onChange={handleInputChange}
              onPaste={isMultiModal ? handlePaste : undefined}
            />
            
            <div className="flex items-center">
              {!isLoading ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        disabled={isErrored}
                        variant="ghost"
                        size="icon"
                        type="submit"
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault()
                          stop()
                        }}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop generation</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="flex px-4 pb-3 gap-2 items-center">
              {filePreview}
            </div>
          )}

          {/* Selected image preview */}
          {selectedImage && (
            <div className="flex px-4 pb-3 gap-2 items-center">
              <div className="relative">
                <span
                  onClick={() => selectedImage && setSelectedImage && setSelectedImage(null)}
                  className="absolute top-[-8] right-[-8] bg-muted rounded-full p-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
                <img
                  src={selectedImage}
                  alt="Selected image"
                  className="rounded-xl w-10 h-10 object-cover"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between px-3 py-2 border-t overflow-x-auto scrollbar-hide">
            {children}
          </div>
        </div>
      </div>
    </form>
  )
}
