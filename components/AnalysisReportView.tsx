
import React from 'react';
import { AnalysisReport } from '../types';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface Props {
  report: AnalysisReport;
  onRestart: () => void;
}

const AnalysisReportView: React.FC<Props> = ({ report, onRestart }) => {
  const radarData = [
    { subject: 'STAR compliance', A: report.starCompliance, fullMark: 100 },
    { subject: 'Behavioral', A: report.behavioralScore, fullMark: 100 },
    { subject: 'Technical', A: report.technicalScore, fullMark: 100 },
    { subject: 'Engagement', A: 85, fullMark: 100 },
    { subject: 'Tone', A: 90, fullMark: 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white">Performance Report</h1>
          <p className="text-slate-400">Your AI-driven interview feedback and roadmap.</p>
        </div>
        <button 
          onClick={onRestart}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold border border-slate-700 transition-all flex items-center space-x-2"
        >
          <i className="fa-solid fa-rotate-right"></i>
          <span>New Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Overall Score Circle */}
        <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl">
          <div className="relative w-48 h-48 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
               <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
               <circle 
                  cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={552.92} strokeDashoffset={552.92 * (1 - report.overallScore / 100)} 
                  strokeLinecap="round" className="text-indigo-500 transition-all duration-1000 ease-out" 
                />
             </svg>
             <div className="absolute flex flex-col items-center">
               <span className="text-5xl font-black text-white">{report.overallScore}%</span>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
             </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Hireability Status</h3>
            <p className={`text-sm font-bold px-4 py-1 rounded-full inline-block ${report.overallScore > 75 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {report.overallScore > 75 ? 'Recommended for Hire' : 'Development Required'}
            </p>
          </div>
        </div>

        {/* Competency Radar */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl min-h-[400px]">
           <h3 className="text-lg font-bold text-white mb-6">Competency Matrix</h3>
           <ResponsiveContainer width="100%" height="100%">
             <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
               <PolarGrid stroke="#334155" />
               <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
               <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
               <Radar name="Candidate" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
             </RadarChart>
           </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Detailed Feedback */}
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <i className="fa-solid fa-comment-dots mr-3 text-indigo-400"></i>
              Qualitative Feedback
            </h3>
            <p className="text-slate-300 leading-relaxed text-lg">
              {report.feedback}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-500 block mb-2 uppercase">Strengths</span>
                <ul className="text-sm space-y-2">
                  {report.keyStrengths.map((s, i) => (
                    <li key={i} className="flex items-start">
                      <i className="fa-solid fa-check-circle text-green-400 mt-1 mr-2 text-[10px]"></i>
                      <span className="text-slate-300">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-500 block mb-2 uppercase">Areas to Improve</span>
                <ul className="text-sm space-y-2">
                  {report.improvementAreas.map((a, i) => (
                    <li key={i} className="flex items-start">
                      <i className="fa-solid fa-arrow-trend-up text-amber-400 mt-1 mr-2 text-[10px]"></i>
                      <span className="text-slate-300">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
         </div>

         {/* Growth Roadmap */}
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <i className="fa-solid fa-graduation-cap mr-3 text-indigo-400"></i>
              Upskilling Roadmap
            </h3>
            <div className="space-y-4">
              {report.suggestedCourses.map((course, i) => (
                <div key={i} className="p-4 bg-slate-950 hover:bg-indigo-900/10 border border-slate-800 hover:border-indigo-500/30 rounded-2xl transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                      <p className="text-sm text-slate-500">{course.provider}</p>
                    </div>
                    <i className="fa-solid fa-arrow-up-right-from-square text-slate-600 group-hover:text-indigo-400 text-xs"></i>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
              <p className="text-xs text-indigo-300 font-medium">
                <i className="fa-solid fa-circle-info mr-2"></i>
                Courses are selected based on the specific skill gaps identified between your Resume and the target Job Description.
              </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AnalysisReportView;
