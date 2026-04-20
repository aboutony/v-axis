// apps/web/src/App.tsx
import React, { useState } from 'react';

// MASTER DATA: Integrated to ensure zero path errors
const workforceMap: Record<string, any[]> = {
  "Group Corporate Office": [
    { name: "Majed Al-Fahad", nat: "Saudi", role: "MD", status: "ACTIVE", date: "2028-04-10", badge: "bg-[#1E40AF]", docType: "National ID" },
    { name: "Ahmad Hamad", nat: "Jordan", role: "CFO", status: "EXPIRING SOON", date: "2026-05-12", badge: "bg-[#F43F5E]", docType: "Iqama" },
    { name: "Anas Mansour", nat: "Syrian", role: "Legal", status: "ACTIVE", date: "2026-11-20", badge: "bg-[#1E40AF]", docType: "Iqama" }
  ],
  "The Real-Estate Development Company": [
    { name: "Bandar Al-Otaibi", nat: "Saudi", role: "PM", status: "EXPIRING SOON", date: "2026-06-20", badge: "bg-[#F43F5E]", docType: "National ID" },
    { name: "Talal Tafesh", nat: "Jordan", role: "Site Eng", status: "ACTIVE", date: "2026-12-01", badge: "bg-[#1E40AF]", docType: "Iqama" }
  ],
  "The Oil & Gas Company": [
    { name: "Sami Al-Mutairi", nat: "Saudi", role: "Rig Mgr", status: "ACTIVE", date: "2028-03-15", badge: "bg-[#1E40AF]", docType: "National ID" },
    { name: "Robert Davies", nat: "Australia", role: "HSE Mgr", status: "EXPIRING SOON", date: "2026-04-22", badge: "bg-[#F43F5E]", docType: "Iqama" }
  ]
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('Group Corporate Office');

  const companies = [
    "Group Corporate Office", "The Real-Estate Development Company", "The Retail Company",
    "The Field Services Company", "The Human Capital Services Company", "The Oil & Gas Company",
    "The Hospitality Company", "The Logistics Services Company", "The Engineering & Consulting Firm"
  ];

  const currentWorkforce = workforceMap[selectedCompany] || workforceMap["Group Corporate Office"];

  // NEO-TACTILE STYLE TOKENS
  const neoShadowRecessed = isDarkMode ? 'inset 8px 8px 16px #01030a, inset -8px -8px 16px #030924' : 'inset 6px 6px 12px #e2e8f0, inset -6px -6px 12px #ffffff';
  const neoShadowElevated = isDarkMode ? '20px 20px 60px #01040f, -20px -20px 60px #03081f' : '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff';

  return (
    <div className={`min-h-screen transition-all duration-700 font-sans p-12 ${isDarkMode ? 'bg-[#020617]' : 'bg-[#F8FAFC]'}`}>
      
      {/* HEADER */}
      <header className="max-w-[1800px] mx-auto mb-16 flex justify-between items-center">
        <div>
          <h1 className={`text-6xl font-black tracking-tighter uppercase leading-none italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>V-AXIS</h1>
          <p className="text-[#10B981] text-xs font-black tracking-[0.5em] uppercase mt-2">Administrative Intelligence</p>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* ENTITY VAULT */}
        <div className="p-12 rounded-[4rem] transition-all duration-700" style={{ boxShadow: neoShadowRecessed }}>
           <div className="flex justify-between items-center mb-12">
              <h3 className={`text-3xl font-black italic uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Entity Vault</h3>
              <select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent border-none outline-none font-black text-[#10B981] uppercase text-xs tracking-widest cursor-pointer"
              >
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
           
           <div className="space-y-6 opacity-40">
              <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-sm font-bold">
                 Select subsidiary to sync entity documents...
              </div>
           </div>
        </div>

        {/* WORKFORCE ASSET PORTAL */}
        <div className="p-12 rounded-[4rem] transition-all duration-700" style={{ boxShadow: neoShadowElevated, backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}>
          <div className="flex justify-between items-center mb-12">
            <h3 className={`text-3xl font-black italic uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Workforce Portal</h3>
            <div className="flex items-center gap-2 bg-[#10B981]/10 px-4 py-2 rounded-full border border-[#10B981]/20">
              <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
              <span className="text-[10px] text-[#10B981] font-black uppercase">Live Sync</span>
            </div>
          </div>

          <div className="space-y-6">
            {currentWorkforce.map((person, i) => (
              <div key={i} className={`p-8 rounded-[2.5rem] flex justify-between items-center transition-all hover:translate-x-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>{person.name.charAt(0)}</div>
                  <div>
                    <p className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.name}</p>
                    <p className="text-[#10B981] font-bold uppercase text-xs">{person.nat} • {person.role}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase italic mb-1">{person.docType} Expiry</p>
                   <p className={`font-black text-xl mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.date}</p>
                   <span className={`px-4 py-1.5 rounded-full text-white text-[9px] font-black uppercase tracking-widest ${person.badge}`}>{person.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}