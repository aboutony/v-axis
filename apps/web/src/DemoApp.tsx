// apps/web/src/DemoApp.tsx
// This is the DEMO version with fake data - preserved as-is

import { useState } from "react";
import DocumentUploadContainer from "./components/upload/DocumentUploadContainer";
import { DocumentList } from "./components/upload/DocumentList";

// MASTER WORKFORCE DATA: 10 Names per Subsidiary across 10 Nationalities
const workforceMap: Record<string, any[]> = {
  "Group Corporate Office": [
    {
      name: "Saud Al Qahtani",
      nat: "Saudi",
      role: "MD",
      status: "ACTIVE",
      date: "2027-01-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Ahmad Hamad",
      nat: "Jordan",
      role: "CFO",
      status: "EXPIRING SOON",
      date: "2026-05-12",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Anas Mansour",
      nat: "Syrian",
      role: "Legal",
      status: "ACTIVE",
      date: "2026-11-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "John Smith",
      nat: "UK",
      role: "Strategy",
      status: "ACTIVE",
      date: "2027-03-04",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Mark Wilson",
      nat: "Australia",
      role: "Advisor",
      status: "EXPIRING SOON",
      date: "2026-04-28",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Mohamed El-Sayed",
      nat: "Egypt",
      role: "Admin",
      status: "ACTIVE",
      date: "2026-12-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Fadi Al-Rahi",
      nat: "Lebanon",
      role: "Comms",
      status: "ACTIVE",
      date: "2026-10-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Amit Sharma",
      nat: "India",
      role: "IT Lead",
      status: "ACTIVE",
      date: "2027-02-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Asim Mahmood",
      nat: "Pakistan",
      role: "Audit",
      status: "EXPIRING SOON",
      date: "2026-05-02",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Maria Santos",
      nat: "Philippine",
      role: "Exec Sec",
      status: "ACTIVE",
      date: "2026-09-22",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Real-Estate Development Company": [
    {
      name: "Faisal Al Ghamdi",
      nat: "Saudi",
      role: "PM",
      status: "EXPIRING SOON",
      date: "2026-04-20",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Talal Tafesh",
      nat: "Jordan",
      role: "Site Eng",
      status: "ACTIVE",
      date: "2026-12-01",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Tahseen Hilal",
      nat: "Syrian",
      role: "Architect",
      status: "ACTIVE",
      date: "2026-11-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "James Cook",
      nat: "Australia",
      role: "Urbanist",
      status: "ACTIVE",
      date: "2027-01-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Oliver Brown",
      nat: "UK",
      role: "Quantity Surv",
      status: "EXPIRING SOON",
      date: "2026-05-05",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Ramy Mansour",
      nat: "Egypt",
      role: "Foreman",
      status: "ACTIVE",
      date: "2026-08-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Ziad Haddad",
      nat: "Lebanon",
      role: "Interior",
      status: "ACTIVE",
      date: "2026-10-12",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Rahul Verma",
      nat: "India",
      role: "Safety",
      status: "ACTIVE",
      date: "2026-12-25",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Irfan Khan",
      nat: "Pakistan",
      role: "Estimator",
      status: "ACTIVE",
      date: "2027-02-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Elena Cruz",
      nat: "Philippine",
      role: "Site Admin",
      status: "ACTIVE",
      date: "2026-09-18",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Retail Company": [
    {
      name: "Nawaf Al-Harbi",
      nat: "Saudi",
      role: "Ops Manager",
      status: "ACTIVE",
      date: "2026-12-12",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Yazan Odeh",
      nat: "Jordan",
      role: "Procurement",
      status: "EXPIRING SOON",
      date: "2026-04-25",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Khaled Idlibi",
      nat: "Syrian",
      role: "Warehouse",
      status: "ACTIVE",
      date: "2026-11-30",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Luke Skywalker",
      nat: "Australia",
      role: "Visual Merch",
      status: "ACTIVE",
      date: "2027-02-28",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Harry Potter",
      nat: "UK",
      role: "Inventory",
      status: "ACTIVE",
      date: "2027-01-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Mustafa Kamal",
      nat: "Egypt",
      role: "Cashier Lead",
      status: "ACTIVE",
      date: "2026-08-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Charbel Azzi",
      nat: "Lebanon",
      role: "Buyer",
      status: "ACTIVE",
      date: "2026-10-22",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Suresh Raina",
      nat: "India",
      role: "Security",
      status: "ACTIVE",
      date: "2026-12-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Babar Azam",
      nat: "Pakistan",
      role: "Supervisor",
      status: "EXPIRING SOON",
      date: "2026-05-01",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Grace Lee",
      nat: "Philippine",
      role: "CS Lead",
      status: "ACTIVE",
      date: "2026-09-05",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Field Services Company": [
    {
      name: "Sultan Al Dossari",
      nat: "Saudi",
      role: "Field Tech",
      status: "ACTIVE",
      date: "2027-01-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Omar Khayyam",
      nat: "Jordan",
      role: "Fleet Mgr",
      status: "ACTIVE",
      date: "2026-12-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Bashar Assad",
      nat: "Syrian",
      role: "Maintenance",
      status: "ACTIVE",
      date: "2026-11-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Steve Irwin",
      nat: "Australia",
      role: "Site Safety",
      status: "EXPIRING SOON",
      date: "2026-04-29",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Sherlock Holmes",
      nat: "UK",
      role: "Investigator",
      status: "ACTIVE",
      date: "2027-03-01",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Hassan Al Banna",
      nat: "Egypt",
      role: "Electrician",
      status: "ACTIVE",
      date: "2026-08-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Michel Aoun",
      nat: "Lebanon",
      role: "Plumber",
      status: "ACTIVE",
      date: "2026-10-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Virat Kohli",
      nat: "India",
      role: "Technician",
      status: "ACTIVE",
      date: "2026-12-30",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Shahid Afridi",
      nat: "Pakistan",
      role: "Mechanic",
      status: "EXPIRING SOON",
      date: "2026-05-04",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Lea Salonga",
      nat: "Philippine",
      role: "Coordinator",
      status: "ACTIVE",
      date: "2026-09-12",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Human Capital Services Company": [
    {
      name: "Abdullah Al Mutairi",
      nat: "Saudi",
      role: "HR Dir",
      status: "ACTIVE",
      date: "2027-02-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Rami Makhlouf",
      nat: "Jordan",
      role: "Recruiter",
      status: "ACTIVE",
      date: "2026-12-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Farouk Al Sharaa",
      nat: "Syrian",
      role: "Payroll",
      status: "ACTIVE",
      date: "2026-11-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Kylie Minogue",
      nat: "Australia",
      role: "Culture",
      status: "ACTIVE",
      date: "2027-01-01",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Winston Churchill",
      nat: "UK",
      role: "Trainer",
      status: "EXPIRING SOON",
      date: "2026-04-26",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Gamal Abdel Nasser",
      nat: "Egypt",
      role: "Relations",
      status: "ACTIVE",
      date: "2026-08-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Rafic Hariri",
      nat: "Lebanon",
      role: "Dev Mgr",
      status: "ACTIVE",
      date: "2026-10-25",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Sachin Tendulkar",
      nat: "India",
      role: "Comp Mgr",
      status: "ACTIVE",
      date: "2026-12-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Imran Khan",
      nat: "Pakistan",
      role: "Specialist",
      status: "EXPIRING SOON",
      date: "2026-05-08",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Pia Wurtzbach",
      nat: "Philippine",
      role: "Recruiter",
      status: "ACTIVE",
      date: "2026-09-20",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Oil & Gas Company": [
    {
      name: "Majed Al Ruwaili",
      nat: "Saudi",
      role: "Rig Mgr",
      status: "ACTIVE",
      date: "2027-03-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Bashar Al Masri",
      nat: "Jordan",
      role: "Drilling",
      status: "ACTIVE",
      date: "2026-12-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Assef Shawkat",
      nat: "Syrian",
      role: "Geologist",
      status: "ACTIVE",
      date: "2026-11-25",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Hugh Jackman",
      nat: "Australia",
      role: "HSE Mgr",
      status: "EXPIRING SOON",
      date: "2026-04-22",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "David Beckham",
      nat: "UK",
      role: "Logistics",
      status: "ACTIVE",
      date: "2027-02-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Anwar Sadat",
      nat: "Egypt",
      role: "Petro Eng",
      status: "ACTIVE",
      date: "2026-08-25",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Nabih Berri",
      nat: "Lebanon",
      role: "Supply",
      status: "ACTIVE",
      date: "2026-10-30",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "MS Dhoni",
      nat: "India",
      role: "Inspector",
      status: "ACTIVE",
      date: "2026-12-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Wasim Akram",
      nat: "Pakistan",
      role: "Operations",
      status: "EXPIRING SOON",
      date: "2026-05-10",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Catriona Gray",
      nat: "Philippine",
      role: "QA/QC",
      status: "ACTIVE",
      date: "2026-09-25",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Hospitality Company": [
    {
      name: "Sami Al Jaber",
      nat: "Saudi",
      role: "GM",
      status: "ACTIVE",
      date: "2027-01-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Fadi Ghandour",
      nat: "Jordan",
      role: "F&B Mgr",
      status: "ACTIVE",
      date: "2026-12-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Walid Muallem",
      nat: "Syrian",
      role: "Chef",
      status: "ACTIVE",
      date: "2026-11-01",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Nicole Kidman",
      nat: "Australia",
      role: "Events",
      status: "EXPIRING SOON",
      date: "2026-04-19",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Adele Atkins",
      nat: "UK",
      role: "Marketing",
      status: "ACTIVE",
      date: "2027-03-10",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Umm Kulthum",
      nat: "Egypt",
      role: "Front Desk",
      status: "ACTIVE",
      date: "2026-08-30",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Fairuz Rahbani",
      nat: "Lebanon",
      role: "Concierge",
      status: "ACTIVE",
      date: "2026-10-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Deepika Padukone",
      nat: "India",
      role: "Housekeeping",
      status: "ACTIVE",
      date: "2026-12-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Mahira Khan",
      nat: "Pakistan",
      role: "Reservation",
      status: "EXPIRING SOON",
      date: "2026-05-03",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Manny Pacquiao",
      nat: "Philippine",
      role: "Security",
      status: "ACTIVE",
      date: "2026-09-10",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Logistics Services Company": [
    {
      name: "Fahad Al-Muwallad",
      nat: "Saudi",
      role: "Log Manager",
      status: "ACTIVE",
      date: "2027-02-15",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Suleiman Al-Nabulsi",
      nat: "Jordan",
      role: "Fleet Dir",
      status: "EXPIRING SOON",
      date: "2026-04-27",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Adnan Al-Atassi",
      nat: "Syrian",
      role: "Route Opt",
      status: "ACTIVE",
      date: "2026-11-18",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Chris Hemsworth",
      nat: "Australia",
      role: "Safety",
      status: "ACTIVE",
      date: "2027-01-22",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Freddie Mercury",
      nat: "UK",
      role: "Procure",
      status: "ACTIVE",
      date: "2027-02-05",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Naguib Mahfouz",
      nat: "Egypt",
      role: "Inventory",
      status: "ACTIVE",
      date: "2026-08-18",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Julia Boutros",
      nat: "Lebanon",
      role: "Admin",
      status: "ACTIVE",
      date: "2026-10-28",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Rohit Sharma",
      nat: "India",
      role: "Supervis",
      status: "ACTIVE",
      date: "2026-12-18",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Misbah-ul-Haq",
      nat: "Pakistan",
      role: "Planner",
      status: "EXPIRING SOON",
      date: "2026-05-09",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Liza Soberano",
      nat: "Philippine",
      role: "Dispatch",
      status: "ACTIVE",
      date: "2026-09-28",
      badge: "bg-[#1E40AF]",
    },
  ],
  "The Engineering & Consulting Firm": [
    {
      name: "Yasir Al-Shahrani",
      nat: "Saudi",
      role: "Snr Partner",
      status: "ACTIVE",
      date: "2027-03-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Wasfi al-Tal",
      nat: "Jordan",
      role: "Design Lead",
      status: "ACTIVE",
      date: "2026-12-12",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Shukri al-Quwatli",
      nat: "Syrian",
      role: "Civil Eng",
      status: "ACTIVE",
      date: "2026-11-22",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Margot Robbie",
      nat: "Australia",
      role: "Consultant",
      status: "EXPIRING SOON",
      date: "2026-04-24",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "David Attenborough",
      nat: "UK",
      role: "Advisor",
      status: "ACTIVE",
      date: "2027-03-12",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Hoda Shaarawi",
      nat: "Egypt",
      role: "Drafting",
      status: "ACTIVE",
      date: "2026-08-12",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Gebran Khalil Gebran",
      nat: "Lebanon",
      role: "Arch Lead",
      status: "ACTIVE",
      date: "2026-10-20",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Shah Rukh Khan",
      nat: "India",
      role: "Struct Eng",
      status: "ACTIVE",
      date: "2026-12-22",
      badge: "bg-[#1E40AF]",
    },
    {
      name: "Junaid Jamshed",
      nat: "Pakistan",
      role: "Project Mgr",
      status: "EXPIRING SOON",
      date: "2026-05-11",
      badge: "bg-[#F43F5E]",
    },
    {
      name: "Megan Young",
      nat: "Philippine",
      role: "Interior",
      status: "ACTIVE",
      date: "2026-09-30",
      badge: "bg-[#1E40AF]",
    },
  ],
};

function DemoApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"entity" | "workforce">("entity");
  const [selectedCompany, setSelectedCompany] = useState(
    "Group Corporate Office",
  );

  const companies = [
    "Group Corporate Office",
    "The Real-Estate Development Company",
    "The Retail Company",
    "The Field Services Company",
    "The Human Capital Services Company",
    "The Oil & Gas Company",
    "The Hospitality Company",
    "The Logistics Services Company",
    "The Engineering & Consulting Firm",
  ];

  const handleUploadSuccess = () => {
    setIsExpanded(false);
  };

  const currentWorkforce =
    workforceMap[selectedCompany] || workforceMap["Group Corporate Office"];

  const stats = [
    { label: "TRADE LICENSES", val: "09", color: "text-emerald-500" },
    {
      label: "MUQEEM (IQAMA)",
      val: "142",
      color: isDarkMode ? "text-white" : "text-slate-900",
    },
    {
      label: "GOSI RECORDS",
      val: "09",
      color: isDarkMode ? "text-white" : "text-slate-900",
    },
    { label: "INSURANCE", val: "04", color: "text-rose-500" },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-500 font-sans ${isDarkMode ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}
    >
      {/* HEADER */}
      <header className="max-w-[1800px] mx-auto px-12 py-10 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/20">
            V
          </div>
          <div>
            <h1
              className={`text-xl font-black tracking-tighter uppercase leading-none transition-colors ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              V-AXIS
            </h1>
            <p className="text-emerald-500/60 text-[9px] font-bold tracking-[0.4em] uppercase font-medium">
              Administrative Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-8 py-2.5 bg-emerald-500 text-white text-[10px] font-bold tracking-[0.2em] rounded-full uppercase shadow-lg shadow-emerald-500/20">
            Export Report
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-bold tracking-[0.2em] rounded-full uppercase shadow-sm"
          >
            {isDarkMode ? "☀️ LIGHT" : "🌙 DARK"}
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-12 pb-24">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-20 gap-16">
          <div className="max-w-xl">
            <h2
              className={`text-[92px] font-black tracking-tighter leading-[0.85] mb-8 transition-colors ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Administrative <br />
              <span className="text-emerald-500 italic">Continuity.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full lg:w-auto">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`p-10 rounded-[2.5rem] border shadow-sm min-w-[280px] transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-emerald-500/10 group ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"}`}
              >
                <p className="text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase mb-6 group-hover:text-emerald-500 transition-colors">
                  {stat.label}
                </p>
                <p
                  className={`text-6xl font-black ${stat.color} transition-transform duration-500 group-hover:scale-110 origin-left`}
                >
                  {stat.val}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* ENTITY VAULT (50%) */}
          <div
            className={`p-10 rounded-[3.5rem] border shadow-xl transition-colors ${isDarkMode ? "bg-slate-900 border-slate-800 shadow-slate-950/40" : "bg-white border-slate-100 shadow-slate-200/40"} min-h-[700px]`}
          >
            <div className="flex justify-between items-center mb-10 px-2">
              <h3
                className={`text-2xl font-black tracking-tighter uppercase italic ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Entity Vault
              </h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all duration-300 ${isExpanded ? "bg-rose-500 rotate-180" : "bg-emerald-500 shadow-emerald-200 shadow-lg"}`}
              >
                {isExpanded ? "−" : "+"}
              </button>
            </div>

            {isExpanded ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div
                  className={`flex p-1 rounded-2xl ${isDarkMode ? "bg-slate-800" : "bg-slate-100/50"}`}
                >
                  {(["entity", "workforce"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex-1 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all ${activeTab === t ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className={`w-full p-5 pr-12 rounded-2xl border text-[11px] font-black uppercase tracking-tight appearance-none cursor-pointer ${isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-100 text-slate-800"}`}
                  >
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
                    ↓
                  </div>
                </div>
                <DocumentUploadContainer
                  activeTab={activeTab}
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <DocumentList selectedCompany={selectedCompany} />
              </div>
            )}
          </div>

          {/* WORKFORCE ASSET PORTAL (50%) */}
          <div
            className={`p-10 rounded-[3.5rem] border shadow-xl transition-colors ${isDarkMode ? "bg-slate-900 border-slate-800 shadow-slate-950/40" : "bg-white border-slate-100 shadow-slate-200/40"} min-h-[700px]`}
          >
            <div className="flex justify-between items-center mb-10">
              <h3
                className={`text-2xl font-black tracking-tighter uppercase italic ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Workforce Asset Portal
              </h3>
              <div className="flex items-center space-x-3 bg-emerald-500/5 px-5 py-2 rounded-full border border-emerald-500/10">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                  Operational Sync
                </span>
              </div>
            </div>

            <div className="space-y-4 max-h-[850px] overflow-y-auto pr-4 custom-scrollbar">
              {(currentWorkforce ?? []).map((person, i) => (
                <div
                  key={i}
                  className={`p-8 rounded-[2.5rem] border flex justify-between items-center transition-all hover:scale-[1.02] ${isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md"}`}
                >
                  <div className="flex items-center space-x-8">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black ${isDarkMode ? "bg-white text-slate-900" : "bg-slate-900 text-white"}`}
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div>
                      <p
                        className={`font-black text-2xl tracking-tight leading-none mb-1 ${isDarkMode ? "text-white" : "text-slate-800"}`}
                      >
                        {person.name}
                      </p>
                      <p className="font-serif text-sm font-black text-emerald-500 uppercase tracking-tight">
                        {person.nat} • {person.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right px-6">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">
                        Iqama Expiry
                      </p>
                      <p
                        className={`font-black text-lg ${isDarkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {person.date}
                      </p>
                    </div>
                    <span
                      className={`px-5 py-2 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg ${person.badge}`}
                    >
                      {person.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-[1800px] mx-auto px-12 py-12 flex justify-center border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-300 tracking-[0.5em] uppercase italic">
          © 2026 V-AXIS | Powered by PAC Technologies
        </p>
      </footer>
    </div>
  );
}

export default DemoApp;
