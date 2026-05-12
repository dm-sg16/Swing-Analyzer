import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { statsSchema, analysisOptionsSchema, AnalysisResults, InsertSwing, insertUserSchema } from "@shared/schema";
import { getAnalyzer, ProviderAuthError, ProviderInputError, ProviderResponseError } from "./ai";
import { resolveProvider } from "./routes-helpers";
import { generateAnalysisPDF } from "./pdf";

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage2,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/png", "video/mp4", "video/quicktime"];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error("Unsupported file type"));
      return;
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to handle media upload
  app.post("/api/upload", upload.any(), async (req: Request, res: Response) => {
    try {
      // Get the uploaded files
      const files = req.files as Express.Multer.File[];
      console.log("Received files:", files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));
      
      // Process videos and images
      const videos = files.filter(file => 
        file.mimetype.startsWith('video/') || 
        file.fieldname.startsWith('videos[')
      );
      const images = files.filter(file => 
        file.mimetype.startsWith('image/') || 
        file.fieldname.startsWith('images[')
      );
      
      console.log(`Processed ${videos.length} videos and ${images.length} images`);
      
      // Create response with file paths
      const response = {
        success: true,
        videos: videos.map(video => `/uploads/${video.filename}`),
        images: images.map(img => `/uploads/${img.filename}`),
      };
      
      res.status(200).json(response);
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message || "Error uploading files" 
      });
    }
  });
  
  // Serve uploaded files
  app.use("/uploads", (req: Request, res: Response, next: NextFunction) => {
    // Check if this is a request for a PDF
    if (req.url.startsWith('/pdfs/')) {
      const pdfPath = path.join(uploadDir, req.url);
      if (fs.existsSync(pdfPath)) {
        return res.sendFile(pdfPath);
      }
    }
    
    // Handle other uploads
    const filePath = path.join(uploadDir, path.basename(req.url));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });
  
  // API endpoint to save swing stats
  app.post("/api/stats", async (req: Request, res: Response) => {
    try {
      const statsData = statsSchema.parse(req.body);
      res.status(200).json({ success: true, stats: statsData });
    } catch (err: any) {
      res.status(400).json({ 
        success: false, 
        message: err.message || "Invalid stats data" 
      });
    }
  });
  
  // API endpoint to generate AI analysis
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      console.log("Analyze endpoint received request", {
        hasVideoUrls: !!(req.body.videoUrls && req.body.videoUrls.length > 0),
        hasVideoUrl: !!req.body.videoUrl,
        hasImageUrls: !!(req.body.imageUrls && req.body.imageUrls.length > 0),
        hasStats: !!req.body.stats,
        hasOptions: !!req.body.options,
        simpleMode: !!req.body.simpleMode,
        apiKeyAvailable: !!process.env.GEMINI_API_KEY
      });
      
      const { videoUrls, videoUrl, imageUrls, stats, options, simpleMode } = req.body;
      
      // Validate options
      const analysisOptions = analysisOptionsSchema.parse(options);
      
      // Add simpleMode to the options to pass to the AI
      if (simpleMode) {
        (analysisOptions as any).simpleMode = true;
      }
      
      console.log("Analysis options validated:", analysisOptions);
      
      // Normalize inputs - handle both videoUrls array and legacy videoUrl
      const processedVideoUrls: string[] = [];
      if (videoUrls && videoUrls.length > 0) {
        // Only take the first video
        processedVideoUrls.push(videoUrls[0]);
      } else if (videoUrl) {
        processedVideoUrls.push(videoUrl);
      }
      
      // Check if videos or images are provided
      if (processedVideoUrls.length === 0 && (!imageUrls || imageUrls.length === 0)) {
        console.log("No videos or images provided in request");
        return res.status(400).json({
          success: false,
          message: "Please provide either a video or at least one image"
        });
      }
      
      const provider = resolveProvider(req.body);
      console.log(`Starting analysis with ${provider}...`);

      const analyzer = getAnalyzer(provider);
      const analysis = await analyzer.analyzeSwing(
        processedVideoUrls[0],
        imageUrls,
        stats,
        analysisOptions,
      );
      console.log("Analysis completed successfully");
      
      // Save analysis to database
      try {
        // For demonstration purposes, we're using a fixed user ID
        // In a real app, you would get this from the authenticated user
        const userId = 1;
        
        if (analysis) {
          const title = `Swing Analysis - ${new Date().toLocaleDateString()}`;
          const description = stats?.additionalContext || "Swing analysis";
          
          await storage.createSwing({
            userId,
            title,
            description,
            videoUrl: processedVideoUrls[0],
            imageUrls: imageUrls || [],
            isPublic: false,
            stats,
            analysis
          });
          
          console.log("Saved swing analysis to database");
        }
      } catch (saveErr: any) {
        console.error("Error saving analysis to database:", saveErr);
        // Continue even if save fails
      }
      
      // Return response
      res.status(200).json({
        success: true,
        analysis,
        provider,
      });
    } catch (err: any) {
      console.error("Analysis error:", err);
      if (err instanceof ProviderAuthError) {
        return res.status(503).json({
          success: false,
          message: err.message,
          provider: err.provider,
          suggestedAction: 'switch_provider',
        });
      }
      if (err instanceof ProviderResponseError || err instanceof ProviderInputError) {
        return res.status(422).json({
          success: false,
          message: err.message,
          provider: err.provider,
        });
      }
      res.status(500).json({
        success: false,
        message: err.message || "Error generating analysis",
      });
    }
  });

  // API endpoint to list all user swings
  app.get("/api/swings", async (req: Request, res: Response) => {
    try {
      // For demonstration purposes, we're using a fixed user ID
      // In a real app, you would get this from the authenticated user
      const userId = 1;
      
      console.log("Fetching swings for user:", userId);
      const swings = await storage.getSwingsByUserId(userId);
      
      res.status(200).json({
        success: true,
        swings
      });
    } catch (err: any) {
      console.error("Error fetching swings:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Error fetching swings"
      });
    }
  });
  
  // API endpoint to get a single swing
  app.get("/api/swings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid swing ID"
        });
      }
      
      console.log("Fetching swing with ID:", id);
      const swing = await storage.getSwing(id);
      
      if (!swing) {
        return res.status(404).json({
          success: false,
          message: "Swing not found"
        });
      }
      
      res.status(200).json({
        success: true,
        swing
      });
    } catch (err: any) {
      console.error("Error fetching swing:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Error fetching swing"
      });
    }
  });
  
  // API endpoint to delete a swing
  app.delete("/api/swings/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid swing ID"
        });
      }
      
      console.log("Deleting swing with ID:", id);
      const deleted = await storage.deleteSwing(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Swing not found or could not be deleted"
        });
      }
      
      res.status(200).json({
        success: true,
        message: "Swing deleted successfully"
      });
    } catch (err: any) {
      console.error("Error deleting swing:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Error deleting swing"
      });
    }
  });
  
  // API endpoint to save a new swing with analysis
  app.post("/api/swings", async (req: Request, res: Response) => {
    try {
      const { videoUrl, imageUrls, title, description, stats, analysis } = req.body;
      
      // For demonstration purposes, we're using a fixed user ID
      // In a real app, you would get this from the authenticated user
      const userId = 1;
      
      const swingData: InsertSwing = {
        userId,
        title: title || `Swing Analysis - ${new Date().toLocaleDateString()}`,
        description: description || "Swing analysis",
        videoUrl,
        imageUrls: imageUrls || [],
        isPublic: false,
        stats,
        analysis
      };
      
      console.log("Creating new swing record");
      const swing = await storage.createSwing(swingData);
      
      res.status(201).json({
        success: true,
        swing
      });
    } catch (err: any) {
      console.error("Error saving swing:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Error saving swing"
      });
    }
  });

  // API endpoint to generate PDF from analysis
  app.post("/api/generate-pdf", async (req: Request, res: Response) => {
    try {
      const { analysis, playerName } = req.body;
      
      if (!analysis) {
        return res.status(400).json({
          success: false,
          message: "Analysis data is required"
        });
      }
      
      console.log("Generating PDF for analysis");
      
      // Add better debug logging for the keyframes
      console.log(`Analysis has ${analysis.keyFrames?.length || 0} key frames`);
      if (analysis.keyFrames && analysis.keyFrames.length > 0) {
        analysis.keyFrames.forEach((frame: { time: number, imageUrl?: string }, index: number) => {
          console.log(`Frame ${index}: time=${frame.time}s, has image URL: ${Boolean(frame.imageUrl)}`);
          if (frame.imageUrl) {
            // Log the first 50 chars of the URL to see what type it is (data URL, relative path, etc)
            const urlPreview = frame.imageUrl.substring(0, 50) + (frame.imageUrl.length > 50 ? '...' : '');
            console.log(`Image URL preview: ${urlPreview}`);
          }
        });
      }
      
      // Make sure imageUrls are properly set for frames captured from the video
      if (analysis.keyFrames) {
        // Look for any data URLs in the frames and make sure they're preserved
        analysis.keyFrames = analysis.keyFrames.map((frame: { time: number, imageUrl?: string, annotations?: any[] }) => {
          // If a frame doesn't have an image URL but has annotations, it might be a captured frame
          if (!frame.imageUrl && frame.annotations && frame.annotations.length > 0) {
            console.log(`Frame at ${frame.time}s has annotations but no image URL`);
          }
          return frame;
        });
      }
      
      const pdfPath = await generateAnalysisPDF(analysis, playerName);
      
      res.status(200).json({
        success: true,
        pdfUrl: pdfPath
      });
    } catch (err: any) {
      console.error("PDF generation error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message || "Error generating PDF" 
      });
    }
  });
  
  // API endpoint to analyze a single frame with Gemini
  app.post("/api/analyze-frame", async (req: Request, res: Response) => {
    try {
      const { imageData, frameInfo, simpleMode } = req.body;
      
      if (!imageData) {
        return res.status(400).json({
          success: false,
          message: "No image data provided"
        });
      }
      
      // Save the base64 image temporarily
      const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
      const imagePath = path.join(uploadDir, "temp_" + Date.now() + ".jpg");
      
      fs.writeFileSync(imagePath, base64Data, "base64");
      
      try {
        // Analyze frame with Gemini
        console.log("Analyzing frame with Gemini...");
        console.log(`Using ${simpleMode ? 'simple' : 'advanced'} language mode`);
        
        // Get the frame phase name
        const phaseName = frameInfo?.name || "Swing Frame";
        
        // Create a specialized prompt for baseball swing analysis, with language adapted for the audience
        let prompt = '';
        
        if (simpleMode) {
          // Simple language for parents
          prompt = `
            You are a youth baseball coach analyzing a frame from a child's swing video.
            This frame shows the "${phaseName}" part of the swing.
            
            Your task is to ONLY provide a list of good things and things to work on in this EXACT format:
            
            STRENGTHS:
            - [good thing 1]
            - [good thing 2]
            - [good thing 3]
            - [good thing 4]
            
            WEAKNESSES:
            - [thing to improve 1]
            - [thing to improve 2]
            - [thing to improve 3]
            - [thing to improve 4]
            
            IMPORTANT RULES YOU MUST FOLLOW:
            1. Use SIMPLE, everyday language a parent with NO baseball experience can understand
            2. DO NOT use ANY technical baseball terms or jargon
            3. DO NOT provide ANY introduction, context, or conclusion text
            4. Keep each point super short and very easy to understand (5-8 words maximum)
            5. Focus ONLY on what can be seen in this exact picture
            6. Use encouraging, positive language even for weaknesses
            7. Your response must start with "STRENGTHS:" and contain nothing else except the two bullet lists
          `;
        } else {
          // Technical language for coaches
          prompt = `
            You are a professional baseball swing coach analyzing a frame from a swing video.
            This frame represents the "${phaseName}" phase of the swing.
            
            Your task is to ONLY provide a list of strengths and weaknesses in this EXACT format:
            
            STRENGTHS:
            - [strength 1]
            - [strength 2]
            - [strength 3]
            - [strength 4]
            
            WEAKNESSES:
            - [weakness 1]
            - [weakness 2]
            - [weakness 3]
            - [weakness 4]
            
            IMPORTANT RULES YOU MUST FOLLOW:
            1. DO NOT provide ANY introduction, context, or conclusion text
            2. DO NOT mention any swing stats, measurements, or metrics
            3. DO NOT make general statements about the swing as a whole
            4. DO NOT include ANY text that isn't part of the bullet lists
            5. Keep each bullet point extremely brief (5-8 words maximum)
            6. Focus ONLY on what can be observed in this exact frame
            7. Be specific about body positions and mechanical elements using proper baseball terminology
            
            Your response must start with "STRENGTHS:" and contain nothing else except the two bullet lists.
          `;
        }
        
        const provider = resolveProvider(req.body);
        const analyzer = getAnalyzer(provider);
        const analysis = await analyzer.analyzeImage(imagePath, prompt, simpleMode);

        res.json({
          success: true,
          analysis,
          provider,
        });
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    } catch (error: any) {
      console.error("Error analyzing frame:", error);
      if (error instanceof ProviderAuthError) {
        return res.status(503).json({
          success: false,
          message: error.message,
          provider: error.provider,
          suggestedAction: 'switch_provider',
        });
      }
      if (error instanceof ProviderResponseError || error instanceof ProviderInputError) {
        return res.status(422).json({
          success: false,
          message: error.message,
          provider: error.provider,
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || "Failed to analyze frame",
      });
    }
  });
  
  // API endpoint for chat-based stats analysis
  app.post("/api/chat-stats", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "No message provided",
        });
      }

      console.log("Processing chat message for stats analysis:", message);

      const provider = resolveProvider(req.body);
      const analyzer = getAnalyzer(provider);

      const isAnalysisQuestion = message.includes("Based on this baseball swing analysis data:");

      if (isAnalysisQuestion) {
        const responseText = await analyzer.answerAnalysisQuestion(message);
        return res.status(200).json({
          success: true,
          response: responseText,
          message: responseText,
          provider,
        });
      }

      const { response, stats } = await analyzer.analyzeStatsChat(message);
      return res.status(200).json({
        success: true,
        response,
        stats,
        message: response,
        provider,
      });
    } catch (err: any) {
      console.error("Error in chat stats analysis:", err);
      if (err instanceof ProviderAuthError) {
        return res.status(503).json({
          success: false,
          message: err.message,
          provider: err.provider,
          suggestedAction: 'switch_provider',
        });
      }
      if (err instanceof ProviderResponseError || err instanceof ProviderInputError) {
        return res.status(422).json({
          success: false,
          message: err.message,
          provider: err.provider,
        });
      }
      res.status(500).json({
        success: false,
        message: err.message || "Error processing chat message"
      });
    }
  });
  
  // API endpoint to create a user for testing purposes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists"
        });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        success: true,
        user: userWithoutPassword
      });
    } catch (err: any) {
      console.error("User creation error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message || "Error creating user" 
      });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
