"use client";

import { Button } from "@/components/ui/button";
import { Star, TrendingUp } from "lucide-react";
import { useTransition } from "react";

interface PlayerCardProps {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    teamAbbrev: string;
    position: string;
    streak_length?: number;
    total_goals: number;
    total_assists: number;
    total_points: number;
    total_shots: number;
    avg_toi: string;
    goal_odds?: number;
    point_odds?: number;
    next_game?: {
      opponent: string;
      is_today: boolean;
      date: string;
      is_home: boolean;
      time: string;
      startTimeUTC: string;
    };
  };
  isFavorite: boolean;
  activeFilter: "goalStreak" | "assistStreak" | "pointStreak" | "last3" | "last5" | "last10" | null;
  onToggleFavoriteAction: (id: string) => Promise<void>;
  onCardClickAction: () => Promise<void>;
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex flex-col items-center w-14 text-center">
    <span className="text-base font-medium text-white">{value}</span>
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

const OddsStat = ({ label, odds }: { label: string; odds: string }) => (
  <div className="flex flex-col items-center w-14 text-center">
    <span className={`text-base font-medium ${odds.startsWith("+") ? "text-emerald-500" : "text-red-500"}`}>
      {odds}
    </span>
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

const GameInfo = ({ nextGame }: { nextGame?: PlayerCardProps['player']['next_game'] }) => {
  if (!nextGame) {
    return (
      <div className="flex flex-col items-center w-28 text-center">
        <span className="text-base font-medium text-zinc-400">No Games</span>
        <span className="text-xs text-zinc-500">Scheduled</span>
      </div>
    );
  }

  const gameText = nextGame.is_home ? 
    `vs ${nextGame.opponent}` : 
    `@ ${nextGame.opponent}`;

  return (
    <div className="flex flex-col items-center w-28 text-center">
      <span className="text-base font-medium text-white">{gameText}</span>
      <span className="text-xs text-zinc-500">
        {nextGame.is_today ? `Today ${nextGame.time}` : `${nextGame.date} ${nextGame.time}`}
      </span>
    </div>
  );
};

export const PlayerCard = ({ player, isFavorite, activeFilter, onToggleFavoriteAction, onCardClickAction }: PlayerCardProps) => {
  const [isPending, startTransition] = useTransition();
  
  const toAmericanOdds = (decimal: number) => {
    if (decimal >= 2) {
      return `+${Math.round((decimal - 1) * 100)}`;
    }
    return `-${Math.round(100 / (decimal - 1))}`;
  };

  const getStreakText = () => {
    if (!player.streak_length) return null;
    
    switch (activeFilter) {
      case "goalStreak":
        return `${player.streak_length} Game Goal Streak`;
      case "assistStreak":
        return `${player.streak_length} Game Assist Streak`;
      case "pointStreak":
        return `${player.streak_length} Game Point Streak`;
      case "last3":
        return `Last 3 Games`;
      case "last5":
        return `Last 5 Games`;
      case "last10":
        return `Last 10 Games`;
      default:
        return null;
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(() => {
      onToggleFavoriteAction(player.id);
    });
  };

  const handleCardClick = () => {
    startTransition(() => {
      onCardClickAction();
    });
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer rounded-lg max-w-6xl"
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">
                  {player.first_name} {player.last_name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                  className="p-1 hover:bg-transparent"
                  disabled={isPending}
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite ? "text-yellow-400 fill-yellow-400" : "text-zinc-500"
                    }`}
                  />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">{player.teamAbbrev}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{player.position}</span>
              </div>
            </div>

            {getStreakText() && (
              <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-sm text-emerald-500 whitespace-nowrap">
                  {getStreakText()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between max-w-[1100px]">
            <div className="flex items-center gap-4">
              <Stat label="Goals" value={player.total_goals} />
              <Stat label="Assists" value={player.total_assists} />
              <Stat label="Points" value={player.total_points} />
              <Stat label="Shots" value={player.total_shots} />
              <Stat label="TOI" value={player.avg_toi} />
            </div>

            <div className="flex items-center gap-4 ml-4 border-l border-zinc-800 pl-4">
              <GameInfo nextGame={player.next_game} />

              {(player.goal_odds || player.point_odds) && (
                <div className="flex items-center gap-4 border-l border-zinc-800 pl-4">
                  {player.goal_odds && (
                    <OddsStat label="Goal" odds={toAmericanOdds(player.goal_odds)} />
                  )}
                  {player.point_odds && (
                    <OddsStat label="Point" odds={toAmericanOdds(player.point_odds)} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add demo data for preview
const demoPlayer = {
  id: "1",
  first_name: "Dylan",
  last_name: "Larkin",
  teamAbbrev: "DET",
  position: "C",
  streak_length: 4,
  total_goals: 5,
  total_assists: 2,
  total_points: 7,
  total_shots: 17,
  avg_toi: "19:33",
  goal_odds: 2.5,
  point_odds: 1.5,
  next_game: {
    opponent: "CHI",
    is_today: true,
    date: "Today",
    is_home: true,
    time: "7:00 PM",
    startTimeUTC: "2024-01-10T00:00:00Z"
  }
};

// Demo wrapper for preview
const PreviewCard = () => (
  <PlayerCard
    player={demoPlayer}
    isFavorite={false}
    activeFilter="goalStreak"
    onToggleFavoriteAction={async () => {}}
    onCardClickAction={async () => {}}
  />
);