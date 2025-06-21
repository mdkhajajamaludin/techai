import { FragmentSchema } from './schema'
import { ExecutionResult } from './types'
import { DeepPartial } from 'ai'

export type MessageText = {
  type: 'text'
  text: string
}

export type MessageCode = {
  type: 'code'
  text: string
}

export type MessageImage = {
  type: 'image'
  image: string
}

export type MessageGeneratedImage = {
  type: 'generated-image'
  url: string
}

export type MessagePDF = {
  type: 'pdf'
  fileName: string
  fileSize: string
  pageCount: number
  summary: string
  extractedText: string
}

export type Message = {
  role: 'assistant' | 'user'
  content: Array<MessageText | MessageCode | MessageImage | MessageGeneratedImage | MessagePDF>
  object?: DeepPartial<FragmentSchema>
  result?: ExecutionResult
  generatedImages?: string[]
}

export function toAISDKMessages(messages: Message[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.map((content) => {
      if (content.type === 'code') {
        return {
          type: 'text',
          text: content.text,
        }
      }

      // Convert generated-image type to text for AI SDK compatibility
      if (content.type === 'generated-image') {
        return {
          type: 'text',
          text: `[Generated image: ${content.url}]`,
        }
      }

      // Convert PDF type to text for AI SDK compatibility
      if (content.type === 'pdf') {
        return {
          type: 'text',
          text: `[PDF Document: ${content.fileName} - ${content.pageCount} pages]\n\n${content.extractedText}`,
        }
      }

      return content
    }),
  }))
}

export async function toMessageImage(files: File[]) {
  if (files.length === 0) {
    return []
  }

  return Promise.all(
    files.map(async (file) => {
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
      return `data:${file.type};base64,${base64}`
    }),
  )
}
