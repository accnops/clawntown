export interface Citizen {
  id: string;
  name: string;
  avatar: string;
  email: string;
  lastCaptchaAt: Date | null;
  violationCount: number;
  bannedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitizenPublic {
  id: string;
  name: string;
  avatar: string;
}

export interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  bannedUntil: Date | null;
}
