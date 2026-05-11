# Baseball Swing Analyzer

A cutting-edge baseball swing analysis platform that leverages AI and computer vision to provide comprehensive performance insights for players and coaches through intelligent, data-driven evaluation.

## Features

- **AI-Powered Swing Analysis**: Upload videos of baseball swings and get detailed feedback on mechanics
- **Simple and Advanced Modes**: Simplified interface for parents and detailed analysis for coaches
- **Video Analysis**: Upload and analyze baseball swing videos with frame-by-frame analysis
- **Statistics Input**: Input swing statistics manually or through an AI chat interface
- **Knowledge Base**: Access to baseball swing best practices and drills
- **PDF Report Generation**: Generate and download detailed analysis reports for sharing
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: Anthropic Claude (via the `claude` CLI with Pro/Max subscription auth) and/or Google Gemini, selectable per request
- **Additional Features**: PDF generation, video processing, WebSockets for real-time updates

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- One or both AI providers configured:
  - **Claude** (recommended for local use): the `claude` CLI authenticated to your Pro/Max account (`claude login`). Subscription tokens are used; no API key needed. Vision works via the `Read` tool, so the CLI subprocess accesses local image paths via `--add-dir`.
  - **Gemini**: a Google Gemini API key set in `GEMINI_API_KEY`.

### Installation

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Set up environment variables in `.env` file:
   ```
   DATABASE_URL=your_postgres_database_url
   AI_PROVIDER=claude            # or 'gemini' — server-side default if request omits it
   GEMINI_API_KEY=your_gemini_api_key   # required only if you plan to use Gemini
   ```
   The active AI provider is selected per request via the UI dropdown (defaulting to whatever `AI_PROVIDER` is set to). Claude requires the `claude` CLI to be logged into a Pro/Max account on the host machine.
4. Initialize the database
   ```
   npm run db:push
   ```
5. Start the application
   ```
   npm run dev
   ```

## Usage

1. Upload a baseball swing video
2. Choose between Simple (for parents) or Advanced (for coaches) analysis modes
3. View the analysis results with detailed feedback on swing mechanics
4. Use the chat interface to ask questions about the analysis
5. Download a PDF report to share with players or coaches

## License

This project is licensed under the MIT License - see the LICENSE file for details.