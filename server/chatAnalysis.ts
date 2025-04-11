import { SwingStats, statsSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export function isChatAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

export async function analyzeStatsChat(message: string): Promise<{
  response: string;
  stats?: SwingStats;
}> {
  try {
    if (!GEMINI_API_KEY) {
      return {
        response: "I'm sorry, the AI assistant is not available at the moment. The API key is missing.",
      };
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // Define the system prompt
    const systemPrompt = `
      You are a baseball swing analysis assistant. Your job is to extract statistics from user messages and respond helpfully.
      
      Extract the following baseball swing statistics:
      - batSpeed (number, mph): How fast the bat is moving
      - exitVelocity (number, mph): How fast the ball comes off the bat
      - launchAngle (number, degrees): The vertical angle of the ball when it leaves the bat
      - attackAngle (number, degrees): The angle of the bat's path during the swing
      - timeToContact (number, ms): How quickly the bat connects with the ball
      - rotationalAccel (number, deg/s²): How quickly the batter rotates during swing
      
      If any of these statistics are missing, make your best estimate based on the context, and flag in your response that you estimated values.
      Return a friendly, helpful response to the user, summarizing the stats you extracted.
      
      IMPORTANT: Convert any provided stats into the appropriate unit of measure as listed above.
    `;

    // First, have the model analyze the message and extract stats
    const extractionPrompt = `
      ${systemPrompt}
      
      User message: "${message}"
      
      Extract the swing statistics in JSON format following this exact structure:
      {
        "batSpeed": number or null,
        "exitVelocity": number or null,
        "launchAngle": number or null,
        "attackAngle": number or null,
        "timeToContact": number or null,
        "rotationalAccel": number or null
      }
      
      Return ONLY valid JSON, no other text.
    `;

    // Get the extraction response
    const extractionResult = await model.generateContent(extractionPrompt);
    const extractionText = extractionResult.response.text();
    
    // Try to parse the JSON
    let stats: Partial<SwingStats> = {};
    try {
      // Find any JSON in the response
      const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        stats = JSON.parse(jsonMatch[0]);
        
        // Default any null or undefined values to 0
        const statKeys = ["batSpeed", "exitVelocity", "launchAngle", "attackAngle", "timeToContact", "rotationalAccel"];
        for (const key of statKeys) {
          if (key in stats && (stats[key as keyof typeof stats] === null || stats[key as keyof typeof stats] === undefined)) {
            (stats as any)[key] = 0;
          }
        }
      }
    } catch (error) {
      console.error("Failed to parse stats JSON:", error);
      console.log("Raw extraction response:", extractionText);
      // Continue with empty stats
    }

    // Validate the stats using zod schema
    let validatedStats: SwingStats | undefined;
    try {
      validatedStats = statsSchema.parse(stats);
    } catch (error) {
      console.error("Stats validation failed:", error);
      // Will return undefined for stats
    }

    // Now generate a friendly response
    const responsePrompt = `
      ${systemPrompt}
      
      User message: "${message}"
      
      I extracted these stats (some may be estimated):
      ${JSON.stringify(stats, null, 2)}
      
      Give a friendly, helpful response to the user, mentioning which stats were extracted directly and which were estimated.
      Be conversational and helpful. Suggest next steps for analysis if appropriate.
      Keep your response under 150 words.
    `;

    const responseResult = await model.generateContent(responsePrompt);
    const responseText = responseResult.response.text();

    return {
      response: responseText,
      stats: validatedStats,
    };
  } catch (error) {
    console.error("Error in analyzeStatsChat:", error);
    return {
      response: "I'm sorry, I encountered an error analyzing your message. Please try again with more specific information about your swing stats.",
    };
  }
}