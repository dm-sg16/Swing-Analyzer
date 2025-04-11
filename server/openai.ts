import OpenAI from "openai";
import fs from "fs";
import { AnalysisOptions, AnalysisResults, SwingStats, analysisResultsSchema } from "@shared/schema";

// Initialize OpenAI with API key from environment variables
const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "";
if (!apiKey) {
  console.error("WARNING: No OpenAI API key found in environment variables");
}
console.log("OpenAI API key available:", apiKey ? "Yes" : "No");

const openai = new OpenAI({ 
  apiKey: apiKey
});

// Helper function to convert files to base64
function fileToBase64(filePath: string): string {
  const fileData = fs.readFileSync(filePath);
  return fileData.toString("base64");
}

export async function analyzeSwing(
  videoUrl: string | null, 
  imageUrls: string[] | null, 
  stats: SwingStats, 
  options: AnalysisOptions
): Promise<AnalysisResults> {
  try {
    console.log("Starting swing analysis with:");
    console.log("- Video URL:", videoUrl);
    console.log("- Image URLs:", imageUrls);
    console.log("- Analysis options:", options);
    // Prepare the messages for the API
    const messages: any[] = [
      {
        role: "system",
        content: `You are a professional baseball swing analysis expert. 
          Analyze the provided baseball swing and provide detailed feedback.
          Focus on ${options.analyzeTechnique ? 'technique, ' : ''}
          ${options.analyzeMechanics ? 'mechanics, ' : ''}
          ${options.analyzeComparison ? 'comparison to professional standards, ' : ''}
          ${options.analyzeRecommendations ? 'and specific improvement recommendations.' : ''}
          Provide a thorough analysis in JSON format.`
      }
    ];

    // Add context message with stats information
    if (stats) {
      messages.push({
        role: "user",
        content: `Here are the statistics for this swing:
          ${stats.batSpeed ? `Bat Speed: ${stats.batSpeed} mph` : ''}
          ${stats.exitVelocity ? `Exit Velocity: ${stats.exitVelocity} mph` : ''}
          ${stats.launchAngle ? `Launch Angle: ${stats.launchAngle} degrees` : ''}
          ${stats.attackAngle ? `Attack Angle: ${stats.attackAngle} degrees` : ''}
          ${stats.timeToContact ? `Time To Contact: ${stats.timeToContact} seconds` : ''}
          ${stats.pitchType ? `Pitch Type: ${stats.pitchType}` : ''}
          ${stats.additionalContext ? `Additional Context: ${stats.additionalContext}` : ''}
          
          Please analyze this swing and provide feedback.`
      });
    }

    // Add video content if available
    if (videoUrl) {
      const filePath = videoUrl.startsWith('/uploads/') ? 
        `${process.cwd()}/${videoUrl.substring(1)}` : 
        `${process.cwd()}${videoUrl}`;
      
      if (fs.existsSync(filePath)) {
        try {
          // For video analysis, we'll use key frames as still images
          // In a production app, we'd extract frames from the video
          // For this demo, we'll simplify and mention it in the prompt
          messages.push({
            role: "user",
            content: "Here is a video of the baseball swing. Please analyze the full swing motion."
          });
        } catch (error) {
          console.error("Error processing video:", error);
        }
      }
    }

    // Add image content if available
    if (imageUrls && imageUrls.length > 0) {
      const imageContents: any[] = [];
      
      for (const imageUrl of imageUrls) {
        const filePath = imageUrl.startsWith('/uploads/') ? 
          `${process.cwd()}/${imageUrl.substring(1)}` : 
          `${process.cwd()}${imageUrl}`;
        
        if (fs.existsSync(filePath)) {
          try {
            const base64Image = fileToBase64(filePath);
            imageContents.push({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            });
          } catch (error) {
            console.error(`Error processing image ${imageUrl}:`, error);
          }
        }
      }
      
      if (imageContents.length > 0) {
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "Here are images of the baseball swing from different angles. Please analyze the swing technique."
            },
            ...imageContents
          ]
        });
      }
    }

    // Final prompt to request formatted JSON response
    messages.push({
      role: "user",
      content: `Based on the provided information, generate a detailed swing analysis in JSON format with the following structure:
        {
          "score": <number from 1-10>,
          "strengths": [<array of strength points>],
          "improvements": [<array of improvement areas>],
          "keyFrames": [
            {
              "time": <time in seconds or 0 if from image>,
              "description": <description of technique at this point>,
              "annotations": [
                {
                  "type": <"line", "angle", "circle", "arrow", or "text">,
                  "points": <array of x,y coordinates like [x1,y1,x2,y2] for lines or [x,y,radius] for circles>,
                  "color": <hex color code like "#FF0000">,
                  "text": <text content if type is "text">,
                  "thickness": <line thickness in pixels>
                }
              ]
            }
          ],
          "recommendedDrills": [
            {
              "title": <drill name>,
              "description": <drill instructions>
            }
          ]
        }
        
        For the annotations:
        - Generate at least 1-3 annotations per key frame to highlight important swing elements
        - For line type, points should be [x1,y1,x2,y2] with coordinates in the 0-100 range (percent of image)
        - For arrow type, points should be [startX,startY,endX,endY] with coordinates in the 0-100 range
        - For circle type, points should be [centerX,centerY,radius] with coordinates in the 0-100 range
        - For angle type, points should be [vertex_x,vertex_y,point1_x,point1_y,point2_x,point2_y] with coordinates in the 0-100 range
        - For text type, points should be [x,y] position with coordinates in the 0-100 range
        - Use appropriate colors to distinguish different elements (red for issues, green for good technique, etc.)
        - Include clear explanatory text for annotations when type is "text"
        `
    });

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    // Parse the response
    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error("No analysis generated");
    }

    console.log("Received OpenAI response text:", analysisText);

    // Parse JSON response
    const analysisJson = JSON.parse(analysisText);
    console.log("Parsed JSON:", JSON.stringify(analysisJson, null, 2));
    
    // Validate with zod schema
    try {
      const validatedAnalysis = analysisResultsSchema.parse(analysisJson);
      console.log("Analysis validated successfully");
      return validatedAnalysis;
    } catch (error) {
      console.error("Schema validation error:", error);
      throw error;
    }

  } catch (error: any) {
    console.error("OpenAI Analysis Error:", error);
    
    // Re-throw the error so it can be handled by the route handler
    throw new Error(`Failed to generate analysis: ${error.message}`);
  }
}
