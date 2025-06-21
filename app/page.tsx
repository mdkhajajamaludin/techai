'use client'

import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { Preview } from '@/components/preview'
import { RepoBanner } from '@/components/repo-banner'
import { AuthViewType, useAuth } from '@/lib/auth'
import { Message, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { FragmentSchema, fragmentSchema as schema } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import templates, { TemplateId } from '@/lib/templates'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { experimental_useObject as useObject } from 'ai/react'
import { usePostHog } from 'posthog-js/react'
import { SetStateAction, useEffect, useState, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'
import { initGeminiClient, generateCompletion, setApiKey, analyzeImageForQuestions } from '@/lib/gemini-client'
import { generateImage, isImageGenerationPrompt, extractImagePrompt } from '@/lib/image-generation'

import { getRealtimeData, formatRealtimeDataForAI } from '@/lib/realtime-data'
import { extractTextFromPDF, generatePDFSummary, isPDFFile, formatFileSize } from '@/lib/pdf-processor'
import { isDeepSearchQuery, extractSearchQuery, performDeepSearch, formatSearchResultsForAI } from '@/lib/web-search'
import { isLiveSearchQuery, performLiveSearch, formatLiveSearchForAI } from '@/lib/live-search'
import OpenAI from 'openai'

export default function Home() {
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<'auto' | TemplateId>(
    'auto',
  )
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    {
      model: 'models/gemini-2.0-flash-exp',
    },
  )

  const posthog = usePostHog()

  const [result, setResult] = useState<ExecutionResult>()
  const [messages, setMessages] = useState<Message[]>([])
  const [fragment, setFragment] = useState<DeepPartial<FragmentSchema>>()
  const [currentTab, setCurrentTab] = useState<'code' | 'fragment'>('code')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isImageGenerating, setIsImageGenerating] = useState(false)
  const [isPDFProcessing, setIsPDFProcessing] = useState(false)
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const [isLiveSearching, setIsLiveSearching] = useState(false)

  // State for image handling
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for PDF chat context
  const [pdfContext, setPdfContext] = useState<{
    fileName: string
    content: string
    pageCount: number
    summary: string
  } | null>(null)



  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<AuthViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { session, apiKey } = useAuth(setAuthDialog, setAuthView)

  // A4F API for text AI
  const client = new OpenAI({
    baseURL: "https://api.a4f.co/v1",
    apiKey: "ddc-a4f-b1f27279dbae42939275111fc1923be5",
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  })

  // Gemini API for image analysis
  const GEMINI_API_KEY = "AIzaSyAt0-0v1A19m8QDHuzvtsPezk2K8eYPYtY"
  const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  )
  const currentTemplate =
    selectedTemplate === 'auto'
      ? templates
      : { [selectedTemplate]: templates[selectedTemplate] }
  const lastMessage = messages[messages.length - 1]

  useEffect(() => {
    if (languageModel.apiKey) {
      setApiKey(languageModel.apiKey)
    } else if (typeof window !== 'undefined') {
      // Try to initialize with API key from environment
      const envApiKey = 'AIzaSyAt0-0v1A19m8QDHuzvtsPezk2K8eYPYtY'
      if (envApiKey) {
        setApiKey(envApiKey)
        setLanguageModel(prev => ({ ...prev, apiKey: envApiKey }))
      }
    }
  }, [languageModel.apiKey])

  useEffect(() => {
    if (error) {
      stop()
    }
  }, [error])

  function setMessage(message: Partial<Message>, index?: number) {
    setMessages((previousMessages) => {
      const updatedMessages = [...previousMessages]
      updatedMessages[index ?? previousMessages.length - 1] = {
        ...previousMessages[index ?? previousMessages.length - 1],
        ...message,
      }

      return updatedMessages
    })
  }

  async function parseGeminiResponse(text: string) {
    // For a general chat app, we can simply return the text as commentary
    // with a minimal code structure to keep the UI working
    return {
      template: selectedTemplate !== 'auto' ? selectedTemplate : 'code-interpreter-v1',
      code: '', // No code for general chat responses
      commentary: text, // The AI's response is now just displayed as commentary
      title: 'Nam Tech', // Add a title for display in the chat UI
    };
  }

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (isLoading) {
      stop()
      return
    }

    // Set loading state
    setIsLoading(true)
    setError(null)

    const content: Message['content'] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)

    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }

    // Add selected image if present
    if (selectedImage) {
      content.push({ type: 'image', image: selectedImage })
    }

    const userMessage = {
      role: 'user' as const,
      content,
    }

    addMessage(userMessage)

    try {
      // Check if this is an image generation request
      if (isImageGenerationPrompt(chatInput)) {
        setIsImageGenerating(true)
        
        // Extract the actual image prompt
        const imagePrompt = extractImagePrompt(chatInput)
        
        try {
          // Call the image generation API
          const imageUrls = await generateImage(imagePrompt)
          
          if (imageUrls && imageUrls.length > 0) {
            // Create a response message with the generated images
            const assistantContent: Message['content'] = [
              { type: 'text', text: `Here's the image I generated based on your request:` },
              ...imageUrls.map(url => ({ type: 'generated-image', url } as const))
            ]
            
            const assistantMessage = {
              role: 'assistant' as const,
              content: assistantContent,
              generatedImages: imageUrls
            }
            
            addMessage(assistantMessage)
          } else {
            throw new Error('No images were generated')
          }
        } catch (imageError) {
          console.error('Image generation error:', imageError)
          
          // Add an error message
          const errorMessage = {
            role: 'assistant' as const,
            content: [{ 
              type: 'text' as const, 
              text: `I'm sorry, I couldn't generate that image. ${imageError instanceof Error ? imageError.message : 'Please try again with a different prompt.'}`
            }]
          }
          
          addMessage(errorMessage)
        } finally {
          setIsImageGenerating(false)
        }
      } else {
        // Check if message contains images
        const hasImages = selectedImage || images.length > 0

        if (hasImages) {
          // Handle image analysis with Gemini
          let imageAnalysis = ""

          // Use selectedImage or first uploaded image
          const imageToAnalyze = selectedImage || images[0]

          if (imageToAnalyze) {
            // Convert data URL to base64 string (remove data:image/jpeg;base64, prefix)
            const base64Image = imageToAnalyze.split(',')[1]

            // Prepare request for Gemini API
            const requestBody = {
              contents: [
                {
                  parts: [
                    {
                      text: `You are an image analysis assistant. Please analyze this image and provide a detailed description of what you see. Focus on any code, diagrams, or technical content visible in the image.`
                    },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: base64Image
                      }
                    }
                  ]
                }
              ],
              generation_config: {
                temperature: 0.4,
                top_p: 0.95,
                max_output_tokens: 1024
              }
            }

            try {
              // Call Gemini API for image analysis
              const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
              })

              const data = await response.json()

              // Extract image analysis from Gemini response
              if (data && data.candidates && data.candidates.length > 0 &&
                  data.candidates[0].content && data.candidates[0].content.parts &&
                  data.candidates[0].content.parts.length > 0) {
                imageAnalysis = data.candidates[0].content.parts[0].text ||
                              "Unable to analyze the image content."
              }
            } catch (error) {
              console.error('Gemini API error:', error)
              imageAnalysis = "Unable to analyze the image content."
            }
          }

          // Combine user text with image analysis for A4F API
          let combinedPrompt = chatInput + (imageAnalysis ? `\n\nImage Analysis: ${imageAnalysis}` : '')

          // System prompt for image analysis
       let imageSystemPrompt = "You are Tafheem, an Islamic AI assistant designed to answer questions with wisdom, clarity, and respect. You provide guidance based on authentic Islamic knowledge, respond with kindness, and always maintain Islamic values in conversation. Be informative, compassionate, and spiritually uplifting. Your purpose is to help users understand Islam, the Quran, and daily life matters in light of the deen. Respond with humility and sincerity.";


          // Use A4F API with Claude 3.7 Sonnet for text generation
          try {
            console.log('Making A4F API call for image analysis...')
            const completion = await client.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: imageSystemPrompt
                },
                {
                  role: "user",
                  content: combinedPrompt
                }
              ],
              model: "provider-6/claude-3-7-sonnet-20250219-thinking",
              temperature: 0.7,
              max_tokens: 1024,
            })

            console.log('A4F API response:', completion)
            console.log('Choices array:', completion.choices)
            console.log('First choice:', completion.choices?.[0])
            console.log('Message object:', completion.choices?.[0]?.message)
            console.log('Content:', completion.choices?.[0]?.message?.content)

            if (!completion || !completion.choices || completion.choices.length === 0) {
              throw new Error('Invalid API response structure')
            }

            // Try multiple ways to extract the response text
            let responseText = completion.choices[0]?.message?.content

            // Check for A4F API specific format with reasoning_content
            if (!responseText && completion.choices[0]?.message) {
              const message = completion.choices[0].message as any
              responseText = message.reasoning_content || message.text || message.response
            }

            // If still no content, try parsing the entire message as JSON
            if (!responseText && completion.choices[0]?.message) {
              try {
                const messageStr = JSON.stringify(completion.choices[0].message)
                const parsed = JSON.parse(messageStr)
                responseText = parsed.reasoning_content || parsed.content || parsed.text
              } catch (e) {
                console.log('Could not parse message as JSON')
              }
            }

            if (!responseText) {
              console.error('No content found in response. Full response:', JSON.stringify(completion, null, 2))
              // Use a fallback response instead of throwing an error
              const fallbackText = "I received your message but had trouble generating a response. Please try again."
              const content: Message['content'] = [
                { type: 'text', text: fallbackText },
              ]
              const assistantMessage = {
                role: 'assistant' as const,
                content,
              }
              addMessage(assistantMessage)
              return
            }

            const content: Message['content'] = [
              { type: 'text', text: responseText },
            ]

            const assistantMessage = {
              role: 'assistant' as const,
              content,
            }

            addMessage(assistantMessage)
          } catch (a4fError) {
            console.error('A4F API error:', a4fError)

            // Add error message to chat
            const errorMessage = {
              role: 'assistant' as const,
              content: [{
                type: 'text' as const,
                text: `I'm having trouble connecting to the AI service. Error: ${a4fError instanceof Error ? a4fError.message : 'Unknown error'}. Please try again.`
              }]
            }
            addMessage(errorMessage)
            return
          }
        } else {
          // Check if user is asking for real-time information, deep search, or live search
          const needsRealtimeData = isRealtimeRequest(chatInput)
          const needsDeepSearch = isDeepSearchQuery(chatInput)
          const needsLiveSearch = isLiveSearchQuery(chatInput)

          // System prompt for regular chat
          let systemPrompt = "You are a helpful AI assistant that can answer questions, provide information, and have engaging conversations. Be informative, helpful, and friendly in your responses. Your name is Nameera, and your husband's name is Afaan."
          let userPrompt = chatInput

          // If there's PDF context, prioritize PDF content in responses
          if (pdfContext) {
            systemPrompt += `\n\nIMPORTANT: The user has uploaded a PDF document titled "${pdfContext.fileName}" (${pdfContext.pageCount} pages). You should PRIORITIZE answering questions based on this PDF content. When the user asks questions, first check if they can be answered using the PDF content. Only provide general knowledge if the question is clearly unrelated to the PDF.

PDF CONTENT:
${pdfContext.content}

INSTRUCTIONS:
- Always check the PDF content first before giving general answers
- If the question relates to the PDF, answer based on the PDF content
- If you find relevant information in the PDF, cite it specifically
- If the PDF doesn't contain relevant information, mention that and then provide general knowledge
- Be specific about what section or page information comes from when possible`
          }

          if (needsRealtimeData) {
            // Fetch real-time data
            try {
              const realtimeData = await getRealtimeData()
              const formattedData = formatRealtimeDataForAI(realtimeData)

              systemPrompt += " You have access to real-time information. Use the provided real-time data to answer the user's question accurately."
              userPrompt = `${chatInput}\n\nReal-time data:\n${formattedData}`
            } catch (error) {
              console.error('Error fetching real-time data:', error)
            }
          } else if (needsDeepSearch) {
            // Perform deep web search
            setIsDeepSearching(true)
            try {
              const searchQuery = extractSearchQuery(chatInput)
              const searchResults = await performDeepSearch(searchQuery)
              const formattedSearchData = formatSearchResultsForAI(searchResults)

              systemPrompt += " You have access to web search results. Use the provided search information to give a comprehensive, well-researched answer. Always cite sources when possible and mention that the information comes from web search."
              userPrompt = `${chatInput}\n\n${formattedSearchData}`
            } catch (error) {
              console.error('Error performing deep search:', error)
              systemPrompt += " Note: Web search encountered an issue, provide the best answer you can with your existing knowledge."
            } finally {
              setIsDeepSearching(false)
            }
          } else if (needsLiveSearch) {
            // Perform live internet search
            setIsLiveSearching(true)
            try {
              const liveResults = await performLiveSearch(chatInput)
              const formattedLiveData = formatLiveSearchForAI(liveResults)

              systemPrompt += " You have access to live internet search results. Use the provided real-time information to give current, up-to-date answers. Always mention that this is live information from the internet and cite sources when possible."
              userPrompt = `${chatInput}\n\n${formattedLiveData}`
            } catch (error) {
              console.error('Error performing live search:', error)
              systemPrompt += " Note: Live internet search encountered an issue, provide the best answer you can with your existing knowledge."
            } finally {
              setIsLiveSearching(false)
            }
          }

          // Regular text-only chat message processing with A4F API
          try {
            console.log('Making A4F API call for text chat...')
            const completion = await client.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: userPrompt
                }
              ],
              model: "provider-6/claude-3-7-sonnet-20250219-thinking",
              temperature: 0.7,
              max_tokens: 1024,
            })

            console.log('A4F API response:', completion)
            console.log('Choices array:', completion.choices)
            console.log('First choice:', completion.choices?.[0])
            console.log('Message object:', completion.choices?.[0]?.message)
            console.log('Content:', completion.choices?.[0]?.message?.content)

            if (!completion || !completion.choices || completion.choices.length === 0) {
              throw new Error('Invalid API response structure')
            }

            // Try multiple ways to extract the response text
            let responseText = completion.choices[0]?.message?.content

            // Check for A4F API specific format with reasoning_content
            if (!responseText && completion.choices[0]?.message) {
              const message = completion.choices[0].message as any
              responseText = message.reasoning_content || message.text || message.response
            }

            // If still no content, try parsing the entire message as JSON
            if (!responseText && completion.choices[0]?.message) {
              try {
                const messageStr = JSON.stringify(completion.choices[0].message)
                const parsed = JSON.parse(messageStr)
                responseText = parsed.reasoning_content || parsed.content || parsed.text
              } catch (e) {
                console.log('Could not parse message as JSON')
              }
            }

            if (!responseText) {
              console.error('No content found in response. Full response:', JSON.stringify(completion, null, 2))
              // Use a fallback response instead of throwing an error
              const fallbackText = "I received your message but had trouble generating a response. Please try again."
              const content: Message['content'] = [
                { type: 'text', text: fallbackText },
              ]
              const assistantMessage = {
                role: 'assistant' as const,
                content,
              }
              addMessage(assistantMessage)
              return
            }

            const content: Message['content'] = [
              { type: 'text', text: responseText },
            ]

            const assistantMessage = {
              role: 'assistant' as const,
              content,
            }

            addMessage(assistantMessage)
          } catch (a4fError) {
            console.error('A4F API error:', a4fError)

            // Add error message to chat
            const errorMessage = {
              role: 'assistant' as const,
              content: [{
                type: 'text' as const,
                text: `I'm having trouble connecting to the AI service. Error: ${a4fError instanceof Error ? a4fError.message : 'Unknown error'}. Please try again.`
              }]
            }
            addMessage(errorMessage)
            return
          }
        }
      }

    } catch (err) {
      console.error('Error generating completion', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
      setChatInput('')
      setFiles([])
      setSelectedImage(null) // Clear selected image after sending
    }

    posthog.capture('chat_submit', {
      template: selectedTemplate,
      model: languageModel.model,
    })
  }

  function stop() {
    setIsLoading(false)
    setIsImageGenerating(false)
    setIsPDFProcessing(false)
    setIsDeepSearching(false)
    setIsLiveSearching(false)
  }

  function retry() {
    handleSubmitAuth({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)
  }

  function addMessage(message: Message) {
    setMessages((previousMessages) => [...previousMessages, message])
    return [...messages, message]
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
  }

  function handleFileChange(change: SetStateAction<File[]>) {
    setFiles(change)
  }

  // Function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageDataUrl = event.target?.result as string
      setSelectedImage(imageDataUrl)
      setIsUploadingImage(false)
    }
    reader.readAsDataURL(file) // Converts to base64 data URL
  }

  // Function to trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Function to check if user is asking for real-time information
  const isRealtimeRequest = (text: string): boolean => {
    const realtimeKeywords = [
      'current time', 'what time', 'time now', 'current date', 'today date',
      'latest news', 'recent news', 'news today', 'breaking news',
      'weather', 'temperature', 'weather today', 'current weather',
      'crypto', 'bitcoin', 'cryptocurrency', 'crypto prices', 'btc price',
      'stock market', 'stocks', 'market update',
      'real time', 'realtime', 'live update', 'current info', 'latest update'
    ]

    const lowerText = text.toLowerCase()
    return realtimeKeywords.some(keyword => lowerText.includes(keyword))
  }

  // Function to handle PDF upload and processing
  const handlePDFUpload = async (file: File) => {
    if (!isPDFFile(file) || isLoading || isPDFProcessing) return

    setIsPDFProcessing(true)
    setIsLoading(true)
    setError(null)

    try {
      // Extract text from PDF
      const pdfResult = await extractTextFromPDF(file)
      const summary = generatePDFSummary(pdfResult)

      // Create user message showing PDF upload
      const userMessage = {
        role: 'user' as const,
        content: [{
          type: 'text' as const,
          text: `📄 Uploaded PDF: ${file.name} (${pdfResult.pageCount} pages, ${formatFileSize(file.size)})`
        }]
      }
      addMessage(userMessage)

      // Set PDF context for chat
      setPdfContext({
        fileName: file.name,
        content: pdfResult.text,
        pageCount: pdfResult.pageCount,
        summary: summary
      })

      // Generate AI response about the PDF
      const analysisPrompt = `I've uploaded a PDF document titled "${file.name}". Please analyze this document and provide a comprehensive overview.

**Document Details:**
- File: ${file.name}
- Pages: ${pdfResult.pageCount}
- Size: ${formatFileSize(file.size)}

**Document Content:**
${pdfResult.text}

Please provide:
1. **Document Summary**: What is this document about?
2. **Key Topics**: Main themes and subjects covered
3. **Important Information**: Key facts, data, or insights
4. **Document Type**: What kind of document is this?
5. **Q&A Readiness**: Confirm you're ready to answer questions about this content

Be thorough but concise in your analysis.`

      console.log('Making A4F API call for PDF analysis...')
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant that specializes in document analysis. Analyze the provided PDF content thoroughly and provide comprehensive insights. Your name is Nameera."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        model: "provider-6/claude-3-7-sonnet-20250219-thinking",
        temperature: 0.3,
        max_tokens: 2048,
      })

      console.log('A4F API response for PDF:', completion)
      console.log('PDF Choices array:', completion.choices)
      console.log('PDF First choice:', completion.choices?.[0])
      console.log('PDF Message object:', completion.choices?.[0]?.message)
      console.log('PDF Content:', completion.choices?.[0]?.message?.content)

      if (!completion || !completion.choices || completion.choices.length === 0) {
        throw new Error('Invalid API response structure for PDF analysis')
      }

      // Try multiple ways to extract the response text for PDF
      let responseText = completion.choices[0]?.message?.content

      // Check for A4F API specific format with reasoning_content
      if (!responseText && completion.choices[0]?.message) {
        const message = completion.choices[0].message as any
        responseText = message.reasoning_content || message.text || message.response
      }

      // If still no content, try parsing the entire message as JSON
      if (!responseText && completion.choices[0]?.message) {
        try {
          const messageStr = JSON.stringify(completion.choices[0].message)
          const parsed = JSON.parse(messageStr)
          responseText = parsed.reasoning_content || parsed.content || parsed.text
        } catch (e) {
          console.log('Could not parse PDF message as JSON')
        }
      }

      if (!responseText) {
        console.error('No content found in PDF response. Full response:', JSON.stringify(completion, null, 2))
        responseText = "I've successfully processed your PDF and I'm ready to answer questions about it!"
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: [{
          type: 'text' as const,
          text: responseText
        }]
      }
      addMessage(assistantMessage)

    } catch (error) {
      console.error('Error processing PDF:', error)
      setError(error as Error)

      const errorMessage = {
        role: 'assistant' as const,
        content: [{
          type: 'text' as const,
          text: `I'm sorry, I couldn't process that PDF. ${error instanceof Error ? error.message : 'Please try uploading a different PDF or try again.'}`
        }]
      }
      addMessage(errorMessage)
    } finally {
      setIsPDFProcessing(false)
      setIsLoading(false)
    }
  }



  async function handleImageExplain(uploadedFiles: File[]) {
    if (uploadedFiles.length === 0 || isLoading) return

    // Set loading state
    setIsLoading(true)
    setError(null)

    try {
      // Convert files to base64 images
      const images = await toMessageImage(uploadedFiles)

      // Create user message with just the images (no text)
      const content: Message['content'] = images.map(image => ({ type: 'image', image }))

      const userMessage = {
        role: 'user' as const,
        content,
      }

      addMessage(userMessage)

      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 1000))

      // First, analyze the image to determine if it contains a question
      let imageType = 'IMAGE'

      try {
        imageType = await analyzeImageForQuestions(images[0], languageModel.model as string)
      } catch (error) {
        console.log('Using demo mode for image analysis')
        // Demo mode: simulate detection based on common patterns
        // In a real scenario, this would be the actual AI analysis
        imageType = 'MATH' // Default to math for demo purposes
      }

      let finalPrompt = ''

      if (imageType === 'MATH') {
        finalPrompt = `This image contains a math question or problem. Please:

🔢 **SOLVE THE MATH PROBLEM STEP BY STEP:**

1. **Read the problem carefully** - Identify what is being asked
2. **Show your work** - Write out each calculation step
3. **Provide the final answer** - Clearly state the solution
4. **Check your work** - Verify the answer makes sense

If there are multiple problems, solve each one separately and clearly label your answers.

**Focus on accuracy and clear mathematical reasoning. Be direct and concise.**`
      } else if (imageType === 'QUESTION') {
        finalPrompt = `This image contains a question that needs to be answered. Please:

📝 **ANSWER THE QUESTION DIRECTLY:**

1. **Read the question carefully** - Understand what is being asked
2. **Provide accurate answers** - Give direct, correct responses
3. **Multiple choice** - If it's multiple choice, state the correct option clearly
4. **Multiple questions** - Answer all questions if there are several
5. **Be concise** - Focus on answering, not explaining the image

**Provide helpful, accurate answers to the questions shown.**`
      } else {
        finalPrompt = `Please analyze this image in detail and provide a comprehensive explanation. Include:

1. **Overall Description**: What is the main subject or scene in the image?
2. **Visual Elements**: Describe colors, lighting, composition, and style
3. **Objects and Details**: List and describe all visible objects, people, or elements
4. **Setting and Context**: Where does this appear to be taken? What's the environment?
5. **Mood and Atmosphere**: What feeling or mood does the image convey?
6. **Technical Aspects**: Note any interesting photographic or artistic techniques
7. **Additional Observations**: Any other noteworthy details or interesting aspects

Please be thorough and engaging in your analysis, as if you're helping someone who cannot see the image understand it completely.`
      }

      // Use the appropriate prompt based on image content
      let response

      try {
        response = await generateCompletion(
          [...messages, userMessage],
          finalPrompt,
          languageModel.model as string,
          {
            temperature: (imageType === 'MATH' || imageType === 'QUESTION') ? 0.2 : 0.7, // Lower temperature for questions for more accurate answers
            topK: (imageType === 'MATH' || imageType === 'QUESTION') ? 5 : 32,
            topP: (imageType === 'MATH' || imageType === 'QUESTION') ? 0.7 : 0.95,
            maxOutputTokens: 8192,
          }
        )
      } catch (apiError) {
        // Demo response when API limits are hit
        if (imageType === 'MATH') {
          response = {
            text: `🔢 **MATH PROBLEM DETECTED**

I can see this image contains a mathematical problem. Here's how I would solve it:

**Step 1:** Identify the problem type
- I can detect equations, word problems, geometry, algebra, calculus, etc.

**Step 2:** Apply the appropriate method
- For equations: Solve step by step
- For word problems: Extract key information and set up equations
- For geometry: Use relevant formulas and theorems

**Step 3:** Show the work
- Clear calculations with each step explained
- Proper mathematical notation

**Step 4:** Provide the final answer
- Clearly highlighted solution
- Units included where applicable

**Example Output:**
"The answer is **x = 5** or **Area = 25 cm²**"

*Note: Upload your math image and I'll solve the actual problem for you!*`,
            candidates: []
          }
        } else if (imageType === 'QUESTION') {
          response = {
            text: `📝 **QUESTION DETECTED**

I can see this image contains questions that need answers. Here's how I handle different types:

**Multiple Choice Questions:**
- I'll identify the correct option (A, B, C, D)
- Provide clear reasoning for the choice

**Short Answer Questions:**
- Direct, accurate responses
- Concise explanations when needed

**Essay Questions:**
- Structured, comprehensive answers
- Key points clearly organized

**Science/History/Language Questions:**
- Subject-specific expertise
- Accurate, educational responses

*Note: Upload your question image and I'll provide the actual answers!*`,
            candidates: []
          }
        } else {
          response = {
            text: `🖼️ **IMAGE ANALYSIS**

I can see you've uploaded an image. Here's what I can do:

**For Math Problems:** 📊
- Solve equations step by step
- Show all work clearly
- Provide final answers

**For Questions:** ❓
- Answer multiple choice questions
- Provide solutions to problems
- Give detailed explanations

**For General Images:** 🎨
- Describe what I see in detail
- Analyze visual elements
- Provide comprehensive explanations

*Upload any image and I'll automatically detect what type of content it contains and respond appropriately!*`,
            candidates: []
          }
        }
      }

      // Parse response
      const parsedObject = await parseGeminiResponse(response.text)

      const assistantContent: Message['content'] = [
        { type: 'text', text: parsedObject.commentary || '' },
      ]

      const assistantMessage = {
        role: 'assistant' as const,
        content: assistantContent,
      }

      addMessage(assistantMessage)

    } catch (err) {
      console.error('Error explaining image', err)
      setError(err as Error)

      // Provide specific error messages based on error type
      let errorText = "I'm sorry, I couldn't analyze that image. Please try again."

      if (err instanceof Error) {
        if (err.message.includes('429') || err.message.includes('quota')) {
          errorText = "I've reached my API quota limit for image analysis. Please try again in a few minutes, or consider using a different model."
        } else if (err.message.includes('API key')) {
          errorText = "There's an issue with the API configuration. Please check your API key settings."
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorText = "There was a network error. Please check your internet connection and try again."
        }
      }

      // Add an error message
      const errorMessage = {
        role: 'assistant' as const,
        content: [{
          type: 'text' as const,
          text: errorText
        }]
      }

      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }

    posthog.capture('image_explain', {
      model: languageModel.model,
      image_count: uploadedFiles.length,
    })
  }



  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({ ...languageModel, ...e })
  }

  function handleSocialClick(target: 'github' | 'x' | 'discord') {
    if (target === 'github') {
      window.open('https://github.com/namtech-ai', '_blank')
    } else if (target === 'x') {
      window.open('https://x.com/namtech_ai', '_blank')
    } else if (target === 'discord') {
      window.open('https://discord.gg/namtech', '_blank')
    }

    posthog.capture(`${target}_click`)
  }

  function handleClearChat() {
    stop()
    setChatInput('')
    setFiles([])
    setMessages([])
    setFragment(undefined)
    setResult(undefined)
    setCurrentTab('code')
    setIsPreviewLoading(false)
    setSelectedImage(null) // Clear selected image
    setPdfContext(null) // Clear PDF context
  }

  function setCurrentPreview(preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) {
    setFragment(preview.fragment)
    setResult(preview.result)
  }

  function handleUndo() {
    setMessages((previousMessages) => [...previousMessages.slice(0, -2)])
    setCurrentPreview({ fragment: undefined, result: undefined })
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      <div className="grid w-full md:grid-cols-2">
        <div
          className={`flex flex-col w-full max-h-full max-w-[900px] mx-auto px-2 sm:px-4 overflow-hidden ${fragment ? 'col-span-1' : 'col-span-2'}`}
        >
          <NavBar
            session={session}
            showLogin={() => {}}
            signOut={() => {}}
            onSocialClick={handleSocialClick}
            onClear={handleClearChat}
            canClear={messages.length > 0}
            canUndo={messages.length > 1 && !isLoading}
            onUndo={handleUndo}
          />
          <div className="flex-1 overflow-hidden h-full flex flex-col">
            {/* PDF Context Indicator */}
            {pdfContext && (
              <div className="mx-4 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    📄 PDF Chat Mode: {pdfContext.fileName}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ({pdfContext.pageCount} pages)
                  </span>
                  <button
                    onClick={() => setPdfContext(null)}
                    className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-xs underline"
                  >
                    Exit PDF Mode
                  </button>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  AI will prioritize answers from this PDF document
                </div>
              </div>
            )}

            <Chat
              messages={messages}
              isLoading={isLoading}
              isImageGenerating={isImageGenerating}
              isPDFProcessing={isPDFProcessing}
              isDeepSearching={isDeepSearching}
              isLiveSearching={isLiveSearching}
              setCurrentPreview={setCurrentPreview}
            />
          </div>
          <ChatInput
            retry={retry}
            isErrored={error !== null}
            isLoading={isLoading || isImageGenerating || isPDFProcessing || isDeepSearching || isLiveSearching}
            isRateLimited={isRateLimited}
            stop={stop}
            input={chatInput}
            handleInputChange={handleSaveInputChange}
            handleSubmit={handleSubmitAuth}
            isMultiModal={currentModel?.multiModal || false}
            files={files}
            handleFileChange={handleFileChange}
            onImageExplain={handleImageExplain}
            onPDFUpload={handlePDFUpload}

            selectedImage={selectedImage}
            isUploadingImage={isUploadingImage}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            triggerFileInput={triggerFileInput}
            setSelectedImage={setSelectedImage}

          >
            <ChatPicker
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectedTemplateChange={setSelectedTemplate}
              models={filteredModels}
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
            />
          </ChatInput>
        </div>
        <Preview
          apiKey={apiKey}
          selectedTab={currentTab}
          onSelectedTabChange={setCurrentTab}
          isChatLoading={isLoading}
          isPreviewLoading={isPreviewLoading}
          fragment={fragment}
          result={result as ExecutionResult}
          onClose={() => setFragment(undefined)}
        />
      </div>
    </main>
  )
}
