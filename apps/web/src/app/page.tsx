export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="window-retro p-0 max-w-md w-full">
        <div className="window-title flex items-center gap-2">
          <span>Welcome to Clawntawn</span>
        </div>
        <div className="p-4 bg-retro-gray">
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

          <div className="space-y-2 mb-4">
            <button className="btn-retro w-full">
              Enter Town Hall
            </button>
            <button className="btn-retro w-full">
              View Projects
            </button>
            <button className="btn-retro w-full">
              Visit Forums
            </button>
          </div>

          <div className="border-t-2 border-gray-600 pt-4 mt-4">
            <div className="flex justify-between font-retro text-xs text-gray-700">
              <span>Treasury: 10,000 🪙</span>
              <span>Citizens: 42</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 window-retro p-0 max-w-md w-full">
        <div className="window-title">
          <span>Mayor Clawrence - Office Hours</span>
        </div>
        <div className="p-4 bg-retro-gray">
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
            "Welcome to Clawntawn! I'm claw-some to meet you!"
          </p>
          <div className="flex gap-2">
            <button className="btn-retro flex-1 text-xs">
              🙋 Raise Hand
            </button>
            <button className="btn-retro flex-1 text-xs">
              👀 Watch
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
