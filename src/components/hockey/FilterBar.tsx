"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Star, Filter, ArrowUpDown, Calendar } from "lucide-react";

interface FilterBarProps {
  onFilterChangeAction: (filters: FilterOptions) => Promise<void>;
  showFavorites: boolean;
  setShowFavoritesAction: (show: boolean) => Promise<void>;
}

export interface FilterOptions {
  searchQuery: string;
  activeFilter: "goalStreak" | "assistStreak" | "pointStreak" | "last3" | "last5" | "last10" | null;
  position: string;
  sortBy: string;
  showFavorites: boolean;
  todayOnly: boolean;
}

export const HockeyFilterBar = ({ onFilterChangeAction, showFavorites, setShowFavoritesAction }: FilterBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOptions["activeFilter"]>(null);
  const [position, setPosition] = useState("");
  const [sortBy, setSortBy] = useState("goals");
  const [todayOnly, setTodayOnly] = useState(false);

  const handleFilterClick = (filter: FilterOptions["activeFilter"]) => {
    const newFilter = activeFilter === filter ? null : filter;
    setActiveFilter(newFilter);
    onFilterChangeAction({
      searchQuery,
      activeFilter: newFilter,
      position,
      sortBy,
      showFavorites,
      todayOnly,
    });
  };

  const handleTodayFilterClick = () => {
    const newTodayOnly = !todayOnly;
    setTodayOnly(newTodayOnly);
    onFilterChangeAction({
      searchQuery,
      activeFilter,
      position,
      sortBy,
      showFavorites,
      todayOnly: newTodayOnly,
    });
  };

  return (
    <div className="sticky top-0 z-50 bg-black w-full border-b border-zinc-800 backdrop-blur-sm bg-black/75">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col space-y-6">
          {/* Top Row: Search, Favorites, Position, Sort */}
          <div className="flex items-center gap-4">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onFilterChangeAction({
                    searchQuery: e.target.value,
                    activeFilter,
                    position,
                    sortBy,
                    showFavorites,
                    todayOnly,
                  });
                }}
                className="w-full h-12 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <Button
              onClick={() => setShowFavoritesAction(!showFavorites)}
              variant={showFavorites ? "streakActive" : "streak"}
              className="h-12 px-4 gap-2"
            >
              <Star className="h-4 w-4" />
              Favorites
            </Button>

            <Button
              onClick={handleTodayFilterClick}
              variant={todayOnly ? "streakActive" : "streak"}
              className="h-12 px-4 gap-2"
            >
              <Calendar className="h-4 w-4" />
              Today's Games
            </Button>

            <div className="flex items-center gap-2">
              <Filter className="text-emerald-500 h-5 w-5" />
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  onFilterChangeAction({
                    searchQuery,
                    activeFilter,
                    position: e.target.value,
                    sortBy,
                    showFavorites,
                    todayOnly,
                  });
                }}
                className="h-12 w-40 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">All Positions</option>
                <option value="CENTER">Center</option>
                <option value="LEFT_WING">Left Wing</option>
                <option value="RIGHT_WING">Right Wing</option>
                <option value="DEFENSE">Defense</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-emerald-500 h-5 w-5" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  onFilterChangeAction({
                    searchQuery,
                    activeFilter,
                    position,
                    sortBy: e.target.value,
                    showFavorites,
                    todayOnly,
                  });
                }}
                className="h-12 w-40 px-4 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="goals">Goals</option>
                <option value="assists">Assists</option>
                <option value="points">Points</option>
                <option value="shots">Shots</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Streak Type and Time Frame */}
          <div className="flex items-center gap-12">
            {/* Streak Type */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                <span className="text-zinc-400 text-sm font-medium">STREAK TYPE</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === "goalStreak" ? "streakActive" : "streak"}
                  onClick={() => handleFilterClick("goalStreak")}
                  className="h-10"
                >
                  Goal Streaks
                </Button>
                <Button
                  variant={activeFilter === "assistStreak" ? "streakActive" : "streak"}
                  onClick={() => handleFilterClick("assistStreak")}
                  className="h-10"
                >
                  Assist Streaks
                </Button>
                <Button
                  variant={activeFilter === "pointStreak" ? "streakActive" : "streak"}
                  onClick={() => handleFilterClick("pointStreak")}
                  className="h-10"
                >
                  Point Streaks
                </Button>
              </div>
            </div>

            {/* Time Frame */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-1 bg-emerald-500 rounded-full" />
                <span className="text-zinc-400 text-sm font-medium">TIME FRAME</span>
              </div>
              <div className="flex gap-2">
                {["last3", "last5", "last10"].map((timeFrame) => (
                  <Button
                    key={timeFrame}
                    variant={activeFilter === timeFrame ? "streakActive" : "streak"}
                    onClick={() => handleFilterClick(timeFrame as FilterOptions["activeFilter"])}
                    className="h-10"
                  >
                    Last {timeFrame.slice(4)} Games
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
