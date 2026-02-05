
export enum AppStep {
  AUTH = 'AUTH',
  SETUP = 'SETUP',
  PREPARING = 'PREPARING',
  INTERVIEW = 'INTERVIEW',
  ANALYSIS = 'ANALYSIS'
}

export interface ResumeData {
  score: number;
  extractedSkills: string[];
  experienceYears: number;
  summary: string;
  gaps: string[];
}

export interface InterviewSession {
  resume: string;
  jobDescription: string;
  questions: string[];
  currentQuestionIndex: number;
  transcripts: { speaker: 'AI' | 'USER'; text: string; timestamp: number }[];
}

export interface AnalysisReport {
  overallScore: number;
  starCompliance: number; // 0-100
  behavioralScore: number; // 0-100
  technicalScore: number; // 0-100
  feedback: string;
  keyStrengths: string[];
  improvementAreas: string[];
  suggestedCourses: { title: string; provider: string; url: string }[];
}
