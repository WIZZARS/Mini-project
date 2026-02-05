
import React, { useState, useRef } from 'react';
import { parseResumeAndJD, generateInterviewQuestions, ResumeInput } from '../services/geminiService';
import { ResumeData, InterviewSession, InterviewStage } from '../types';

interface Props {
  onComplete: (data: ResumeData, session: InterviewSession) => void;
}

const STAGES: { id: InterviewStage; label: string; icon: string; desc: string }[] = [
  { id: 'Behavioral', label: 'Behavioral', icon: 'fa-users', desc: 'STAR method & soft skills focus' },
  { id: 'Technical', label: 'Technical', icon: 'fa-code', desc: 'Domain specific & hard skills' },
  { id: 'System Design', label: 'System Design', icon: 'fa-sitemap', desc: 'Architecture & scalability' },
  { id: 'Culture Fit', label: 'Culture Fit', icon: 'fa-heart', desc: 'Values & mission alignment' },
  { id: 'Case Study', label: 'Case Study', icon: 'fa-lightbulb', desc: 'Problem solving frameworks' },
];

const SetupModule: React.FC<Props> = ({ onComplete }) => {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState<{ data: string, mimeType: string } | null>(null);
  const [jdText, setJdText] = useState('');
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<InterviewStage>('Behavioral');
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
          const base64Data = result.split(',')[1];
          setResumeFile({ data: base64Data, mimeType: file.type });
          setResumeText('');
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
      setError('Please provide both your resume and the target job description.');
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
        generateInterviewQuestions(resumeInput, jdText, selectedStage)
      ]);

      onComplete(data, {
        resume: resumeText || (resumeFileName ? `[PDF File: ${resumeFileName}]` : ""),
        jobDescription: jdText,
        stage: selectedStage,
        questions,
        currentQuestionIndex: 0,
        transcripts: []
      });
    } catch (err) {
      setError('An error occurred during material analysis. Please verify your inputs.');
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
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest">
          <i className="fa-solid fa-sparkles"></i>
          <span>Step 1: Preparation Context</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tight">Configure Your Interview</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Tailor the AI's persona and question bank by selecting your focus area.
        </p>
      </div>

      {/* Stage Selection */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <i className="fa-solid fa-layer-group text-indigo-500"></i>
          <span>Choose Interview Stage</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all space-y-3 group ${
                selectedStage === stage.id 
                  ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${
                selectedStage === stage.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
              }`}>
                <i className={`fa-solid ${stage.icon}`}></i>
              </div>
              <div className="text-center">
                <p className={`text-sm font-bold ${selectedStage === stage.id ? 'text-white' : 'text-slate-400'}`}>{stage.label}</p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{stage.desc}</p>
              </div>
            </button>
          ))}
        </div>
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
                <i className="fa-solid fa-times-circle mr-1"></i> Remove
              </button>
            )}
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all p-8 text-center ${
              resumeFileName 
                ? 'border-indigo-500/50 bg-indigo-500/5' 
                : 'border-slate-800 bg-slate-900/30 hover:border-indigo-500/50 hover:bg-slate-900/50'
            }`}
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.md" onChange={handleFileUpload} />
            <div className="space-y-3">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                resumeFileName ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
              }`}>
                <i className={`fa-solid ${resumeFileName ? 'fa-file-pdf' : 'fa-cloud-arrow-up'} text-xl`}></i>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{resumeFileName ? resumeFileName : 'Upload Resume'}</p>
                <p className="text-xs text-slate-500">PDF, TXT, or MD</p>
              </div>
            </div>
          </div>

          <textarea
            className="w-full h-40 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600 text-sm"
            placeholder="Or paste resume content here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        {/* JD Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <i className="fa-solid fa-briefcase text-indigo-500"></i>
            <span>Job Description</span>
          </h3>
          <textarea
            className="w-full h-[325px] bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600 text-sm leading-relaxed"
            placeholder="Paste the full job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center space-x-3 text-sm">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-2xl bg-indigo-600 py-6 text-xl font-black text-white shadow-2xl transition-all hover:bg-indigo-700 disabled:opacity-50"
      >
        <div className="relative z-10 flex items-center justify-center space-x-4">
          {loading ? (
            <><i className="fa-solid fa-circle-notch animate-spin"></i><span>Analyzing Materials...</span></>
          ) : (
            <><span>Begin {selectedStage} Session</span><i className="fa-solid fa-bolt-lightning text-yellow-400"></i></>
          )}
        </div>
      </button>
    </div>
  );
};

export default SetupModule;
