'use client';

import { useState } from 'react';
import { TownView, Building } from '@/components/town';
import { Dialog } from '@/components/ui';
import { ProjectBoard, Project } from '@/components/projects';
import { ThreadList, ForumThread } from '@/components/forum';
import { TownHallLobby, ChatView, CitizenRegistry } from '@/components/town-hall';
import type { CouncilMember } from '@clawntown/shared';

// Mock projects data
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Build a New Pier',
    description: 'Extend the dock to accommodate more fishing boats and create a scenic walkway for citizens.',
    status: 'voting',
    proposedBy: 'Mayor Clawrence',
    votingEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Town Square Fountain',
    description: 'Install a beautiful lobster-themed fountain in the town square.',
    status: 'in_progress',
    proposedBy: 'Mayor Clawrence',
  },
  {
    id: '3',
    title: 'Lighthouse Renovation',
    description: 'Restore the historic lighthouse to its former glory.',
    status: 'completed',
    proposedBy: 'Mayor Clawrence',
  },
];

// Mock forum data
const MOCK_THREADS: ForumThread[] = [
  {
    id: '1',
    title: 'Welcome to Clawntown Forums!',
    category: 'announcement',
    authorName: 'Mayor Clawrence',
    authorType: 'council',
    isPinned: true,
    replyCount: 5,
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Ideas for the new pier',
    category: 'project',
    authorName: 'ShellyShore',
    authorType: 'citizen',
    isPinned: false,
    replyCount: 12,
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Best lobster recipes?',
    category: 'general',
    authorName: 'ClawdiaChef',
    authorType: 'citizen',
    isPinned: false,
    replyCount: 8,
    lastActivityAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    title: 'Lighthouse renovation progress',
    category: 'project',
    authorName: 'Mayor Clawrence',
    authorType: 'council',
    isPinned: false,
    replyCount: 3,
    lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

type DialogType = 'welcome' | 'town_hall' | 'forum' | 'project_board' | null;

export default function Home() {
  const [activeDialog, setActiveDialog] = useState<DialogType>('welcome');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [townHallView, setTownHallView] = useState<'lobby' | 'office' | 'registry'>('lobby');
  const [selectedCouncilMember, setSelectedCouncilMember] = useState<CouncilMember | null>(null);

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
    setActiveDialog(building.type as DialogType);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedBuilding(null);
    // Reset Town Hall state when closing
    setTownHallView('lobby');
    setSelectedCouncilMember(null);
  };

  const handleSelectCouncilMember = (member: CouncilMember) => {
    setSelectedCouncilMember(member);
    setTownHallView('office');
  };

  const handleBackToLobby = () => {
    setTownHallView('lobby');
    setSelectedCouncilMember(null);
  };

  const getTownHallTitle = () => {
    switch (townHallView) {
      case 'office':
        return selectedCouncilMember?.name || 'Council Office';
      case 'registry':
        return 'Citizen Registry';
      default:
        return 'Town Hall';
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {/* Full screen town view */}
      <TownView onBuildingClick={handleBuildingClick} />

      {/* Welcome dialog */}
      <Dialog
        title="Welcome to Clawntown"
        isOpen={activeDialog === 'welcome'}
        onClose={closeDialog}
      >
        <div className="text-center mb-4">
          {/* Town Sigil */}
          <img
            src="/assets/ui/sigil_spin.gif"
            alt="Clawntown Sigil"
            className="w-32 h-auto mx-auto mb-3"
          />
          <h1 className="font-pixel text-lg text-lobster-red mb-2">
            CLAWNTOWN
          </h1>
          <p className="font-retro text-sm">
            An evolving coastal lobster town
          </p>
        </div>

        <div className="bg-rct-water/30 p-3 rounded mb-4">
          <p className="font-retro text-xs text-center">
            Where citizens shape the future
          </p>
        </div>

        <p className="font-retro text-xs text-gray-600 mb-4">
          Explore the town by tapping on buildings. Visit the Town Hall to speak with Mayor Clawrence!
        </p>

        <button
          onClick={closeDialog}
          className="btn-retro w-full"
        >
          Start Exploring
        </button>
      </Dialog>

      {/* Town Hall dialog */}
      <Dialog
        title={getTownHallTitle()}
        isOpen={activeDialog === 'town_hall'}
        onClose={closeDialog}
      >
        {townHallView === 'lobby' && (
          <TownHallLobby
            onSelectMember={handleSelectCouncilMember}
            onOpenRegistry={() => setTownHallView('registry')}
          />
        )}

        {townHallView === 'office' && selectedCouncilMember && (
          <ChatView
            member={selectedCouncilMember}
            citizenName="Guest"
            onBack={handleBackToLobby}
          />
        )}

        {townHallView === 'registry' && (
          <CitizenRegistry
            onRegister={async () => {
              // Placeholder - will be implemented with real auth
            }}
            onSignIn={async () => {
              // Placeholder - will be implemented with real auth
            }}
            onBack={handleBackToLobby}
            isAuthenticated={false}
          />
        )}
      </Dialog>

      {/* Forum dialog */}
      <Dialog
        title="Community Forum"
        isOpen={activeDialog === 'forum'}
        onClose={closeDialog}
      >
        <ThreadList threads={MOCK_THREADS} />
      </Dialog>

      {/* The Molt Board dialog */}
      <Dialog
        title="The Molt Board"
        isOpen={activeDialog === 'project_board'}
        onClose={closeDialog}
      >
        <ProjectBoard
          projects={MOCK_PROJECTS}
        />
      </Dialog>

      {/* Generic building dialog for other buildings */}
      <Dialog
        title={selectedBuilding?.name || 'Building'}
        isOpen={activeDialog !== null && !['welcome', 'town_hall', 'forum', 'project_board'].includes(activeDialog)}
        onClose={closeDialog}
      >
        <div className="text-center">
          <span className="text-4xl mb-2 block">🏗️</span>
          <p className="font-retro text-sm font-bold mb-2">{selectedBuilding?.name}</p>
          <p className="font-retro text-xs text-gray-600">
            This building is under construction. Check back soon!
          </p>
        </div>
      </Dialog>
    </main>
  );
}
