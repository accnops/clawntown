export interface CitizenAvatar {
  id: string;
  src: string;
  srcSpinning: string;
  species: 'lobster' | 'crab';
}

// 16 citizen avatars: 8 lobsters + 8 crabs (displayed in 4x4 grid, alternating rows)
export const CITIZEN_AVATARS: CitizenAvatar[] = [
  // Row 1: Lobsters 1-4
  { id: 'citizen_01', src: '/assets/citizens/citizen_01.png', srcSpinning: '/assets/citizens/citizen_01_spin.gif', species: 'lobster' },
  { id: 'citizen_02', src: '/assets/citizens/citizen_02.png', srcSpinning: '/assets/citizens/citizen_02_spin.gif', species: 'lobster' },
  { id: 'citizen_03', src: '/assets/citizens/citizen_03.png', srcSpinning: '/assets/citizens/citizen_03_spin.gif', species: 'lobster' },
  { id: 'citizen_04', src: '/assets/citizens/citizen_04.png', srcSpinning: '/assets/citizens/citizen_04_spin.gif', species: 'lobster' },
  // Row 2: Crabs 1-4
  { id: 'citizen_crab_01', src: '/assets/citizens/citizen_crab_01.png', srcSpinning: '/assets/citizens/citizen_crab_01_spin.gif', species: 'crab' },
  { id: 'citizen_crab_02', src: '/assets/citizens/citizen_crab_02.png', srcSpinning: '/assets/citizens/citizen_crab_02_spin.gif', species: 'crab' },
  { id: 'citizen_crab_03', src: '/assets/citizens/citizen_crab_03.png', srcSpinning: '/assets/citizens/citizen_crab_03_spin.gif', species: 'crab' },
  { id: 'citizen_crab_04', src: '/assets/citizens/citizen_crab_04.png', srcSpinning: '/assets/citizens/citizen_crab_04_spin.gif', species: 'crab' },
  // Row 3: Lobsters 5-8
  { id: 'citizen_05', src: '/assets/citizens/citizen_05.png', srcSpinning: '/assets/citizens/citizen_05_spin.gif', species: 'lobster' },
  { id: 'citizen_06', src: '/assets/citizens/citizen_06.png', srcSpinning: '/assets/citizens/citizen_06_spin.gif', species: 'lobster' },
  { id: 'citizen_07', src: '/assets/citizens/citizen_07.png', srcSpinning: '/assets/citizens/citizen_07_spin.gif', species: 'lobster' },
  { id: 'citizen_08', src: '/assets/citizens/citizen_08.png', srcSpinning: '/assets/citizens/citizen_08_spin.gif', species: 'lobster' },
  // Row 4: Crabs 5-8
  { id: 'citizen_crab_05', src: '/assets/citizens/citizen_crab_05.png', srcSpinning: '/assets/citizens/citizen_crab_05_spin.gif', species: 'crab' },
  { id: 'citizen_crab_06', src: '/assets/citizens/citizen_crab_06.png', srcSpinning: '/assets/citizens/citizen_crab_06_spin.gif', species: 'crab' },
  { id: 'citizen_crab_07', src: '/assets/citizens/citizen_crab_07.png', srcSpinning: '/assets/citizens/citizen_crab_07_spin.gif', species: 'crab' },
  { id: 'citizen_crab_08', src: '/assets/citizens/citizen_crab_08.png', srcSpinning: '/assets/citizens/citizen_crab_08_spin.gif', species: 'crab' },
];
