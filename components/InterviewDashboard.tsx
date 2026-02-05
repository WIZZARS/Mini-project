
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { InterviewSession, AnalysisReport } from '../types';
import { generateDeepAnalysis } from '../services/geminiService';

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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    
    // Start video feed
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current && isComponentMounted.current) videoRef.current.srcObject = stream;
      })
      .catch(err => console.error("Camera access denied", err));

    const interval = setInterval(() => setTimer(t => t + 1), 1000);

    // Initial AI introduction
    speakQuestion(session.questions[0]);

    // Setup Speech Recognition
    initSpeechRecognition();

    return () => {
      isComponentMounted.current = false;
      clearInterval(interval);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      stopRecognition();
    };
  }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const initSpeechRecognition = () => {
    stopRecognition();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript && isComponentMounted.current) {
          setCurrentAnswer(prev => (prev.trim() + ' ' + finalTranscript.trim()).trim());
          setSpeechError(null);
        }
      };

      recognition.onerror = (event: any) => {
        if (isComponentMounted.current) {
          if (event.error === 'network') {
            setSpeechError("Network error detected in speech engine. Try retrying or switching to text mode.");
          } else if (event.error === 'not-allowed') {
            setSpeechError("Microphone access denied.");
          }
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        if (isRecording && isComponentMounted.current && !speechError) {
          try { recognition.start(); } catch (e) {}
        }
      };
      recognitionRef.current = recognition;
    } else {
      setSpeechError("Browser speech recognition not supported.");
      setIsManualMode(true);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setSpeechError(null);
      if (!recognitionRef.current) initSpeechRecognition();
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isRecording) {
      try { recognition.start(); } catch (e) {}
    } else {
      try { recognition.stop(); } catch (e) {}
    }
  }, [isRecording]);

  const speakQuestion = async (text: string) => {
    if (!isComponentMounted.current) return;
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
      if (base64Audio && isComponentMounted.current) {
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
      console.warn("TTS failed", e);
    } finally {
      if (isComponentMounted.current) setIsAThinking(false);
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
    const finalAnswer = currentAnswer.trim();
    const updatedTranscript = [...transcript];
    if (finalAnswer) {
      updatedTranscript.push({ speaker: 'USER', text: finalAnswer });
      setTranscript(updatedTranscript);
      setCurrentAnswer('');
    }

    setIsRecording(false);

    if (currentIdx < session.questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      speakQuestion(session.questions[nextIdx]);
    } else {
      setIsAThinking(true);
      try {
        const report = await generateDeepAnalysis(updatedTranscript, { text: session.resume }, session.jobDescription);
        onFinish(report);
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        if (isComponentMounted.current) setIsAThinking(false);
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
      {/* Left: AI Interviewer */}
      <div className="lg:col-span-8 space-y-4 flex flex-col">
        <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-8">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>
          
          <div className="relative z-20 flex flex-col items-center w-full text-center">
             <div className={`w-32 h-32 rounded-full border-4 ${isAThinking ? 'border-indigo-400' : 'border-slate-800'} flex items-center justify-center bg-slate-950 shadow-2xl transition-all duration-700 mb-8`}>
                <div className={`w-24 h-24 rounded-full bg-indigo-600/10 flex items-center justify-center ${isAThinking ? 'animate-pulse scale-110' : ''}`}>
                  <i className={`fa-solid fa-user-tie text-5xl ${isAThinking ? 'text-indigo-400' : 'text-slate-600'}`}></i>
                </div>
             </div>
             
             <div className="space-y-4 max-w-2xl mx-auto">
               <div className="inline-flex items-center px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                 {session.stage} Interview
               </div>
               <h2 className="text-3xl font-black text-white leading-tight">
                 "{session.questions[currentIdx]}"
               </h2>
             </div>
          </div>

          <div className="absolute bottom-8 left-8 z-20 flex items-center space-x-3">
             <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider">
               Q{currentIdx + 1} / {session.questions.length}
             </div>
             <div className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-mono">
               <i className="fa-regular fa-clock mr-2 text-indigo-500"></i> {formatTime(timer)}
             </div>
          </div>
        </div>

        {/* Live Transcript */}
        <div className="h-40 bg-slate-900/40 backdrop-blur border border-slate-800 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
           <div className="space-y-4">
             {transcript.slice(-3).map((line, i) => (
               <div key={i} className={`flex space-x-3 ${line.speaker === 'AI' ? 'opacity-50' : ''}`}>
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded h-fit mt-1 ${line.speaker === 'AI' ? 'bg-slate-800 text-slate-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                   {line.speaker}
                 </span>
                 <p className="text-sm text-slate-300 leading-relaxed">{line.text}</p>
               </div>
             ))}
             {(isRecording || isManualMode || currentAnswer) && (
               <div className="flex space-x-3">
                 <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded h-fit mt-1 bg-green-500/20 text-green-400 animate-pulse">YOU</span>
                 <p className="text-sm text-slate-100 italic">{currentAnswer || (isRecording ? 'Listening...' : 'Type answer...')}</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Right: Controls & Webcam */}
      <div className="lg:col-span-4 space-y-6 flex flex-col">
        <div className="aspect-video bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl group">
          <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-4 right-4"><div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center border border-slate-800"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-ping"></span> Live Session</div></div>
        </div>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col">
           <div className="flex-1 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Input Controls</h3>
                <button onClick={() => { setIsManualMode(!isManualMode); setSpeechError(null); }} className={`text-[10px] font-black uppercase px-2 py-1 rounded transition-colors ${isManualMode ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{isManualMode ? 'Switch to Voice' : 'Switch to Text'}</button>
             </div>

             {speechError && (
               <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex flex-col space-y-2 animate-in fade-in slide-in-from-top-1">
                 <div className="flex items-start space-x-2"><i className="fa-solid fa-circle-info mt-0.5"></i><span>{speechError}</span></div>
                 <div className="flex space-x-3 pl-6">
                    <button onClick={() => { setSpeechError(null); initSpeechRecognition(); }} className="text-red-400 font-black uppercase tracking-widest hover:underline underline-offset-4">Retry Voice</button>
                    <button onClick={() => { setIsManualMode(true); setSpeechError(null); }} className="text-slate-400 font-bold uppercase tracking-widest hover:underline underline-offset-4">Text Mode</button>
                 </div>
               </div>
             )}

             <div className="space-y-4">
               {isManualMode ? (
                 <textarea className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" placeholder="Type your answer here..." value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} />
               ) : (
                 <button onClick={toggleRecording} className={`w-full py-5 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all border-2 ${isRecording ? 'bg-red-500/10 border-red-500 text-red-500 shadow-lg shadow-red-500/10' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400'}`}>
                   <div className="relative"><i className={`fa-solid ${isRecording ? 'fa-stop-circle' : 'fa-microphone'} text-2xl`}></i>{isRecording && <div className="absolute -inset-2 border-2 border-red-500 rounded-full animate-ping opacity-50"></div>}</div>
                   <span className="text-xs font-black uppercase tracking-widest">{isRecording ? 'Stop Recording' : 'Start Speaking'}</span>
                 </button>
               )}

               <button onClick={handleNext} disabled={isAThinking || (!currentAnswer.trim() && !isRecording)} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center space-x-3 group">
                 {isAThinking ? <i className="fa-solid fa-circle-notch animate-spin text-xl"></i> : <><span className="uppercase tracking-widest font-bold">{currentIdx === session.questions.length - 1 ? 'Finish' : 'Submit'}</span><i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>}
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
