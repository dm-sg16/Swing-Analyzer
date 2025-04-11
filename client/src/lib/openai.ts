import { AnalysisOptions, AnalysisResults, SwingStats } from "@shared/schema";

// Function to generate AI analysis for a swing
export async function generateSwingAnalysis(
  videoUrl: string | null,
  imageUrls: string[] | null,
  stats: SwingStats | null,
  options: AnalysisOptions
): Promise<AnalysisResults> {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl,
        imageUrls,
        stats,
        options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to generate analysis");
    }

    const data = await response.json();
    return data.analysis;
  } catch (error: any) {
    console.error("Error generating analysis:", error);
    throw error;
  }
}
