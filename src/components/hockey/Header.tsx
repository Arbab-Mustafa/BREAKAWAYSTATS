"use client";

export const Header = () => (
  <header className="bg-black py-7 border-b border-zinc-800/50">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">
            BREAKAWAY<span className="text-emerald-500">STATS</span>
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-emerald-500/50" />
            <p className="text-sm font-medium text-zinc-300 tracking-wider">
              TRACK ACTIVE PLAYER STREAKS FOR SMARTER BETTING
            </p>
            <div className="h-px w-8 bg-emerald-500/50" />
          </div>
        </div>
      </div>
    </div>
  </header>
);