
import { GoogleGenAI, Type, Part } from "@google/genai";
import { ResumeData, AnalysisReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ResumeInput {
  text?: string;
  file?: {
    data: string;
    mimeType: string;
  };
}

/**
 * System Prompt for the Interviewer
 */
export const INTERVIEWER_SYSTEM_PROMPT = `
You are a senior hiring manager with 20 years of experience in recruitment for Fortune 500 companies. 
Your goal is to conduct a professional, rigorous, and empathetic mock interview.
Follow these rules:
1. Contextualize every question based on the candidate's specific Resume and the provided Job Description.
2. Ask one question at a time.
3. Use the STAR (Situation, Task, Action, Result) method to evaluate answers.
4. Maintain a professional yet encouraging tone.
5. If the candidate gives a shallow answer, ask a follow-up "probing" question.
6. Focus on both technical skills and behavioral cultural fit.
`;

const getResumePart = (input: ResumeInput): Part => {
  if (input.file) {
    return {
      inlineData: {
        data: input.file.data,
        mimeType: input.file.mimeType,
      },
    };
  }
  return { text: `Resume Content: ${input.text || ""}` };
};

export const parseResumeAndJD = async (resume: ResumeInput, jdText: string): Promise<ResumeData> => {
  const resumePart = getResumePart(resume);
  const promptPart = { text: `Analyze this Resume against this Job Description. Provide an ATS score, extracted skills, years of experience, a summary, and identify any gaps.\n\nJob Description: ${jdText}` };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [resumePart, promptPart] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "ATS match score out of 100" },
          extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experienceYears: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Skills or experience gaps found" }
        },
        required: ["score", "extractedSkills", "experienceYears", "summary", "gaps"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateInterviewQuestions = async (resume: ResumeInput, jd: string): Promise<string[]> => {
  const resumePart = getResumePart(resume);
  const promptPart = { text: `Based on this candidate's resume and the job description, generate 5 highly relevant and challenging interview questions.\n\nJob Description: ${jd}` };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [resumePart, promptPart] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateDeepAnalysis = async (transcript: any[], resume: ResumeInput, jd: string): Promise<AnalysisReport> => {
  const resumePart = getResumePart(resume);
  const promptPart = { text: `Analyze the following interview transcript against the Resume and Job Description. Provide a detailed score and feedback.\n\nJob Description: ${jd}\n\nTranscript: ${JSON.stringify(transcript)}` };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ parts: [resumePart, promptPart] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          starCompliance: { type: Type.NUMBER },
          behavioralScore: { type: Type.NUMBER },
          technicalScore: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedCourses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                provider: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          }
        },
        required: ["overallScore", "starCompliance", "behavioralScore", "technicalScore", "feedback", "keyStrengths", "improvementAreas", "suggestedCourses"]
      }
    }
  });

  return JSON.parse(response.text);
};
