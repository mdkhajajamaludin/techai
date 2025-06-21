import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid build issues
let pdfParse: any = null;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('pdf-parse not available during build');
}

export async function GET() {
  return NextResponse.json({ 
    message: 'PDF extraction API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('PDF extraction API called');

  if (!pdfParse) {
    return NextResponse.json({ error: 'PDF parsing not available during build' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', file ? file.name : 'No file');
    
    if (!file) {
      console.log('Error: No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File type:', file.type, 'Size:', file.size);

    if (file.type !== 'application/pdf') {
      console.log('Error: File is not a PDF');
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const pdfData = await pdfParse(buffer);

    // Process the extracted data
    const result = {
      text: pdfData.text || '',
      pageCount: pdfData.numpages || 1,
      pages: [] as Array<{
        pageNumber: number;
        text: string;
        wordCount: number;
      }>,
      metadata: pdfData.metadata || null,
      fileName: file.name,
      fileSize: file.size
    };

    // Since pdf-parse doesn't provide page-by-page text, we'll estimate pages
    const textLength = result.text.length;
    const estimatedCharsPerPage = Math.max(1000, Math.floor(textLength / result.pageCount));
    
    // Split text into estimated pages
    for (let pageNum = 1; pageNum <= result.pageCount; pageNum++) {
      const startIndex = (pageNum - 1) * estimatedCharsPerPage;
      const endIndex = Math.min(pageNum * estimatedCharsPerPage, textLength);
      
      let pageText = '';
      if (startIndex < textLength) {
        pageText = result.text.substring(startIndex, endIndex).trim();
        
        // Try to break at sentence boundaries for better page splits
        if (pageNum < result.pageCount && endIndex < textLength) {
          const lastSentenceEnd = pageText.lastIndexOf('. ');
          if (lastSentenceEnd > estimatedCharsPerPage * 0.7) {
            pageText = pageText.substring(0, lastSentenceEnd + 1);
          }
        }
      }

      const wordCount = pageText.split(' ').filter(word => word.length > 0).length;

      result.pages.push({
        pageNumber: pageNum,
        text: pageText,
        wordCount: wordCount
      });
    }

    console.log(`Successfully extracted text from ${result.pageCount} pages`);
    console.log(`Total characters: ${textLength}, Total words: ${result.text.split(' ').length}`);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return NextResponse.json({
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
