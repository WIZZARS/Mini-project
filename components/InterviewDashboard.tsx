
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { InterviewSession, AnalysisReport } from '../types';
import { generateDeepAnalysis, INTERVIEWER_SYSTEM_PROMPT } from '../services/geminiService';

interface Props {
  session: InterviewSession;
  onFinish: (report: AnalysisReport) => void;
}

const InterviewDashboard: React.FC<Props> = ({ session, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState<{ speaker: 'AI' | 'USER', text: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isAThinking, setIsAThinking] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Start video feed
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => console.error("Camera access denied", err));

    const interval = setInterval(() => setTimer(t => t + 1), 1000);

    // Initial AI introduction
    speakQuestion(session.questions[0]);

    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setCurrentAnswer(prev => prev + ' ' + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        // Automatically restart if the user didn't manually stop it (e.g. timeout)
        if (isRecording) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      clearInterval(interval);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Sync recording state with speech recognition
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition already started");
      }
    } else {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const speakQuestion = async (text: string) => {
    setIsAThinking(true);
    setTranscript(prev => [...prev, { speaker: 'AI', text }]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this professionally: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (e) {
      console.warn("TTS failed, proceeding with text-only", e);
    } finally {
      setIsAThinking(false);
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) chData[i] = dataInt16[i * numChannels + ch] / 32768.0;
    }
    return buffer;
  };

  const handleNext = async () => {
    // Add the current answer to transcript before proceeding
    const finalAnswer = currentAnswer.trim();
    const updatedTranscript = [...transcript];
    if (finalAnswer) {
      updatedTranscript.push({ speaker: 'USER', text: finalAnswer });
      setTranscript(updatedTranscript);
      setCurrentAnswer('');
    }

    // Stop recording when transitioning
    setIsRecording(false);

    if (currentIdx < session.questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      speakQuestion(session.questions[nextIdx]);
    } else {
      setIsAThinking(true);
      try {
        const report = await generateDeepAnalysis(updatedTranscript, session.resume, session.jobDescription);
        onFinish(report);
      } catch (err) {
        console.error("Analysis failed", err);
        // Fallback or error handling could go here
      } finally {
        setIsAThinking(false);
      }
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-160px)]">
      {/* Left: AI Interviewer (Avatar Area) */}
      <div className="lg:col-span-8 space-y-4 flex flex-col">
        <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10"></div>
          
          <div className="relative z-20 flex flex-col items-center">
             <div className={`w-48 h-48 rounded-full border-4 border-indigo-500/30 flex items-center justify-center bg-slate-800 shadow-2xl transition-transform duration-500 ${isAThinking ? 'scale-110' : 'scale-100'}`}>
                <div className={`w-40 h-40 rounded-full bg-indigo-600/20 flex items-center justify-center animate-pulse`}>
                  <i className="fa-solid fa-user-tie text-7xl text-indigo-400"></i>
                </div>
                {isAThinking && (
                   <div className="absolute -inset-4 border-2 border-indigo-400/50 rounded-full animate-ping"></div>
                )}
             </div>
             <div className="mt-8 text-center px-8">
               <h2 className="text-2xl font-bold text-white mb-2">Senior Recruiter (AI)</h2>
               <div className="min-h-[80px] flex items-center justify-center">
                 <p className="text-xl text-slate-200 leading-relaxed max-w-xl italic">
                   "{session.questions[currentIdx]}"
                 </p>
               </div>
             </div>
          </div>

          <div className="absolute bottom-6 left-6 z-20 flex items-center space-x-4">
             <div className="px-4 py-2 bg-indigo-500 text-white rounded-full text-sm font-bold shadow-lg">
               Question {currentIdx + 1}/{session.questions.length}
             </div>
             <div className="px-4 py-2 bg-slate-800/80 backdrop-blur text-white rounded-full text-sm font-mono border border-slate-700">
               <i className="fa-regular fa-clock mr-2"></i> {formatTime(timer)}
             </div>
          </div>
        </div>

        {/* Real-time Subtitles / Transcription Feed */}
        <div className="h-32 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-2">
           {transcript.slice(-2).map((line, i) => (
             <div key={i} className={`text-sm ${line.speaker === 'AI' ? 'text-indigo-400 font-medium' : 'text-slate-400 italic'}`}>
               <span className="font-bold mr-2 uppercase text-[10px]">{line.speaker}:</span>
               <span>{line.text}</span>
             </div>
           ))}
           {isRecording && (
             <div className="text-sm text-indigo-300 animate-pulse">
               <span className="font-bold mr-2 uppercase text-[10px]">YOU (LIVE):</span>
               <span>{currentAnswer || 'Listening...'}</span>
             </div>
           )}
           {!isRecording && transcript.length === 0 && <p className="text-slate-500 italic text-center py-4">Wait for the question, then click 'Start Speaking'.</p>}
        </div>
      </div>

      {/* Right: Candidate View (Webcam) & Controls */}
      <div className="lg:col-span-4 space-y-6 flex flex-col">
        <div className="aspect-video bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute top-4 right-4 bg-red-500 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest animate-pulse flex items-center shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full mr-2"></span> LIVE
          </div>
        </div>

        <div className="flex-1 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
           <div className="space-y-4">
             <h3 className="text-lg font-bold text-white">Interview Controls</h3>
             <p className="text-sm text-slate-400">Enable your microphone and speak your answer. Your words will appear in the feed below the avatar.</p>
             
             <div className="pt-4 flex flex-col space-y-3">
               <button 
                 onClick={() => setIsRecording(!isRecording)}
                 className={`w-full py-4 rounded-xl flex items-center justify-center space-x-3 transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}
               >
                 <i className={`fa-solid ${isRecording ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
                 <span className="font-bold">{isRecording ? 'Stop Recording' : 'Start Speaking'}</span>
               </button>

               <button 
                 onClick={handleNext}
                 disabled={isAThinking}
                 className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
               >
                 {isAThinking ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-forward"></i>}
                 <span>{currentIdx === session.questions.length - 1 ? 'Finish Interview' : 'Next Question'}</span>
               </button>
             </div>
           </div>

           <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Voice Activity</span>
                <span className={`text-xs font-bold ${isRecording ? 'text-indigo-400' : 'text-slate-600'}`}>{isRecording ? 'Active' : 'Idle'}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-300 ${isRecording ? 'w-full animate-pulse' : 'w-0'}`}
                ></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
