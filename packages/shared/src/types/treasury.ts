export interface TreasuryState {
  balance: number; // dummy currency
  burnRatePerHour: number;
  lastUpdated: Date;
}

export interface Donation {
  id: string;
  citizenId: string | null; // null for anonymous
  amount: number;
  projectId: string | null; // null for general fund
  createdAt: Date;
}
