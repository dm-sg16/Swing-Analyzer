import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { AnalysisResults } from '@shared/schema';
import https from 'https';
import http from 'http';

const pdfDir = path.join(process.cwd(), "uploads", "pdfs");
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Helper function to download an image from URL
const downloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to download image: ${url ? url.substring(0, 30) + '...' : 'undefined'}`);
    
    // Return early if URL is missing
    if (!url) {
      reject(new Error('No image URL provided'));
      return;
    }
    
    // Handle local files
    if (url.startsWith('/uploads/')) {
      // Local file - just return the full path
      const localPath = path.join(process.cwd(), url);
      console.log(`Local image path: ${localPath}`);
      if (fs.existsSync(localPath)) {
        console.log(`Local image found: ${localPath}`);
        resolve(localPath);
      } else {
        console.error(`Local file not found: ${localPath}`);
        reject(new Error(`Local file not found: ${localPath}`));
      }
      return;
    }
    
    // Handle data URLs (e.g., from canvas screenshots)
    if (url.startsWith('data:image/')) {
      try {
        console.log('Processing data URL image');
        // Extract the base64 data
        const matches = url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.error('Invalid data URL format');
          throw new Error('Invalid data URL format');
        }
        
        const imageType = matches[1]; // jpeg, png, etc.
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Write to a temporary file
        const tempImagePath = path.join(pdfDir, `temp-${Date.now()}-${Math.round(Math.random() * 1000)}.${imageType}`);
        fs.writeFileSync(tempImagePath, buffer);
        console.log(`Data URL image saved to: ${tempImagePath}`);
        resolve(tempImagePath);
        return;
      } catch (error) {
        console.error('Error processing data URL image:', error);
        reject(error);
        return;
      }
    }
    
    // Handle blob URLs - these won't work server-side, so we need to inform the user
    if (url.startsWith('blob:')) {
      console.error('Blob URL cannot be processed server-side:', url.substring(0, 30) + '...');
      reject(new Error('Blob URLs cannot be processed by the server. The image needs to be converted to a data URL first.'));
      return;
    }
    
    // For all other URLs, try to download as remote URLs
    try {
      console.log(`Downloading remote image: ${url.substring(0, 30)}...`);
      const tempImagePath = path.join(pdfDir, `temp-${Date.now()}-${Math.round(Math.random() * 1000)}.jpg`);
      const file = fs.createWriteStream(tempImagePath);
      
      // Check protocol
      let protocolModule;
      if (url.startsWith('https:')) {
        protocolModule = https;
      } else if (url.startsWith('http:')) {
        protocolModule = http;
      } else {
        console.error(`Unsupported URL protocol: ${url.split(':')[0]}`);
        reject(new Error(`Unsupported URL protocol: ${url.split(':')[0]}`));
        return;
      }
      
      const request = protocolModule.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.error(`Failed to download image: ${response.statusCode}`);
          file.close();
          fs.unlink(tempImagePath, () => {});
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Remote image downloaded to: ${tempImagePath}`);
          resolve(tempImagePath);
        });
      });
      
      request.on('error', (err) => {
        console.error(`Error downloading image: ${err.message}`);
        fs.unlink(tempImagePath, () => {});
        reject(err);
      });
      
      file.on('error', (err) => {
        console.error(`Error writing image file: ${err.message}`);
        fs.unlink(tempImagePath, () => {});
        reject(err);
      });
    } catch (error) {
      console.error('Error in download attempt:', error);
      reject(error);
    }
  });
};

