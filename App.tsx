
import React, { useState } from 'react';
import LoginView from './components/LoginView';
import SetupModule from './components/SetupModule';
import InterviewDashboard from './components/InterviewDashboard';
import AnalysisReportView from './components/AnalysisReportView';
import { AppStep, ResumeData, InterviewSession, AnalysisReport } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const handleLogin = () => {
    setStep(AppStep.SETUP);
  };

  const handleSetupComplete = (data: ResumeData, sess: InterviewSession) => {
    setResumeData(data);
    setSession(sess);
    setStep(AppStep.INTERVIEW);
  };

  const handleInterviewComplete = (finalReport: AnalysisReport) => {
    setReport(finalReport);
    setStep(AppStep.ANALYSIS);
  };

  const restart = () => {
    // If not logged in, go back to auth. Otherwise setup.
    // For this demo, let's just go back to setup if already authenticated.
    setStep(AppStep.SETUP);
    setResumeData(null);
    setSession(null);
    setReport(null);
  };

  const logout = () => {
    setStep(AppStep.AUTH);
    setResumeData(null);
    setSession(null);
    setReport(null);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={restart}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-robot text-white"></i>
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase">AI Mock <span className="text-indigo-400">Analyzer</span></span>
          </div>
          
          {step !== AppStep.AUTH && (
            <div className="flex items-center space-x-8">
              <div className="hidden md:flex space-x-6 text-sm font-medium text-slate-400">
                <span className={step === AppStep.SETUP ? 'text-white underline decoration-indigo-500 underline-offset-8' : ''}>1. Setup</span>
                <span className={step === AppStep.INTERVIEW ? 'text-white underline decoration-indigo-500 underline-offset-8' : ''}>2. Interview</span>
                <span className={step === AppStep.ANALYSIS ? 'text-white underline decoration-indigo-500 underline-offset-8' : ''}>3. Results</span>
              </div>
              <button 
                onClick={logout}
                className="text-slate-400 hover:text-white transition-colors text-sm font-bold flex items-center space-x-2"
              >
                <span>Logout</span>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {step === AppStep.AUTH && (
          <LoginView onLogin={handleLogin} />
        )}

        {step === AppStep.SETUP && (
          <SetupModule onComplete={handleSetupComplete} />
        )}
        
        {step === AppStep.INTERVIEW && session && (
          <InterviewDashboard session={session} onFinish={handleInterviewComplete} />
        )}

        {step === AppStep.ANALYSIS && report && (
          <AnalysisReportView report={report} onRestart={restart} />
        )}
      </main>
    </div>
  );
};

export default App;
