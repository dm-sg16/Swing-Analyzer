import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import { AnalysisOptions, AnalysisResults, SwingStats } from '@shared/schema';
import path from 'path';
import { getKnowledgeBase } from './knowledge/baseball-swing';

// Initialize Gemini with the API key
const apiKey = process.env.GEMINI_API_KEY;

// Function to validate whether we have a valid API key
export function isGeminiAvailable(): boolean {
  return !!apiKey;
}

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(apiKey || '');

// Function to convert file to base64
function fileToBase64(filePath: string): string {
  const fileData = fs.readFileSync(filePath);
  return fileData.toString('base64');
}

// Function to extract key frames for analysis
async function extractKeyFrames(videoPath: string, numberOfFrames = 5): Promise<string[]> {
  // In a real implementation, this would use FFmpeg or similar
  // For now, we'll simulate by just returning the video path (as we don't have frame extraction)
  console.log(`Would extract ${numberOfFrames} frames from ${videoPath}`);
  return [videoPath];
}

// Function to analyze a single image with Gemini
export async function analyzeImageWithGemini(imagePath: string, prompt: string, isSimpleMode: boolean = false): Promise<string> {
  if (!apiKey) {
    console.error('Gemini API key not found. Please set the GEMINI_API_KEY environment variable.');
    throw new Error('Gemini API key not configured');
  }

  try {
    console.log('Setting up Gemini model for image analysis...');
    
    // Set up the vision model
    const visionModel = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });
    
    // Read the image file and convert to base64
    const imageData = fs.readFileSync(imagePath);
    const mimeType = "image/jpeg";
    
    console.log('Preparing image data for Gemini API...');
    
    // Get the baseball swing knowledge base
    const knowledgeBase = getKnowledgeBase();
    
    // Enhance the prompt with our baseball knowledge base, adapting to the audience (simple vs advanced)
    let enhancedPrompt = '';
    
    if (isSimpleMode) {
      enhancedPrompt = `You are a youth baseball coach who specializes in explaining swing mechanics to parents with no baseball experience. 
Your goal is to analyze this image using simple, everyday language without technical jargon.
Focus on providing clear, actionable advice that a parent can understand and help their child practice.
Use friendly, encouraging language and avoid technical terms when possible. ${prompt}\n\n`;
    } else {
      enhancedPrompt = `You are a professional baseball coach and swing analysis expert with deep technical knowledge.
Analyze this image using proper baseball terminology and biomechanics concepts.
Your analysis should be technical and detailed, suitable for an experienced coach who understands
advanced swing mechanics and baseball-specific terminology. ${prompt}\n\n`;
    }
    
    enhancedPrompt += `Use the following baseball knowledge base to inform your analysis:\n\n
${knowledgeBase.baseballSwingGuide}\n\n
${knowledgeBase.swingPhaseDefinitions}`;
    
    // Generate content with image and text prompt
    const result = await visionModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: enhancedPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageData.toString('base64')
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });
    
    const response = result.response;
    const text = response.text();
    console.log('Received image analysis from Gemini API');
    
    return text;
  } catch (err: any) {
    console.error('Error analyzing image with Gemini:', err);
    throw new Error(`Gemini image analysis failed: ${err.message}`);
  }
}

