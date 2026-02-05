'use client';

import { useState } from 'react';
import { TownView, Building } from '@/components/town';
import { Dialog } from '@/components/ui';

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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-lobster-red rounded flex items-center justify-center text-2xl">
            🦞
          </div>
          <div>
            <p className="font-retro text-sm font-bold">Mayor Clawrence</p>
            <p className="font-retro text-xs text-green-700">● Online</p>
          </div>
        </div>

        <p className="font-retro text-xs text-gray-600 mb-3">
          &quot;Welcome to Clawntawn! I&apos;m claw-some to meet you!&quot;
        </p>

        <div className="border-t border-gray-400 pt-3 mt-3">
          <p className="font-retro text-xs text-gray-500 mb-2">Office Hours Queue</p>
          <p className="font-retro text-xs text-gray-600 mb-3">
            0 citizens waiting • Next turn available now!
          </p>
        </div>

        <div className="flex gap-2">
          <button className="btn-retro flex-1 text-xs">
            🙋 Raise Hand
          </button>
          <button className="btn-retro flex-1 text-xs">
            👀 Watch
          </button>
        </div>
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
        <p className="font-retro text-xs text-gray-600 mb-4">
          View and vote on town projects proposed by the council.
        </p>

        <div className="space-y-2 mb-4">
          <div className="bg-white p-2 rounded border">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-retro text-xs font-bold">🏗️ Build a Pier</p>
                <p className="font-retro text-xs text-gray-500">Voting: 3 days left</p>
              </div>
              <span className="text-xs bg-yellow-200 px-1 rounded">Active</span>
            </div>
          </div>
        </div>

        <p className="font-retro text-xs text-gray-500 text-center">
          Treasury: 10,000 🪙
        </p>
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
