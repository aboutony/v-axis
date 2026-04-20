// apps/web/src/App.tsx

import React, { useState } from 'react';
import DocumentUploadContainer from './components/upload/DocumentUploadContainer';
import { DocumentList } from './components/upload/DocumentList';

// MASTER DATA: 90 Personnel Identities (Neutral & Sanitized)
const workforceMap: Record<string, any[]> = {
  "Group Corporate Office": [
    { name: "Majed Al-Fahad", nat: "Saudi", role: "MD", status: "ACTIVE", date: "2028-04-10", badge: "bg-[#1E40AF]", docType: "National ID" },
    { name: "Ahmad Hamad", nat: "Jordan", role: "CFO", status: "EXPIRING SOON", date: "2026-05-12", badge: "bg-[#F43F5E]", docType: "Iqama" },
    { name: "Anas Mansour", nat: "Syrian", role: "Legal", status: "ACTIVE", date: "2026-11-20", badge: "bg-[#1E40AF]", docType: "Iqama" },
    { name: "John Miller", nat: "UK", role: "Strategy", status: "ACTIVE", date: "2027-03-04", badge: "bg-[#1E40AF]", docType: "Iqama" },
    { name: "Maria Santos", nat: "Philippine", role: "Exec Sec", status: "ACTIVE", date: "2026-09-22", badge: "bg-[#1E40AF]", docType: "Iqama" }
  ],
  "The Real-Estate Development Company": [
    { name: "Bandar Al-Otaibi", nat: "Saudi", role: "PM", status: "EXPIRING SOON", date: "2026-06-20", badge: "bg-[#F43F5E]", docType: "National ID" },
    { name: "Talal Tafesh", nat: "Jordan", role: "Site Eng", status: "ACTIVE", date: "2026-12-01", badge: "bg-[#1E40AF]", docType: "Iqama" },
    { name: "Omar Al-Hussein", nat: "Syrian", role: "Architect", status: "ACTIVE", date: "2026-11-05", badge: "bg-[#1E40AF]", docType: "Iqama" }
  ],
  "The Oil & Gas Company": [
    { name: "Sami Al-Mutairi", nat: "Saudi", role: "Rig Mgr", status: "ACTIVE", date: "2028-03-15", badge: "bg-[#1E40AF]", docType: "National ID" },
    { name: "Khaled Jaber", nat: "Jordan", role: "Drilling", status: "ACTIVE", date: "2026-12-05", badge: "bg-[#1E40AF]", docType: "Iqama" },
    { name: "Robert Davies", nat: "Australia", role: "HSE Mgr", status: "EXPIRING SOON", date: "2026-04-22", badge: "bg-[#F43F5E]", docType: "Iqama" }
  ]
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('Group Corporate Office');

  const companies = [
    "Group Corporate Office", "The Real-Estate Development Company", "The Retail Company",
    "The Field Services Company", "The Human Capital Services Company", "The Oil & Gas Company",
    "The Hospitality Company", "The Logistics Services Company", "The Engineering & Consulting Firm"
  ];

  const currentWorkforce = workforceMap[selectedCompany] || workforceMap["Group Corporate Office"];

  return (
    <div className={`min-h-screen transition-all duration-700 font-sans ${isDarkMode ? 'bg-[#020617]' : 'bg-[#F8FAFC]'}`}>
      
      {/* HEADER: High-Fidelity Handshake */}
      <header className="max-w-[1800px] mx-auto px-12 py-10 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#10B981] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-[4px_4px_10px_rgba(16,185,129,0.3)]">V</div>
          <div>
            <h1 className={`text-2xl font-black tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>V-AXIS</h1>
            <p className="text-[#10B981] text-[10px] font-bold tracking-[0.4em] uppercase opacity-70">Administrative Intelligence</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <button className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 shadow-lg border border-slate-100'}`}>Export Report</button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-slate-800 transition-all">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-12 pb-24">
        {/* DASHBOARD GRID: Neo-Tactile Calibrated */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* ENTITY VAULT: DEBOSSED / RECESSED UI */}
          <div className={`p-12 rounded-[4rem] transition-all duration-700 ${isDarkMode ? 'bg-slate-900 shadow-[inset_12px_12px_24px_#01030a,inset_-12px_-12px_24px_#030924]' : 'bg-[#F8FAFC] shadow-[inset_10px_10px_20px_#e2e8f0,inset_-10px_-10px_20px_#ffffff]'}`}>
            <div className="flex justify-between items-center mb-12 px-2">
              <h3 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Entity Vault</h3>
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-2xl transition-all shadow-xl ${isExpanded ? 'bg-rose-500 rotate-180' : 'bg-[#10B981]'}`}
              >
                {isExpanded ? '−' : '+'}
              </button>
            </div>
            
            {isExpanded ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
                <div className="relative group">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Subsidiary Cluster</p>
                   <select 
                    value={selectedCompany} 
                    onChange={(e) => setSelectedCompany(e.target.value)} 
                    className={`w-full p-6 pr-12 rounded-3xl border-none text-xs font-black uppercase tracking-tight outline-none cursor-pointer shadow-lg transition-all ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}`}
                   >
                     {companies.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <DocumentUploadContainer activeTab="entity" onUploadSuccess={() => setIsExpanded(false)} />
              </div>
            ) : (
              <div className="animate-in fade-in duration-700">
                <DocumentList selectedCompany={selectedCompany} />
              </div>
            )}
          </div>

          {/* WORKFORCE ASSET PORTAL: ELEVATED / FLOATING UI */}
          <div className={`p-12 rounded-[4rem] transition-all duration-700 min-h-[850px] ${isDarkMode ? 'bg-slate-900 shadow-[30px_30px_60px_#01040f,-30px_-30px_60px_#03081f]' : 'bg-white shadow-[30px_30px_60px_#d1d9e6,-30px_-30px_60px_#ffffff]'}`}>
            <div className="flex justify-between items-center mb-12">
              <h3 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Workforce Assets</h3>
              <div className="flex items-center space-x-3 bg-[#10B981]/10 px-6 py-2 rounded-full border border-[#10B981]/20">
                <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-[#10B981] font-black uppercase tracking-widest">Operational Sync</span>
              </div>
            </div>

            <div className="space-y-6 max-h-[750px] overflow-y-auto pr-4 custom-scrollbar">
              {currentWorkforce.map((person, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border flex justify-between items-center transition-all hover:translate-x-3 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl'}`}>
                  <div className="flex items-center space-x-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>{person.name.charAt(0)}</div>
                    <div>
                      <p className={`font-black text-2xl tracking-tight leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{person.name}</p>
                      <p className="font-serif text-sm font-black text-[#10B981] uppercase tracking-tight">{person.nat} • {person.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-10">
                     <div className="text-right px-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">{person.docType} Expiry</p>
                        <p className={`font-black text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.date}</p>
                     </div>
                     <span className={`px-6 py-2.5 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl transition-transform hover:scale-110 ${person.badge}`}>
                        {person.status}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      
      <footer className="max-w-[1800px] mx-auto px-12 py-12 flex justify-center opacity-40">
         <p className="text-[11px] font-bold text-slate-400 tracking-[0.6em] uppercase italic">Sovereign Intelligence Portal • PAC Technologies 2026</p>
      </footer>
    </div>
  );
}

export default App;