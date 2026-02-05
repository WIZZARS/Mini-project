
import React, { useState, useRef } from 'react';
import { parseResumeAndJD, generateInterviewQuestions, ResumeInput } from '../services/geminiService';
import { ResumeData, InterviewSession } from '../types';

interface Props {
  onComplete: (data: ResumeData, session: InterviewSession) => void;
}

const SetupModule: React.FC<Props> = ({ onComplete }) => {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<{ data: string, mimeType: string } | null>(null);
  const [jdText, setJdText] = useState('');
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFileName(file.name);
      const reader = new FileReader();
      
      if (file.type === 'application/pdf') {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          // Extract base64 data from data URL
          const base64Data = result.split(',')[1];
          setResumeFile({ data: base64Data, mimeType: file.type });
          setResumeText(''); // Clear text if file is uploaded
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setResumeText(text);
          setResumeFile(null);
        };
        reader.readAsText(file);
      }
    }
  };

  const handleStart = async () => {
    const hasResume = resumeText.trim() || resumeFile;
    if (!hasResume || !jdText.trim()) {
      setError('Please provide both your resume (file or text) and the target job description.');
      return;
    }

    setLoading(true);
    setError('');

    const resumeInput: ResumeInput = resumeFile 
      ? { file: resumeFile } 
      : { text: resumeText };

    try {
      const [data, questions] = await Promise.all([
        parseResumeAndJD(resumeInput, jdText),
        generateInterviewQuestions(resumeInput, jdText)
      ]);

      onComplete(data, {
        resume: resumeText || (resumeFileName ? `[PDF File: ${resumeFileName}]` : ""),
        jobDescription: jdText,
        questions,
        currentQuestionIndex: 0,
        transcripts: []
      });
    } catch (err) {
      setError('An error occurred during material analysis. Please verify your inputs and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResumeFileName(null);
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest">
          <i className="fa-solid fa-sparkles"></i>
          <span>Step 1: Application Setup</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight">Prepare Your Session</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Upload your resume and the job description. Our AI will craft a high-fidelity, role-specific interview simulation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Resume Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <i className="fa-solid fa-file-invoice text-indigo-500"></i>
              <span>Professional Resume</span>
            </h3>
            {resumeFileName && (
              <button 
                onClick={clearFile}
                className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center bg-red-400/10 px-2 py-1 rounded transition-colors"
              >
                <i className="fa-solid fa-times-circle mr-1"></i> Remove File
              </button>
            )}
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all p-10 text-center ${
              resumeFileName 
                ? 'border-indigo-500/50 bg-indigo-500/5' 
                : 'border-slate-800 bg-slate-900/30 hover:border-indigo-500/50 hover:bg-slate-900/50'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.txt,.md" 
              onChange={handleFileUpload} 
            />
            <div className="space-y-4">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
                resumeFileName ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
              }`}>
                <i className={`fa-solid ${resumeFileName ? 'fa-file-pdf' : 'fa-cloud-arrow-up'} text-2xl`}></i>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-200">
                  {resumeFileName ? resumeFileName : 'Upload your Resume'}
                </p>
                <p className="text-sm text-slate-500">
                  {resumeFileName ? 'File attached successfully' : 'Click to browse or drag and drop (PDF/TXT/MD)'}
                </p>
              </div>
            </div>
          </div>

          {!resumeFileName && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-2 text-slate-500 font-bold">Or paste content</span>
                </div>
              </div>

              <textarea
                className="w-full h-48 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600 text-sm font-mono leading-relaxed"
                placeholder="Paste your professional summary, experience, and skills here if you prefer not to upload a file..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </>
          )}
        </div>

        {/* JD Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <i className="fa-solid fa-briefcase text-indigo-500"></i>
              <span>Job Description</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium italic">Target Role Context</span>
          </div>

          <div className="relative">
             <textarea
              className="w-full h-[410px] bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600 text-sm leading-relaxed"
              placeholder="Paste the full job description, including requirements and responsibilities, to allow the AI to target its questions specifically to the role..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest pointer-events-none">
              Role Specification
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-start space-x-4 animate-in fade-in slide-in-from-top-2">
          <i className="fa-solid fa-triangle-exclamation mt-1"></i>
          <div className="text-sm font-medium">
            <p className="font-bold mb-1">Attention Required</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Action Section */}
      <div className="pt-4">
        <button
          onClick={handleStart}
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl bg-indigo-600 py-6 text-xl font-black text-white shadow-2xl shadow-indigo-500/40 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/60 disabled:opacity-50"
        >
          <div className="relative z-10 flex items-center justify-center space-x-4">
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i>
                <span>Analyzing Materials...</span>
              </>
            ) : (
              <>
                <span>Initialize AI Interview</span>
                <i className="fa-solid fa-bolt-lightning text-yellow-400 group-hover:scale-125 transition-transform"></i>
              </>
            )}
          </div>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
        </button>
      </div>

      {/* Footer / Helper Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center py-8 border-t border-slate-900">
        <div className="space-y-2">
          <i className="fa-solid fa-microchip text-indigo-500/50"></i>
          <p className="text-xs font-bold text-slate-300 uppercase">Multimodal Engine</p>
          <p className="text-[10px] text-slate-500">Direct PDF understanding via Gemini Vision/Doc models</p>
        </div>
        <div className="space-y-2">
          <i className="fa-solid fa-brain text-indigo-500/50"></i>
          <p className="text-xs font-bold text-slate-300 uppercase">Contextual Probing</p>
          <p className="text-[10px] text-slate-500">Interviewer focuses on matching your skills to JD</p>
        </div>
        <div className="space-y-2">
          <i className="fa-solid fa-lock text-indigo-500/50"></i>
          <p className="text-xs font-bold text-slate-300 uppercase">Secure Processing</p>
          <p className="text-[10px] text-slate-500">File data is processed securely and ephemeral</p>
        </div>
      </div>
    </div>
  );
};

export default SetupModule;
