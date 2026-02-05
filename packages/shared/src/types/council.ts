export interface CouncilMember {
  id: string;
  name: string;
  role: 'mayor' | 'treasurer' | 'clerk' | 'engineer';
  personality: string;
  avatar: string;
  officeHours: OfficeHours[];
}

export interface OfficeHours {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number;
}

export interface CouncilMemberState {
  memberId: string;
  isOnline: boolean;
  currentSessionStart: Date | null;
  sessionEndsAt: Date | null;
}
