export type CouncilRole =
  | 'mayor'
  | 'treasurer'
  | 'clerk'
  | 'harbormaster'
  | 'chef'
  | 'lighthouse_keeper'
  | 'sheriff';

export interface CouncilMember {
  id: string;
  name: string;
  role: CouncilRole;
  personality: string;
  avatar: string;
  avatarSpinning: string;
  schedule: OfficeHours[];
}

export interface OfficeHours {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number;
}

export interface CouncilMemberState {
  memberId: string;
  isOnline: boolean;
  currentSessionId: string | null;
  sessionStartedAt: Date | null;
  sessionEndsAt: Date | null;
}
