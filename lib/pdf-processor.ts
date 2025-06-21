// PDF processing utilities for chat functionality

export interface PDFProcessingResult {
  text: string;
  pageCount: number;
  metadata?: any;
  pages: Array<{
    pageNumber: number;
    text: string;
    wordCount: number;
  }>;
  fileName: string;
  fileSize: number;
}

/**
 * Check if a file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract text from a PDF file using server-side API
 */
export async function extractTextFromPDF(file: File): Promise<PDFProcessingResult> {
  console.log('Processing PDF:', file.name, 'Size:', formatFileSize(file.size));

  try {
    // Create FormData to send file to API
    const formData = new FormData();
    formData.append('file', file);

    console.log('Sending PDF to API for processing...');

    // Get the current origin to ensure we're using the right port
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const apiUrl = `${baseUrl}/api/pdf-extract`;

    console.log('API URL:', apiUrl);

    // Send to server-side API for processing
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = 'Failed to process PDF';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse the error response, use the status text
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    console.log(`Successfully extracted text from ${result.pageCount} pages`);
    console.log(`Total characters: ${result.text.length}, Total words: ${result.text.split(' ').length}`);
    
    return result;

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Fallback to demo content if PDF processing fails
    return getFallbackResult(file);
  }
}

/**
 * Fallback result when PDF processing fails
 */
function getFallbackResult(file: File): PDFProcessingResult {
  const fallbackText = `📄 **${file.name}** - Processing Issue

I encountered an issue while extracting text from this PDF document. This could be due to:

• **Scanned PDF**: The document may be image-based and requires OCR (Optical Character Recognition)
• **Protected PDF**: The document may have security restrictions preventing text extraction
• **Complex Layout**: The PDF may have a complex layout with tables, images, or special formatting
• **Corrupted File**: The file may be damaged or have encoding issues
• **Large File**: Very large PDFs may timeout during processing

**Troubleshooting Steps:**
1. **Try a different PDF**: Upload a text-based PDF document
2. **Check file size**: Ensure the PDF is under 10MB for optimal processing
3. **Verify format**: Make sure the file is a valid PDF document
4. **Test with simple PDF**: Try uploading a basic text document first

**File Information:**
• **Name**: ${file.name}
• **Size**: ${formatFileSize(file.size)}
• **Type**: ${file.type}

**What you can still do:**
Even though text extraction failed, you can still:
• Describe the document content to me manually
• Ask questions about PDF-related topics
• Try uploading a different PDF document
• Tell me what type of document this is and I can provide relevant information

I'm ready to help with any questions you have about documents or PDF processing!`;

  return {
    text: fallbackText,
    pageCount: 1,
    pages: [{
      pageNumber: 1,
      text: fallbackText,
      wordCount: fallbackText.split(' ').length
    }],
    metadata: {
      info: {
        Title: file.name.replace('.pdf', ''),
        Author: 'Unknown',
        CreationDate: new Date().toISOString()
      }
    },
    fileName: file.name,
    fileSize: file.size
  };
}

/**
 * Generate a summary of the PDF content
 */
export function generatePDFSummary(pdfResult: PDFProcessingResult): string {
  const totalWords = pdfResult.pages.reduce((sum, page) => sum + page.wordCount, 0);
  const avgWordsPerPage = pdfResult.pageCount > 0 ? Math.round(totalWords / pdfResult.pageCount) : 0;
  
  let summary = `📄 **PDF Document Analysis**\n\n`;
  summary += `• **Pages:** ${pdfResult.pageCount}\n`;
  summary += `• **Total Words:** ${totalWords.toLocaleString()}\n`;
  
  if (pdfResult.pageCount > 0) {
    summary += `• **Average Words per Page:** ${avgWordsPerPage}\n`;
  }
  
  // Add metadata if available
  if (pdfResult.metadata?.info) {
    const info = pdfResult.metadata.info;
    summary += `\n**Document Information:**\n`;
    if (info.Title && info.Title !== 'undefined') {
      summary += `• **Title:** ${info.Title}\n`;
    }
    if (info.Author && info.Author !== 'undefined') {
      summary += `• **Author:** ${info.Author}\n`;
    }
    if (info.Subject && info.Subject !== 'undefined') {
      summary += `• **Subject:** ${info.Subject}\n`;
    }
    if (info.Creator && info.Creator !== 'undefined') {
      summary += `• **Creator:** ${info.Creator}\n`;
    }
    if (info.CreationDate) {
      try {
        const date = new Date(info.CreationDate);
        if (!isNaN(date.getTime())) {
          summary += `• **Created:** ${date.toLocaleDateString()}\n`;
        }
      } catch (e) {
        // Ignore invalid dates
      }
    }
  }
  
  // Add content preview
  if (pdfResult.text && pdfResult.text.length > 0) {
    summary += `\n**Content Preview:**\n`;
    // Get first meaningful paragraph (skip very short lines)
    const lines = pdfResult.text.split('\n').filter(line => line.trim().length > 20);
    const preview = lines.slice(0, 3).join(' ').substring(0, 400);
    summary += `${preview}${pdfResult.text.length > 400 ? '...' : ''}\n`;
  }
  
  // Add extraction status
  const successfulPages = pdfResult.pages.filter(page => !page.text.includes('[Error extracting')).length;
  if (successfulPages < pdfResult.pageCount) {
    summary += `\n⚠️ **Note:** Successfully extracted text from ${successfulPages} of ${pdfResult.pageCount} pages.\n`;
  } else {
    summary += `\n✅ **Status:** Successfully extracted text from all ${pdfResult.pageCount} pages.\n`;
  }
  
  return summary;
}

/**
 * Chunk PDF text for processing large documents
 */
export function chunkPDFText(pdfResult: PDFProcessingResult, chunkSize: number = 2000) {
  const chunks = [];
  const text = pdfResult.text;
  
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    const startPage = Math.floor(i / (text.length / pdfResult.pageCount)) + 1;
    const endPage = Math.floor((i + chunkSize) / (text.length / pdfResult.pageCount)) + 1;
    
    chunks.push({
      text: chunk,
      pageNumbers: [Math.max(1, startPage), Math.min(pdfResult.pageCount, endPage)]
    });
  }
  
  return chunks;
}
