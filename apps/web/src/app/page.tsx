'use client';

import { useState, useEffect } from 'react';
import { TownView, Building } from '@/components/town';
import { Dialog, Sparkline } from '@/components/ui';
import { ProjectBoard } from '@/components/projects';
import { GitHubDiscussions } from '@/components/forum';
import { TownHallLobby, CouncilOfficeView, CitizenRegistry } from '@/components/town-hall';
import { ClawMachine } from '@/components/arcade';
import { useStats, useTrackVisit, useAuth } from '@/hooks';
import type { CouncilMember } from '@clawntown/shared';

type DialogType = 'welcome' | 'town_hall' | 'forum' | 'project_board' | 'notice_board' | 'lighthouse' | 'arcade' | null;

export default function Home() {
  const [activeDialog, setActiveDialog] = useState<DialogType>('welcome');

  // Check if user just authenticated - open town hall instead of welcome
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === 'citizen') {
      setActiveDialog('town_hall');
      // Clean URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, []);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [townHallView, setTownHallView] = useState<'lobby' | 'office' | 'registry'>('lobby');
  const [selectedCouncilMember, setSelectedCouncilMember] = useState<CouncilMember | null>(null);

  // Track visitor and fetch stats
  useTrackVisit();
  const stats = useStats();
  const { isAuthenticated, profile, sendMagicLink, signOut, isLoading: authLoading } = useAuth();

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
      <TownView onBuildingClick={handleBuildingClick} population={stats.citizens} />

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
          <h1 className="font-pixel text-lg text-shell-red mb-2">
            CLAWNTOWN
          </h1>
          <p className="font-retro text-sm">
            An evolving coastal crustacean town
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
            isAuthenticated={isAuthenticated}
            citizenName={profile?.name}
            onSignOut={signOut}
          />
        )}

        {townHallView === 'office' && selectedCouncilMember && (
          <CouncilOfficeView
            member={selectedCouncilMember}
            profile={profile}
            isAuthenticated={isAuthenticated}
            onBack={handleBackToLobby}
            onShowRegistry={() => setTownHallView('registry')}
          />
        )}

        {townHallView === 'registry' && (
          <CitizenRegistry
            onSendMagicLink={async (email, name, avatarId) => {
              return sendMagicLink(email, name && avatarId ? { name, avatarId } : undefined);
            }}
            onBack={handleBackToLobby}
          />
        )}
      </Dialog>

      {/* Forum dialog - GitHub Discussions */}
      <Dialog
        title="Community Forum"
        isOpen={activeDialog === 'forum'}
        onClose={closeDialog}
      >
        <GitHubDiscussions />
      </Dialog>

      {/* Molt Center dialog */}
      <Dialog
        title="Molt Center"
        isOpen={activeDialog === 'project_board'}
        onClose={closeDialog}
      >
        <div className="space-y-4">
          {/* Intro section */}
          <div className="p-3 bg-shell-red text-white border-2 border-red-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🦀</span>
              <div>
                <h3 className="font-retro text-sm font-bold">Molt Center</h3>
                <p className="font-retro text-[10px] opacity-90">Every molt makes us stronger</p>
              </div>
            </div>
            <p className="font-retro text-[10px] opacity-90 leading-relaxed">
              Just as crustaceans shed their shells to grow, Clawntown evolves through the ideas of its citizens.
              Here you'll find proposals to improve our town — from new buildings to community events —
              shaped by residents and approved by the elected council.
            </p>
          </div>

          <ProjectBoard />
        </div>
      </Dialog>

      {/* Shell-tin Board / Notice Board dialog */}
      <Dialog
        title="Shell-tin Board"
        isOpen={activeDialog === 'notice_board'}
        onClose={closeDialog}
      >
        <div className="space-y-4">
          <div className="text-center">
            <p className="font-retro text-sm text-gray-700 mb-4">
              Stay connected with Clawntown! Follow us for news, events, and community updates.
            </p>
          </div>

          <div className="space-y-2">
            <a
              href="#"
              className="btn-retro w-full flex items-center justify-center gap-2 text-sm"
              onClick={(e) => e.preventDefault()}
            >
              <span>𝕏</span>
              Follow on X (Twitter)
            </a>
            <a
              href="#"
              className="btn-retro w-full flex items-center justify-center gap-2 text-sm"
              onClick={(e) => e.preventDefault()}
            >
              <span>📸</span>
              Follow on Instagram
            </a>
            <a
              href="#"
              className="btn-retro w-full flex items-center justify-center gap-2 text-sm"
              onClick={(e) => e.preventDefault()}
            >
              <span>💬</span>
              Join WhatsApp Community
            </a>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-4">
            <p className="font-retro text-xs text-amber-800 text-center">
              Social links coming soon! The town crier is still setting up the megaphone.
            </p>
          </div>
        </div>
      </Dialog>

      {/* Lighthouse dialog */}
      <Dialog
        title="The Lighthouse"
        isOpen={activeDialog === 'lighthouse'}
        onClose={closeDialog}
        bodyClassName="bg-indigo-950 p-4 overflow-y-auto flex-1"
      >
        <p className="font-retro text-xs text-indigo-200 text-center mb-4">
          🔭 Tracking the stars of Clawntown
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-900/50 rounded p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <p className={`font-pixel text-2xl text-yellow-300 ${stats.loading ? 'animate-pulse' : ''}`}>
                {stats.github?.contributors ?? '--'}
              </p>
              {stats.history.length > 1 && (
                <Sparkline
                  data={stats.history.map(h => h.contributors)}
                  color="#fde047"
                />
              )}
            </div>
            <p className="font-retro text-xs text-indigo-300">Contributors</p>
          </div>
          <div className="bg-indigo-900/50 rounded p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <p className={`font-pixel text-2xl text-green-300 ${stats.loading ? 'animate-pulse' : ''}`}>
                {stats.github?.pullRequests ?? '--'}
              </p>
              {stats.history.length > 1 && (
                <Sparkline
                  data={stats.history.map(h => h.pullRequests)}
                  color="#86efac"
                />
              )}
            </div>
            <p className="font-retro text-xs text-indigo-300">Pull Requests</p>
          </div>
          <div className="bg-indigo-900/50 rounded p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <p className={`font-pixel text-2xl text-blue-300 ${stats.loading ? 'animate-pulse' : ''}`}>
                {stats.github?.commits ?? '--'}
              </p>
              {stats.history.length > 1 && (
                <Sparkline
                  data={stats.history.map(h => h.commits)}
                  color="#93c5fd"
                />
              )}
            </div>
            <p className="font-retro text-xs text-indigo-300">Commits</p>
          </div>
          <div className="bg-indigo-900/50 rounded p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <p className={`font-pixel text-2xl text-pink-300 ${stats.loading ? 'animate-pulse' : ''}`}>
                {stats.visitors ?? '--'}
              </p>
              {stats.history.length > 1 && (
                <Sparkline
                  data={stats.history.map(h => h.visitors)}
                  color="#f9a8d4"
                />
              )}
            </div>
            <p className="font-retro text-xs text-indigo-300">Visitors</p>
          </div>
        </div>

        {/* Population */}
        <div className="mt-3 bg-indigo-900/50 rounded p-3 text-center">
          <p className={`font-pixel text-2xl text-orange-300 ${stats.loading ? 'animate-pulse' : ''}`}>
            {stats.citizens ?? '--'}
          </p>
          <p className="font-retro text-xs text-indigo-300">Population</p>
        </div>

        {/* GitHub Stars */}
        {stats.github?.stars !== undefined && stats.github.stars > 0 && (
          <div className="mt-4 text-center">
            <span className="font-retro text-xs text-yellow-400">
              ⭐ {stats.github.stars} GitHub Stars
            </span>
          </div>
        )}

        <p className="font-retro text-xs text-indigo-300 text-center mt-4">
          From the lighthouse, we watch over all of Clawntown's activity.
        </p>
      </Dialog>

      {/* Arcade dialog */}
      <Dialog
        title="Claw'd Nine"
        isOpen={activeDialog === 'arcade'}
        onClose={closeDialog}
        bodyClassName="bg-purple-950 p-4 overflow-hidden"
      >
        <ClawMachine />
      </Dialog>

      {/* Generic building dialog for other buildings */}
      <Dialog
        title={selectedBuilding?.name || 'Building'}
        isOpen={activeDialog !== null && !['welcome', 'town_hall', 'forum', 'project_board', 'notice_board', 'lighthouse', 'arcade'].includes(activeDialog)}
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
