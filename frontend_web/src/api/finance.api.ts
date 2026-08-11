import axiosClient from './axiosClient';

export const financeApi = {
  getCodWallet: () => axiosClient.get('/finance/cod-wallet'),
  getPayoutHistory: () => axiosClient.get('/finance/payouts'),
  requestPayout: (amount: number) => axiosClient.post('/finance/payouts/request', { amount }),
};
