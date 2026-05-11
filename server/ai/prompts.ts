import type { AnalysisOptions, SwingStats } from '@shared/schema';
import { getKnowledgeBase } from '../knowledge/baseball-swing';

export function swingAnalysisSystemPrompt(isSimpleMode: boolean): string {
  if (isSimpleMode) {
    return [
      'You are a youth baseball coach who specializes in explaining swing mechanics to parents with no baseball experience.',
      'Your goal is to analyze the provided baseball swing using simple, everyday language without technical jargon.',
      'Focus on providing clear, actionable advice that a parent can understand and help their child practice.',
      'Use friendly, encouraging language and avoid technical terms when possible.',
    ].join(' ');
  }
  return [
    'You are a professional baseball coach and swing analysis expert with deep technical knowledge.',
    'Analyze the provided baseball swing using proper baseball terminology and biomechanics concepts.',
    'Your analysis should be technical and detailed, suitable for an experienced coach who understands',
    'advanced swing mechanics and baseball-specific terminology.',
  ].join(' ');
}

export function swingAnalysisUserPrompt(
  stats: SwingStats,
  options: AnalysisOptions,
  videoUrl: string | null,
  imageCount: number,
): string {
  const kb = getKnowledgeBase();
  const parts: string[] = [];

  parts.push('Base your analysis on the following information and provide detailed feedback.');
  parts.push('');
  parts.push('Use the following baseball knowledge base to inform your analysis:');
  parts.push('');
  parts.push(kb.baseballSwingGuide);
  parts.push('');
  parts.push(kb.swingPhaseDefinitions);
  parts.push('');
  parts.push(kb.playerEvaluationCriteria);
  parts.push('');
  parts.push(
    'IMPORTANT: Include at least 5 specific, detailed practice drills in your analysis. ' +
    'Each drill should directly address one of the improvement areas you identify. ' +
    'The drills should be age-appropriate, easily performed with minimal equipment, ' +
    'and include clear step-by-step instructions. Add a specific goal for each drill.',
  );

  if (options.analyzeTechnique) {
    parts.push('Focus on overall technique and swing execution.');
  }
  if (options.analyzeMechanics) {
    parts.push('Evaluate swing mechanics including balance, posture, and path.');
  }
  if (options.analyzeRecommendations) {
    parts.push('Provide specific recommendations for improvement.');
  }

  if (videoUrl) {
    parts.push('A video of the swing was provided showing a full motion swing from setup to follow-through.');
  }
  if (imageCount > 0) {
    parts.push(`${imageCount} image(s) of the swing from different angles were provided.`);
  }

  if (stats && Object.keys(stats).length > 0) {
    parts.push('');
    parts.push('Player statistics:');
    if (stats.batSpeed != null) parts.push(`- Bat Speed: ${stats.batSpeed} mph`);
    if (stats.exitVelocity != null) parts.push(`- Exit Velocity: ${stats.exitVelocity} mph`);
    if (stats.launchAngle != null) parts.push(`- Launch Angle: ${stats.launchAngle} degrees`);
    if (stats.attackAngle != null) parts.push(`- Attack Angle: ${stats.attackAngle} degrees`);
    if (stats.timeToContact != null) parts.push(`- Time to Contact: ${stats.timeToContact} seconds`);
    if (stats.pitchType) parts.push(`- Pitch Type: ${stats.pitchType}`);
    if (stats.additionalContext) parts.push(`- Additional Context: ${stats.additionalContext}`);
  }

  return parts.join('\n');
}

export function statsChatSystemPrompt(): string {
  return [
    'You are a baseball swing analysis assistant. Extract the following swing statistics from the user message:',
    '- batSpeed (number, mph)',
    '- exitVelocity (number, mph)',
    '- launchAngle (number, degrees)',
    '- attackAngle (number, degrees)',
    '- timeToContact (number, ms)',
    '- rotationalAccel (number, deg/s^2)',
    '',
    'Return a friendly, helpful response summarizing what you extracted. Convert any provided values into the listed units.',
  ].join('\n');
}

export function analysisQuestionPrompt(message: string): string {
  return [
    'You are a baseball swing analysis expert. Answer the following question about a swing analysis.',
    'Be specific, helpful, and conversational. Provide actionable insights where possible.',
    '',
    message,
    '',
    'Your response should be 3-4 sentences maximum, unless a detailed explanation is required.',
  ].join('\n');
}
