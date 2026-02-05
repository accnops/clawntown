export interface Citizen {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  avatar: string; // URL to pixel art avatar
  createdAt: Date;
}

export interface CitizenPublic {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  avatar: string;
}
