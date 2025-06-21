import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, Content, Part, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Message } from './messages';

// Initialize the Gemini API client
let apiKey = '';
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;
let currentModelName = '';

export const initGeminiClient = (key: string) => {
  if (!key) return false;
  
  try {
    apiKey = key;
    geminiClient = new GoogleGenerativeAI(apiKey);
    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    return false;
  }
};

export const getGeminiModel = (modelName: string = 'models/gemini-2.0-flash-exp') => {
  if (!geminiClient) return null;
  
  try {
    currentModelName = modelName;
    geminiModel = geminiClient.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
        candidateCount: 1,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    
    return geminiModel;
  } catch (error) {
    console.error('Failed to get Gemini model:', error);
    return null;
  }
};

export const convertToGeminiMessages = (messages: Message[]): Content[] => {
  // Only include the most recent messages to avoid token limit issues
  const recentMessages = messages.slice(-5);
  
  return recentMessages.map(message => {
    const parts: Part[] = [];
    
    message.content.forEach(content => {
      if (content.type === 'text') {
        parts.push({ text: content.text });
      } else if (content.type === 'image' && content.image) {
        parts.push({
          inlineData: {
            data: content.image.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''),
            mimeType: content.image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
          }
        });
      } else if (content.type === 'code') {
        parts.push({ text: '```\n' + content.text + '\n```' });
      }
    });
    
    return {
      role: message.role === 'user' ? 'user' : 'model',
      parts
    };
  });
};

export const generateCompletion = async (
  messages: Message[],
  prompt: string,
  modelName: string = 'models/gemini-2.0-flash-exp',
  config?: Partial<GenerationConfig>
) => {
  if (!apiKey) {
    throw new Error('API key not set. Please set your API key first.');
  }

  if (!geminiClient) {
    initGeminiClient(apiKey);
  }

  let model = geminiModel;
  if (!model || currentModelName !== modelName) {
    model = getGeminiModel(modelName);
  }

  if (!model) {
    throw new Error('Failed to initialize Gemini model');
  }

  try {
    // Check if we have images in the latest message
    const lastMessage = messages[messages.length - 1];
    const hasImages = lastMessage?.content.some(content => content.type === 'image');

    if (hasImages) {
      // For image analysis, use the message content directly with the prompt
      const parts: Part[] = [];

      // Add the prompt as text
      parts.push({ text: prompt });

      // Add images from the last message
      lastMessage.content.forEach(content => {
        if (content.type === 'image' && content.image) {
          parts.push({
            inlineData: {
              data: content.image.replace(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/, ''),
              mimeType: content.image.match(/^data:image\/(png|jpg|jpeg|gif|webp)/)?.[0] || 'image/jpeg'
            }
          });
        }
      });

      const result = await model.generateContent(parts);
      return {
        text: result.response.text(),
        candidates: result.response.candidates,
      };
    } else {
      // For text-only, try simple prompt first
      const result = await model.generateContent(prompt);
      return {
        text: result.response.text(),
        candidates: result.response.candidates,
      };
    }
  } catch (error) {
    console.warn('Direct generation failed, falling back to chat mode', error);

    // Fallback to chat history mode
    const geminiMessages = convertToGeminiMessages(messages);
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1), // Exclude the last message to avoid duplication
      generationConfig: config,
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;

    return {
      text: response.text(),
      candidates: response.candidates,
    };
  }
};

export const setApiKey = (key: string) => {
  apiKey = key;
  return initGeminiClient(key);
};

// Specialized function for analyzing images with questions
export const analyzeImageForQuestions = async (
  imageBase64: string,
  modelName: string = 'models/gemini-2.0-flash-exp'
) => {
  if (!apiKey) {
    throw new Error('API key not set. Please set your API key first.');
  }

  if (!geminiClient) {
    initGeminiClient(apiKey);
  }

  let model = geminiModel;
  if (!model || currentModelName !== modelName) {
    model = getGeminiModel(modelName);
  }

  if (!model) {
    throw new Error('Failed to initialize Gemini model');
  }

  const parts: Part[] = [
    {
      text: `Analyze this image and determine what type of content it contains. Look carefully for:
- Mathematical equations, problems, or homework
- Academic questions from any subject
- Text-based questions or problems
- General images without questions

Respond with ONLY one word:
- MATH if it contains math problems/equations
- QUESTION if it contains non-math questions
- IMAGE if it's a general image without questions

Just respond with one word: MATH, QUESTION, or IMAGE`
    },
    {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/, ''),
        mimeType: imageBase64.match(/^data:image\/(png|jpg|jpeg|gif|webp)/)?.[0] || 'image/jpeg'
      }
    }
  ];

  try {
    const result = await model.generateContent(parts);
    return result.response.text().trim().toUpperCase();
  } catch (error) {
    console.error('Error analyzing image type:', error);
    return 'IMAGE'; // Default to general image analysis
  }
};