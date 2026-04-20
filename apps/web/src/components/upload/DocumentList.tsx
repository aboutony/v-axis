// apps/web/src/components/upload/DocumentList.tsx

import React from 'react';

interface DocumentListProps {
  selectedCompany: string;
}

const useCaseMap: Record<string, any[]> = {
  "Group Corporate Office": [
    { name: 'COMMERCIAL REGISTRATION', sub: 'HQ-MAIN-01', expiry: '2026-05-12', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🏢' },
    { name: 'ZATCA VAT CERTIFICATE', sub: 'TAX-GROUP-A1', expiry: '2026-12-31', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '🏛️' }
  ],
  "The Real-Estate Development Company": [
    { name: 'BUILDING PERMIT', sub: 'PROJECT-NEOM-X', expiry: '2026-04-20', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🏗️' },
    { name: 'CIVIL DEFENSE CERT.', sub: 'SAFETY-RES-04', expiry: '2026-11-15', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '🔥' }
  ],
  "The Retail Company": [
    { name: 'BALADIYA LICENSE', sub: 'STORE-RIYADH-09', expiry: '2026-04-18', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🛍️' },
    { name: 'HEALTH PERMIT', sub: 'FOOD-SAFETY-QX', expiry: '2026-10-05', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '🍎' }
  ],
  "The Field Services Company": [
    { name: 'COC CERTIFICATION', sub: 'CHAMBER-SVC-88', expiry: '2026-05-02', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🛠️' },
    { name: 'WORK SITE SAFETY', sub: 'OSHA-SA-2026', expiry: '2027-02-14', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '👷' }
  ],
  "The Human Capital Services Company": [
    { name: 'GOSI COMPLIANCE', sub: 'HR-AUDIT-2026', expiry: '2026-04-30', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '👥' },
    { name: 'WPS AUDIT REPORT', sub: 'WAGE-PROT-01', expiry: '2026-09-12', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '💰' }
  ],
  "The Oil & Gas Company": [
    { name: 'ARAMCO VENDOR AUTH', sub: 'OG-SUPPLY-99', expiry: '2026-05-01', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '⛽' },
    { name: 'ISO 14001 ENV', sub: 'CERT-ENV-OIL', expiry: '2027-01-10', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '🌍' }
  ],
  "The Hospitality Company": [
    { name: 'TOURISM LICENSE', sub: 'HOTEL-RYD-VIP', expiry: '2026-04-22', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🏨' },
    { name: 'BALADIYA HEALTH', sub: 'KITCHEN-HYG-01', expiry: '2026-08-19', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '🍴' }
  ],
  "The Logistics Services Company": [
    { name: 'TGA OPERATING LICENSE', sub: 'LOG-FLEET-SA', expiry: '2026-04-25', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '🚛' },
    { name: 'CUSTOMS CLEARANCE', sub: 'PORT-JED-02', expiry: '2026-09-30', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '📦' }
  ],
  "The Engineering & Consulting Firm": [
    { name: 'SCE LICENSE', sub: 'COUNCIL-ENG-04', expiry: '2026-05-05', status: 'EXPIRING SOON', statusColor: 'bg-[#F43F5E] text-white', icon: '📐' },
    { name: 'LIABILITY INSURANCE', sub: 'INS-PROF-772', expiry: '2026-11-20', status: 'ACTIVE', statusColor: 'bg-[#1E40AF] text-white', icon: '📄' }
  ]
};

export const DocumentList: React.FC<DocumentListProps> = ({ selectedCompany }) => {
  // Select the specific use case based on company or fallback to Corporate
  const assets = useCaseMap[selectedCompany] || useCaseMap["Group Corporate Office"];

  return (
    <div className="space-y-12 py-4">
      {assets.map((asset, i) => (
        <div key={i} className="group">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-6">
              {/* Soft-Mint Icon Base with Industry Icons */}
              <div className="w-14 h-14 bg-[#ECFDF5] rounded-2xl flex items-center justify-center text-xl">
                {asset.icon}
              </div>
              <div>
                <h4 className="font-serif text-2xl font-black tracking-tight text-[#0F172A]">
                  {asset.name}
                </h4>
                <p className="text-slate-400 text-sm font-bold tracking-tight">
                  {asset.sub}
                </p>
              </div>
            </div>
            {/* High-Contrast Alert Badge */}
            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-sm ${asset.statusColor}`}>
              {asset.status}
            </span>
          </div>

          <div className="flex justify-between items-center pl-20">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Expires:</span>
              <span className="text-[11px] font-black text-slate-500 tracking-wider">{asset.expiry}</span>
            </div>
            <button className="text-[11px] font-black text-[#10B981] uppercase tracking-[0.2em] hover:underline">
              View Copy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};