// Main function to analyze a swing using Gemini
export async function analyzeSwing(
  videoUrl: string | null,
  imageUrls: string[] | null,
  stats: SwingStats,
  options: AnalysisOptions
): Promise<AnalysisResults> {
  console.log('Analyzing swing with Gemini AI...');
  console.log(`Analysis parameters: videoUrl=${videoUrl}, imageCount=${imageUrls?.length || 0}, hasStats=${!!stats}, options=${JSON.stringify(options)}`);
  
  if (!apiKey) {
    console.error('Gemini API key not found. Please set the GEMINI_API_KEY environment variable.');
    throw new Error('Gemini API key not configured');
  }

  try {
    // For now, let's simplify by doing a text-only analysis to troubleshoot the Gemini API integration
    console.log('Using text-only analysis as a fallback');
    
    // Get the baseball swing knowledge base
    const knowledgeBase = getKnowledgeBase();
    
    // Create a prompt based on the analysis options, stats, knowledge base, and the intended audience
    // Check if this is for the simple mode (parents/tutors) or advanced mode (coaches)
    const isSimpleMode = options && (options as any).simpleMode;
    
    let prompt = '';
    if (isSimpleMode) {
      prompt = 'You are a youth baseball coach who specializes in explaining swing mechanics to parents with no baseball experience. ' +
               'Your goal is to analyze this baseball swing using simple, everyday language without technical jargon. ' +
               'Focus on providing clear, actionable advice that a parent can understand and help their child practice. ' +
               'Use friendly, encouraging language and avoid technical terms when possible.';
    } else {
      prompt = 'You are a professional baseball coach and swing analysis expert with deep technical knowledge. ' +
               'Analyze this baseball swing using proper baseball terminology and biomechanics concepts. ' +
               'Your analysis should be technical and detailed, suitable for an experienced coach who understands ' +
               'advanced swing mechanics and baseball-specific terminology.';
    }
    
    prompt += ' Base your analysis on the following information and provide detailed feedback.';
    
    // Add the knowledge base to the prompt
    prompt += '\n\nUse the following baseball knowledge base to inform your analysis:\n\n';
    prompt += knowledgeBase.baseballSwingGuide;
    prompt += '\n\n';
    prompt += knowledgeBase.swingPhaseDefinitions;
    prompt += '\n\n';
    prompt += knowledgeBase.playerEvaluationCriteria;
    
    // Add specific instructions for including drills based on the knowledge base
    prompt += '\n\nIMPORTANT INSTRUCTION: You MUST include at least 5 specific, detailed practice drills in your analysis. ' +
              'Each drill should directly address one of the improvement areas you identify. ' +
              'The drills should be age-appropriate, easily performed with minimal equipment, ' +
              'and include clear step-by-step instructions. Add a specific goal for each drill.';
    
    if (options.analyzeTechnique) {
      prompt += 'Focus on overall technique and swing execution. ';
    }
    
    if (options.analyzeMechanics) {
      prompt += 'Evaluate swing mechanics including balance, posture, and path. ';
    }
    
    if (options.analyzeRecommendations) {
      prompt += 'Provide specific recommendations for improvement. ';
    }
    
    // The comparison option was removed from the schema, so we'll add it only if it exists
    if (options && (options as any).analyzeComparison) {
      prompt += 'This is part of a comparison analysis, so focus on distinct characteristics that can be compared with another swing. ';
    }
    
    // Add media information to the prompt
    if (videoUrl) {
      prompt += '\nA video of the swing was provided showing a full motion swing from setup to follow-through. ';
    }
    
    if (imageUrls && imageUrls.length > 0) {
      prompt += `\n${imageUrls.length} image(s) of the swing from different angles were provided. `;
    }
    
    // Add stats information to the prompt if available
    if (stats) {
      prompt += `\n\nPlayer statistics:\n`;
      prompt += `- Bat Speed: ${stats.batSpeed || 'N/A'} mph\n`;
      prompt += `- Exit Velocity: ${stats.exitVelocity || 'N/A'} mph\n`;
      prompt += `- Launch Angle: ${stats.launchAngle || 'N/A'} degrees\n`;
      prompt += `- Attack Angle: ${stats.attackAngle || 'N/A'} degrees\n`;
      prompt += `- Time to Contact: ${stats.timeToContact || 'N/A'} seconds\n`;
      
      if (stats.pitchType) {
        prompt += `- Pitch Type: ${stats.pitchType}\n`;
      }
      
      if (stats.additionalContext) {
        prompt += `- Additional Context: ${stats.additionalContext}\n`;
      }
    }
    
    prompt += '\n\nProvide the analysis in the following JSON format:\n';
    prompt += '```json\n';
    prompt += '{\n';
    prompt += '  "score": 8,\n';
    prompt += '  "strengths": ["Strength 1", "Strength 2", ...],\n';
    prompt += '  "improvements": ["Improvement 1", "Improvement 2", ...],\n';
    prompt += '  "keyFrames": [\n';
    prompt += '    {\n';
    prompt += '      "time": 0.8,\n';
    prompt += '      "description": "Description of this moment",\n';
    prompt += '      "annotations": [\n';
    prompt += '        {"type": "line", "points": [25, 30, 45, 60], "color": "#FF0000"},\n';
    prompt += '        {"type": "angle", "points": [30, 40, 50, 60, 70, 80], "color": "#00FF00"},\n';
    prompt += '        {"type": "circle", "points": [50, 50, 20], "color": "#0000FF"},\n';
    prompt += '        {"type": "arrow", "points": [40, 40, 60, 60], "color": "#FFFF00"},\n';
    prompt += '        {"type": "text", "points": [50, 20], "text": "Text annotation", "color": "#FF00FF"}\n';
    prompt += '      ]\n';
    prompt += '    }\n';
    prompt += '  ],\n';
    prompt += '  "recommendedDrills": [\n';
    prompt += '    {\n';
    prompt += '      "title": "Drill 1: [Descriptive title related to improving specific issue]",\n';
    prompt += '      "description": "Detailed instructions for the drill with clear steps, equipment needed, and specific goals. Explain how this drill addresses issues identified in the analysis. Include tips for proper form and progression options."\n';
    prompt += '    },\n';
    prompt += '    {\n';
    prompt += '      "title": "Drill 2: [Descriptive title related to improving specific issue]",\n';
    prompt += '      "description": "Detailed instructions for the drill with clear steps, equipment needed, and specific goals. Explain how this drill addresses issues identified in the analysis. Include tips for proper form and progression options."\n';
    prompt += '    },\n';
    prompt += '    {\n';
    prompt += '      "title": "Drill 3: [Descriptive title related to improving specific issue]",\n';
    prompt += '      "description": "Detailed instructions for the drill with clear steps, equipment needed, and specific goals. Explain how this drill addresses issues identified in the analysis. Include tips for proper form and progression options."\n';
    prompt += '    },\n';
    prompt += '    {\n';
    prompt += '      "title": "Drill 4: [Descriptive title related to improving specific issue]",\n';
    prompt += '      "description": "Detailed instructions for the drill with clear steps, equipment needed, and specific goals. Explain how this drill addresses issues identified in the analysis. Include tips for proper form and progression options."\n';
    prompt += '    },\n';
    prompt += '    {\n';
    prompt += '      "title": "Drill 5: [Descriptive title related to improving specific issue]",\n';
    prompt += '      "description": "Detailed instructions for the drill with clear steps, equipment needed, and specific goals. Explain how this drill addresses issues identified in the analysis. Include tips for proper form and progression options."\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}\n';
    prompt += '```\n';
    
    console.log('Sending analysis request to Gemini API...');
    console.log('Using text-only model for analysis');
    
    // Use a text-only model to troubleshoot
    const textModel = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });
    
    console.log('Preparing to send data to Gemini API:');
    console.log('Prompt length:', prompt.length);
    
    // Generate a response with text only
    console.log('Calling Gemini API with text-only content');
    const result = await textModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
    });
    
    const response = result.response;
    const text = response.text();
    console.log('Received response from Gemini API');
    console.log('Response text length:', text.length);
    
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                     text.match(/```\n([\s\S]*?)\n```/) ||
                     text.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      console.error('Could not extract JSON from Gemini response');
      throw new Error('Invalid response format from Gemini API');
    }
    
    const jsonStr = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
    console.log('Extracted JSON analysis');
    
    // Parse the JSON response
    let analysisData: AnalysisResults;
    try {
      // Parse the JSON and transform it to match our schema
      const parsedData = JSON.parse(jsonStr);
      console.log('Successfully parsed analysis data');
      
      // Ensure we have all the required fields with proper defaults
      analysisData = {
        score: parsedData.score || 5,
        strengths: parsedData.strengths || [],
        improvements: parsedData.improvements || [],
        keyFrames: parsedData.keyFrames || [],
        recommendedDrills: parsedData.recommendedDrills || []
      };
      
      // Ensure score is between 1-10
      analysisData.score = Math.min(10, Math.max(1, analysisData.score));
      
      // Make sure keyFrames have all required properties
      analysisData.keyFrames = analysisData.keyFrames.map(frame => ({
        time: frame.time || 0,
        description: frame.description || 'Analysis frame',
        annotations: frame.annotations || []
      }));
      
      // Ensure recommendedDrills have all required properties
      analysisData.recommendedDrills = analysisData.recommendedDrills.map(drill => ({
        title: drill.title || 'Practice Drill',
        description: drill.description || 'Recommended practice drill to improve your swing'
      }));
      
    } catch (err) {
      console.error('Error parsing JSON from Gemini response:', err);
      throw new Error('Failed to parse analysis data from Gemini API');
    }
    
    return analysisData;
    
  } catch (err: any) {
    console.error('Error in Gemini analysis:', err);
    throw new Error(`Gemini analysis failed: ${err.message}`);
  }
}