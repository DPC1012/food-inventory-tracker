
export const computeStatus = (expiryDate: Date): 'fresh' | 'expiring-soon' | 'expired' => {
    const now = new Date();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const diff = expiryDate.getTime() - now.getTime();
    if(diff < 0) return 'expired';
    if(diff <= threeDays)return 'expiring-soon';
    return 'fresh';
}