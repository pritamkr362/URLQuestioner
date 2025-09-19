import * as fs from 'fs';

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid initialization issues
    const pdfParse = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(dataBuffer);
    
    if (!data.text || data.text.trim().length < 50) {
      throw new Error('Unable to extract meaningful text from the PDF');
    }
    
    // Clean up the extracted text
    const cleanedText = data.text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    return cleanedText;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during PDF processing');
  }
}

export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('Failed to cleanup temp file:', error);
  }
}