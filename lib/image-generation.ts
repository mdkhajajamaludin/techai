import { Message } from './messages';

const API_KEY = "ddc-a4f-b1f27279dbae42939275111fc1923be5";
const MODEL = "provider-1/FLUX.1-kontext-pro";
const BASE_URL = "https://api.a4f.co/v1";

export interface GenerateImageRequest {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  response_format?: string;
}

export interface GenerateImageResponse {
  created: number;
  data: {
    url: string;
  }[];
}

/**
 * Generates an image based on the provided prompt
 */
export async function generateImage(prompt: string): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      } as GenerateImageRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Image generation failed: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as GenerateImageResponse;
    return data.data.map(item => item.url);
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Detects if the user message is requesting image generation
 */
export function isImageGenerationPrompt(message: string): boolean {
  const imageKeywords = [
    'generate image',
    'create image',
    'draw',
    'sketch',
    'paint',
    'show me',
    'visualize',
    'picture of',
    'image of',
    'make an image',
    'create a picture',
    'generate a photo',
    'create a visual',
    'illustrate'
  ];
  
  const lowerCaseMessage = message.toLowerCase();
  return imageKeywords.some(keyword => lowerCaseMessage.includes(keyword));
}

/**
 * Extracts the actual image prompt from the user message
 */
export function extractImagePrompt(message: string): string {
  // Remove common prefixes
  let cleanPrompt = message.replace(/^(generate|create|draw|sketch|paint|show me|visualize|make|can you)(\s+an?|\s+a)?\s+(image|picture|drawing|sketch|visualization|illustration|photo|painting)(\s+of)?/i, '').trim();
  
  // If the message starts with "image of" or "picture of", remove it
  cleanPrompt = cleanPrompt.replace(/^(image|picture)(\s+of)?/i, '').trim();
  
  // If nothing is left, return the original message
  return cleanPrompt || message;
} 