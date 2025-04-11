import { AnalysisResults } from '@shared/schema';
import { apiRequest } from './queryClient';

// Generate a PDF report from swing analysis data by calling the server endpoint
export async function generateAnalysisPDF(analysis: AnalysisResults, playerName?: string): Promise<string> {
  try {
    // Call the server API to generate the PDF
    const response = await apiRequest<{ success: boolean, pdfUrl: string }>(
      'POST',
      '/api/generate-pdf',
      {
        analysis,
        playerName
      }
    );

    if (!response.success || !response.pdfUrl) {
      throw new Error('Failed to generate PDF');
    }

    // Return the URL to the generated PDF
    // Make sure to handle the URL properly
    const url = response.pdfUrl;
    // If the URL already starts with http, return it as is; otherwise, prepend the origin
    return url.startsWith('http') ? url : window.location.origin + url;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}