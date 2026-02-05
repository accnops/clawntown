'use client';

import { useState } from 'react';
import { TownView, Building } from '@/components/town';
import { Dialog } from '@/components/ui';
import { ConversationView } from '@/components/council';
import { ProjectBoard, Project } from '@/components/projects';

// Mock projects data
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Build a New Pier',
    description: 'Extend the dock to accommodate more fishing boats and create a scenic walkway for citizens.',
    status: 'voting',
    proposedBy: 'Mayor Clawrence',
    supportVotes: 15,
    opposeVotes: 3,
    supportBribes: 500,
    opposeBribes: 100,
    votingEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Town Square Fountain',
    description: 'Install a beautiful lobster-themed fountain in the town square.',
    status: 'in_progress',
    proposedBy: 'Mayor Clawrence',
    supportVotes: 22,
    opposeVotes: 5,
    supportBribes: 0,
    opposeBribes: 0,
  },
  {
    id: '3',
    title: 'Lighthouse Renovation',
    description: 'Restore the historic lighthouse to its former glory.',
    status: 'completed',
    proposedBy: 'Mayor Clawrence',
    supportVotes: 30,
    opposeVotes: 2,
    supportBribes: 200,
    opposeBribes: 0,
  },
];

type DialogType = 'welcome' | 'town_hall' | 'forum' | 'project_board' | null;

export default function Home() {
  const [activeDialog, setActiveDialog] = useState<DialogType>('welcome');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const handleBuildingClick = (building: Building) => {
    setSelectedBuilding(building);
    setActiveDialog(building.type as DialogType);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedBuilding(null);
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {/* Full screen town view */}
      <TownView onBuildingClick={handleBuildingClick} />

      {/* Welcome dialog */}
      <Dialog
        title="Welcome to Clawntawn"
        isOpen={activeDialog === 'welcome'}
        onClose={closeDialog}
      >
        <div className="text-center mb-4">
          <h1 className="font-pixel text-lg text-lobster-red mb-2">
            CLAWNTAWN
          </h1>
          <p className="font-retro text-sm">
            A coastal lobster town that evolves itself
          </p>
        </div>

        <div className="bg-rct-water/30 p-3 rounded mb-4">
          <p className="font-retro text-xs text-center">
            🦞 Where citizens shape the future 🦞
          </p>
        </div>

        <p className="font-retro text-xs text-gray-600 mb-4">
          Explore the town by tapping on buildings. Visit Town Hall to speak with Mayor Clawrence!
        </p>

        <button
          onClick={closeDialog}
          className="btn-retro w-full"
        >
          Explore Town
        </button>
      </Dialog>

      {/* Town Hall dialog */}
      <Dialog
        title="Town Hall - Mayor Clawrence"
        isOpen={activeDialog === 'town_hall'}
        onClose={closeDialog}
      >
        <ConversationView
          memberName="Mayor Clawrence"
          memberEmoji="🦞"
          isOnline={true}
          greeting="Welcome to Clawntawn! I'm claw-some to meet you! Step right up if you have ideas for our wonderful coastal community!"
          isMyTurn={false}
          queuePosition={undefined}
        />
      </Dialog>

      {/* Forum dialog */}
      <Dialog
        title="Community Forum"
        isOpen={activeDialog === 'forum'}
        onClose={closeDialog}
      >
        <p className="font-retro text-xs text-gray-600 mb-4">
          Discuss ideas and projects with fellow citizens.
        </p>

        <div className="space-y-2 mb-4">
          <div className="bg-white p-2 rounded border">
            <p className="font-retro text-xs font-bold">📌 Welcome Thread</p>
            <p className="font-retro text-xs text-gray-500">by Mayor Clawrence</p>
          </div>
          <div className="bg-white p-2 rounded border">
            <p className="font-retro text-xs font-bold">Ideas for the dock</p>
            <p className="font-retro text-xs text-gray-500">3 replies</p>
          </div>
        </div>

        <button className="btn-retro w-full text-xs">
          ✏️ New Thread
        </button>
      </Dialog>

      {/* Project Board dialog */}
      <Dialog
        title="Project Board"
        isOpen={activeDialog === 'project_board'}
        onClose={closeDialog}
      >
        <ProjectBoard
          projects={MOCK_PROJECTS}
          treasuryBalance={10000}
        />
      </Dialog>

      {/* Generic building dialog for other buildings */}
      <Dialog
        title={selectedBuilding?.name || 'Building'}
        isOpen={activeDialog !== null && !['welcome', 'town_hall', 'forum', 'project_board'].includes(activeDialog)}
        onClose={closeDialog}
      >
        <div className="text-center">
          <span className="text-4xl mb-2 block">{selectedBuilding?.emoji}</span>
          <p className="font-retro text-sm font-bold mb-2">{selectedBuilding?.name}</p>
          <p className="font-retro text-xs text-gray-600">
            This building is under construction. Check back soon!
          </p>
        </div>
      </Dialog>
    </main>
  );
}
