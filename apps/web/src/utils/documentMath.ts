// apps/web/src/utils/documentMath.ts

export const calculateDocStatus = (expiryDate: string) => {
  const daysRemaining = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  
  if (daysRemaining <= 0) return 'EXPIRED';
  if (daysRemaining <= 30) return 'EXPIRING_SOON'; // The "Warning" threshold
  return 'ACTIVE';
};