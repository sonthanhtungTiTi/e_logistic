export interface CodWallet {
  sellerId: string;
  totalCollectedCod: number;
  availableBalance: number;
  pendingPayout: number;
  lastPayoutDate?: string;
}

export interface PayoutTransaction {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}
