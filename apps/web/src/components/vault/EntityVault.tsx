import { VAxisDocument } from '../../types/document';
import StatusBadge from '../shared/StatusBadge';

interface EntityVaultProps {
  documents: VAxisDocument[];
}

export default function EntityVault({ documents }: EntityVaultProps) {
  const entityDocs = documents.filter(doc => doc.category === 'ENTITY');

  return (
    <div className="space-y-3">
      {entityDocs.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
          No Entity Assets Found
        </div>
      ) : (
        entityDocs.map((doc) => (
          <div key={doc.id} className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">{doc.type}</h4>
                  <p className="text-[10px] font-bold opacity-50 tracking-wider">{doc.entityName}</p>
                </div>
              </div>
              <StatusBadge color={doc.status === 'ACTIVE' ? 'COMPLIANT' : 'CRITICAL'} className="scale-75 origin-right">
                {doc.status.replace('_', ' ')}
              </StatusBadge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}