// Generate a PDF report from swing analysis data
export async function generateAnalysisPDF(analysis: AnalysisResults, playerName?: string): Promise<string> {
  // First, download any frame images
  const frameImagePromises: Promise<{index: number, imagePath: string | null}>[] = [];
  
  for (let i = 0; i < analysis.keyFrames.length; i++) {
    const frame = analysis.keyFrames[i];
    if (frame.imageUrl) {
      frameImagePromises.push(
        downloadImage(frame.imageUrl)
          .then(imagePath => ({ index: i, imagePath }))
          .catch(err => {
            console.error(`Failed to download image for frame ${i}:`, err);
            return { index: i, imagePath: null };
          })
      );
    } else {
      frameImagePromises.push(Promise.resolve({ index: i, imagePath: null }));
    }
  }
  
  // Wait for all image downloads to complete
  const frameImages = await Promise.all(frameImagePromises);
  
  return new Promise((resolve, reject) => {
    try {
      // Create a unique filename
      const filename = `swing-analysis-${Date.now()}.pdf`;
      const filePath = path.join(pdfDir, filename);
      
      // Create a document
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        autoFirstPage: true
      });

      // Pipe its output to a file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Set up some basic document metadata
      doc.info.Title = 'Baseball Swing Analysis';
      doc.info.Author = 'Swing Analysis AI';

      // Add a header with logo and title
      doc
        .fontSize(24)
        .fillColor('#2563eb')
        .font('Helvetica-Bold')
        .text('Swing Analysis Report', { align: 'center' });

      doc
        .moveDown()
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica')
        .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });

      if (playerName) {
        doc
          .moveDown()
          .fontSize(16)
          .fillColor('#000000')
          .font('Helvetica-Bold')
          .text(`Player: ${playerName}`, { align: 'center' });
      }

      // Add a divider line
      doc.moveDown();
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      doc.moveDown();

      // Add overall score section
      doc
        .fontSize(16)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Overall Score', { underline: true });

      doc.moveDown(0.5);

      // Add score visualization
      const score = analysis.score;
      const scoreX = 50;
      const scoreY = doc.y;
      const scoreWidth = 200;
      const scoreHeight = 25;

      // Draw the score background
      doc
        .rect(scoreX, scoreY, scoreWidth, scoreHeight)
        .fillColor('#e5e7eb')
        .fill();

      // Draw the actual score
      const filledWidth = (score / 10) * scoreWidth;
      doc
        .rect(scoreX, scoreY, filledWidth, scoreHeight)
        .fillColor('#2563eb')
        .fill();

      // Add the score text
      doc
        .fillColor('white')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`${score}/10`, scoreX + scoreWidth / 2 - 15, scoreY + 5);

      doc.moveDown(2);

      // Strengths section
      doc
        .fontSize(16)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Strengths', { underline: true });

      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      analysis.strengths.forEach((strength, index) => {
        doc
          .fillColor('#059669')
          .fontSize(12)
          .text(`${index + 1}. `, 50, doc.y, { continued: true })
          .fillColor('#4b5563')
          .text(strength);
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // Areas for improvement section
      doc
        .fontSize(16)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Areas for Improvement', { underline: true });

      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      analysis.improvements.forEach((improvement, index) => {
        doc
          .fillColor('#dc2626')
          .fontSize(12)
          .text(`${index + 1}. `, 50, doc.y, { continued: true })
          .fillColor('#4b5563')
          .text(improvement);
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // Key Frames Analysis
      doc
        .fontSize(16)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Key Frames Analysis', { underline: true });

      doc.moveDown(0.5);

      // Function to parse frame description for strengths and weaknesses
      const parseAnalysisText = (text: string) => {
        const strengthsSet = new Set<string>();
        const weaknessesSet = new Set<string>();
        let currentSection = '';
        
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
          if (line.toUpperCase().includes('STRENGTHS:')) {
            currentSection = 'strengths';
            continue;
          } else if (line.toUpperCase().includes('WEAKNESSES:')) {
            currentSection = 'weaknesses';
            continue;
          }
          
          // If the line starts with a bullet point or number, it's an item
          if (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)) {
            const item = line.replace(/^[-•\d\.]+\s*/, '').trim();
            if (item && currentSection === 'strengths') {
              // Only add if not already present (avoid duplicates)
              strengthsSet.add(item);
            } else if (item && currentSection === 'weaknesses') {
              // Only add if not already present (avoid duplicates)
              weaknessesSet.add(item);
            }
          }
        }
        
        // Convert Sets to Arrays and limit to reasonable number (max 5 of each)
        const strengths = Array.from(strengthsSet).slice(0, 5);
        const weaknesses = Array.from(weaknessesSet).slice(0, 5);
        
        return { strengths, weaknesses };
      };

      // Process each key frame
      for (let i = 0; i < analysis.keyFrames.length; i++) {
        const frame = analysis.keyFrames[i];
        const frameImageData = frameImages.find(img => img.index === i);
        
        // Always start each frame on a new page (to prevent overlapping with strengths/weaknesses)
        if (i > 0) {
          doc.addPage();
        } else if (doc.y > doc.page.height - 300) {
          // For the first frame, only add a page if we're already low on space
          doc.addPage();
        }
        
        // Frame title
        // Extract a meaningful name from the description if possible
        let frameTitle = `Frame ${i + 1}: ${frame.time.toFixed(1)}s`;
        
        // Try to extract a phase name from the description (e.g., "Stance", "Load", etc.)
        const descriptionStart = frame.description.split('\n')[0];
        if (descriptionStart && descriptionStart.includes(':')) {
          // The description starts with a phase name like "Stance:" or "Load:"
          frameTitle = `Frame ${i + 1}: ${frame.time.toFixed(1)}s - ${descriptionStart.split(':')[0].trim()}`;
        } else if (descriptionStart && descriptionStart.length < 50) {
          // The description starts with a short phrase (probably a phase name)
          frameTitle = `Frame ${i + 1}: ${frame.time.toFixed(1)}s - ${descriptionStart.trim()}`;
        }
        
        doc
          .fontSize(14)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text(frameTitle);
        
        try {
          // Parse the description to extract strengths and weaknesses
          const { strengths, weaknesses } = parseAnalysisText(frame.description);
          
          // Helper variables for standard layout
          let standardLayoutApplied = false;
          
          // Define standard layout function that can be used in multiple places
          function renderStandardLayout() {
            // If we have an image, add it first
            if (frameImageData && frameImageData.imagePath) {
              try {
                // Add some space before the image
                doc.moveDown(0.5);
                
                // Calculate image dimensions to fit within the page
                const maxWidth = doc.page.width - 150; // Margins on both sides
                const maxHeight = 180; // Reduced maximum height for the image to leave room for text
                
                // Add the image
                doc.image(frameImageData.imagePath, {
                  fit: [maxWidth, maxHeight],
                  align: 'center'
                });
                
                // Add space after the image
                doc.moveDown();
              } catch (err) {
                console.error(`Error adding image for frame ${i}:`, err);
              }
            }
            
            // Add strengths and weaknesses sections
            if (strengths.length > 0 || weaknesses.length > 0) {
              // Strengths section
              if (strengths.length > 0) {
                doc
                  .fontSize(12)
                  .fillColor('#374151')
                  .font('Helvetica-Bold')
                  .text('Strengths:');
                  
                doc.moveDown(0.2);
                
                strengths.forEach((strength, idx) => {
                  doc
                    .fillColor('#059669')
                    .fontSize(11)
                    .text(`• `, 50, doc.y, { continued: true })
                    .fillColor('#4b5563')
                    .text(strength);
                    
                  doc.moveDown(0.3);
                });
                
                doc.moveDown(0.5);
              }
              
              // Weaknesses section
              if (weaknesses.length > 0) {
                doc
                  .fontSize(12)
                  .fillColor('#374151')
                  .font('Helvetica-Bold')
                  .text('Weaknesses:');
                  
                doc.moveDown(0.2);
                
                weaknesses.forEach((weakness, idx) => {
                  doc
                    .fillColor('#dc2626')
                    .fontSize(11)
                    .text(`• `, 50, doc.y, { continued: true })
                    .fillColor('#4b5563')
                    .text(weakness);
                    
                  doc.moveDown(0.3);
                });
                
                doc.moveDown(0.5);
              }
            } else {
              // Fallback to just showing the description if parsing failed
              doc
                .fontSize(12)
                .fillColor('#4b5563')
                .font('Helvetica')
                .text(frame.description);
            }
          };
          
          // Create a side-by-side layout with text and image if both are available
          if (frameImageData && frameImageData.imagePath && (strengths.length > 0 || weaknesses.length > 0)) {
            try {
              // Set up a two-column layout
              const leftColumnWidth = doc.page.width * 0.5 - 60; // Left column for text (50% of page width minus some margin)
              const rightColumnStart = leftColumnWidth + 70; // Start position for right column (image)
              const rightColumnWidth = doc.page.width - rightColumnStart - 50; // Width for right column
              
              const startY = doc.y + 10; // Remember starting Y position with a bit of margin
              let textEndY = startY; // Will track the lowest point of the text section
              
              // Move to the start of the left column
              doc.x = 50;
              doc.y = startY;
              
              // FIRST COLUMN: Strengths and weaknesses
              
              // Strengths section
              if (strengths.length > 0) {
                doc
                  .fontSize(12)
                  .fillColor('#374151')
                  .font('Helvetica-Bold')
                  .text('Strengths:', { width: leftColumnWidth });
                  
                doc.moveDown(0.2);
                
                strengths.forEach((strength, idx) => {
                  doc
                    .fillColor('#059669')
                    .fontSize(11)
                    .text(`• `, 50, doc.y, { continued: true, width: leftColumnWidth })
                    .fillColor('#4b5563')
                    .text(strength, { width: leftColumnWidth });
                    
                  doc.moveDown(0.3);
                });
                
                doc.moveDown(0.5);
                textEndY = doc.y; // Update text end position
              }
              
              // Weaknesses section
              if (weaknesses.length > 0) {
                doc
                  .fontSize(12)
                  .fillColor('#374151')
                  .font('Helvetica-Bold')
                  .text('Weaknesses:', { width: leftColumnWidth });
                  
                doc.moveDown(0.2);
                
                weaknesses.forEach((weakness, idx) => {
                  doc
                    .fillColor('#dc2626')
                    .fontSize(11)
                    .text(`• `, 50, doc.y, { continued: true, width: leftColumnWidth })
                    .fillColor('#4b5563')
                    .text(weakness, { width: leftColumnWidth });
                    
                  doc.moveDown(0.3);
                });
                
                textEndY = Math.max(textEndY, doc.y + 10); // Update text end position with padding
              }
              
              // SECOND COLUMN: Image
              try {
                // Calculate optimal image dimensions
                const imageHeight = Math.min(250, textEndY - startY); // Match height of text or max of 250pts
                
                // Add the image in the right column
                doc.image(frameImageData.imagePath, rightColumnStart, startY, {
                  fit: [rightColumnWidth, imageHeight],
                  align: 'center'
                });
                
              } catch (imageErr) {
                console.error(`Error adding image for frame ${i}:`, imageErr);
              }
              
              // Move cursor to below both text and image
              doc.y = Math.max(textEndY, startY + 250) + 10;
              
            } catch (layoutErr) {
              console.error(`Error creating layout for frame ${i}:`, layoutErr);
              
              // If the two-column layout fails, fall back to the standard layout
              renderStandardLayout();
            }
          } else {
            // If we don't have both image and text analysis, use standard layout
            renderStandardLayout();
          }
        } catch (err) {
          // If there's an error parsing, just display the raw description
          console.error(`Error processing frame ${i}:`, err);
          doc
            .fontSize(12)
            .fillColor('#4b5563')
            .font('Helvetica')
            .text(frame.description || "Frame analysis unavailable");
        }
        
        // Add space after each frame analysis
        doc.moveDown(1);
      }

      // Recommended Drills
      doc.addPage();
      doc
        .fontSize(18)
        .fillColor('#2563eb')
        .font('Helvetica-Bold')
        .text('Recommended Practice Drills', { align: 'center' });

      doc.moveDown();

      analysis.recommendedDrills.forEach((drill, index) => {
        doc
          .fontSize(14)
          .fillColor('#1e40af')
          .font('Helvetica-Bold')
          .text(`Drill ${index + 1}: ${drill.title}`);

        doc
          .fontSize(12)
          .fillColor('#4b5563')
          .font('Helvetica')
          .text(drill.description);

        doc.moveDown();
      });

      // Footer
      const bottomY = doc.page.height - 50;
      doc
        .fontSize(10)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text(
          'Generated by Swing Analysis AI - All rights reserved.',
          50,
          bottomY,
          { align: 'center' }
        );

      // Finalize the PDF and end the stream
      doc.end();

      // When the stream is done, clean up temp files and resolve with the file path
      stream.on('finish', () => {
        // Clean up any temporary downloaded images
        frameImages.forEach(frameImg => {
          if (frameImg.imagePath && frameImg.imagePath.includes('temp-') && fs.existsSync(frameImg.imagePath)) {
            try {
              fs.unlinkSync(frameImg.imagePath);
            } catch (err) {
              console.error(`Error cleaning up temporary image: ${frameImg.imagePath}`, err);
            }
          }
        });
        
        resolve(`/uploads/pdfs/${filename}`);
      });

      stream.on('error', (err: unknown) => {
        // Also clean up on error
        frameImages.forEach(frameImg => {
          if (frameImg.imagePath && frameImg.imagePath.includes('temp-') && fs.existsSync(frameImg.imagePath)) {
            try {
              fs.unlinkSync(frameImg.imagePath);
            } catch (cleanupErr) {
              console.error(`Error cleaning up temporary image: ${frameImg.imagePath}`, cleanupErr);
            }
          }
        });
        
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}