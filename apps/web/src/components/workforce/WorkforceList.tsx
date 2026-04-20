import { VAxisDocument } from '../../types/document';
import StatusBadge from '../shared/StatusBadge';

interface WorkforceListProps {
  documents: VAxisDocument[];
}

export default function WorkforceList({ documents }: WorkforceListProps) {
  const workforceDocs = documents.filter(doc => doc.category === 'WORKFORCE');

  /**
   * SOVEREIGN BRIDGE: Converts internal V-AXIS URIs to browser-ready HTTP URLs
   */
  const getPublicUrl = (internalUrl: string) => {
    if (!internalUrl) return '#';
    // Replaces internal protocol with the actual API Vault route
    return internalUrl.replace('vaxis://vault/', 'http://localhost:3000/vault/');
  };

  return (
    <div className="space-y-4">
      {workforceDocs.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-30">
          <p className="text-[10px] font-black uppercase tracking-widest">No Personnel Assets Indexed</p>
        </div>
      ) : (
        workforceDocs.map((doc) => (
          <div 
            key={doc.id} 
            className="group flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/50 transition-all duration-300"
          >
            {/* Personnel Identity Block */}
            <div className="flex items-center space-x-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center font-bold text-emerald-500 border border-white/10 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all">
                {doc.personName?.charAt(0) || 'U'}
              </div>
              <div>
                <h4 className="font-bold text-lg tracking-tight">{doc.personName}</h4>
                <div className="flex items-center space-x-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-emerald-500">{doc.type}</p>
                  <span className="text-[10px] opacity-20">•</span>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{doc.entityName}</p>
                </div>
              </div>
            </div>

            {/* Asset Intelligence Block */}
            <div className="flex items-center space-x-6">
              <div className="hidden md:block text-right mr-4">
                <p className="text-[9px] font-black uppercase opacity-30 tracking-tighter">Expiry Date</p>
                <p className="text-xs font-bold font-mono">{doc.expiryDate}</p>
              </div>
              
              <StatusBadge color={doc.status === 'ACTIVE' ? 'COMPLIANT' : 'CRITICAL'}>
                {doc.status.replace('_', ' ')}
              </StatusBadge>

              {/* ACTION: View Document - This is where the bridge is applied */}
              <a 
                href={getPublicUrl(doc.fileUrl)} 
                target="_blank" 
                rel="noreferrer"
                className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
                title="View Sovereign Asset"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}