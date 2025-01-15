"use client";

import { Header } from "@/components/hockey/Header";
import { HockeyFilterBar } from "@/components/hockey/FilterBar";
import { PlayerCard } from "@/components/hockey/PlayerCard";
import { useState, useEffect } from "react";
import { FilterOptions } from "@/components/hockey/FilterBar";
import { findPlayerGame, ScheduleResponse } from "@/utils/schedule";

interface APIError {
  error: string;
  details?: string;
  code?: string;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  teamAbbrev: string;
  position: string;
  streak_length: number;
  total_goals: number;
  total_assists: number;
  total_points: number;
  total_shots: number;
  avg_toi: string;
  streak_start?: string;
  streak_end?: string;
  goal_odds?: number;
  point_odds?: number;
  next_game?: {
    opponent: string;
    is_today: boolean;
    date: string;
    is_home: boolean;
  };
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    activeFilter: null,
    position: "",
    sortBy: "",
    showFavorites: false,
    todayOnly: false
  });

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PLAYERS_PER_PAGE = 25;

  const fetchPlayers = async (filters: FilterOptions, pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      const params = new URLSearchParams();
      
      if (filters.activeFilter) params.append("activeFilter", filters.activeFilter);
      if (filters.position && filters.position !== "All") {
        params.append("position", filters.position);
      }
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.searchQuery) params.append("searchQuery", filters.searchQuery);

      params.append("page", pageNum.toString());
      params.append("limit", PLAYERS_PER_PAGE.toString());
      params.append("t", Date.now().toString());

      console.log("Fetching with filters:", { 
        activeFilter: filters.activeFilter,
        position: filters.position,
        sortBy: filters.sortBy,
        searchQuery: filters.searchQuery,
        page: pageNum,
        todayOnly: filters.todayOnly,
        timestamp: Date.now()
      });

      const response = await fetch(`/api/players?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        next: { revalidate: 0 }
      });
      
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = (data as APIError).error || 
                           (data as APIError).details || 
                           "Failed to fetch players";
        throw new Error(errorMessage);
      }

      // Make sure data is an array
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }

      // Filter and update players
      const filteredData = data.filter((player: Player) => {
        if (filters.showFavorites && !favorites.includes(player.id)) {
          return false;
        }
        return true;
      });

      if (pageNum === 1) {
        setPlayers(filteredData);
      } else {
        setPlayers(prev => {
          const existingPlayers = new Map(prev.map((player: Player) => [player.id, player]));
          filteredData.forEach((player: Player) => {
            existingPlayers.set(player.id, player);
          });
          return Array.from(existingPlayers.values());
        });
      }

      setHasMore(filteredData.length === PLAYERS_PER_PAGE);
      setPage(pageNum);

    } catch (error) {
      console.error("Error fetching players:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedFavorites = localStorage.getItem("favorites");
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }

        const scheduleResponse = await fetch(`/api/schedule?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          next: { revalidate: 0 }
        });
        
        const scheduleData = await scheduleResponse.json();
        
        if (!scheduleResponse.ok) {
          throw new Error(
            (scheduleData as APIError).error || 
            'Failed to fetch schedule'
          );
        }

        setScheduleData(scheduleData);
        await fetchPlayers(filters, 1);
      } catch (error) {
        console.error("Error loading initial data:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    };

    loadInitialData();
  }, []);

  const handleFilterChangeAction = async (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(1);
    await fetchPlayers(newFilters, 1);
  };

  const handleToggleFavoriteAction = async (id: string): Promise<void> => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((fav) => fav !== id)
      : [...favorites, id];
    
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify(newFavorites));
    
    if (filters.showFavorites) {
      await fetchPlayers(filters, 1);
    }
  };

  const handleShowFavoritesAction = async (show: boolean) => {
    const newFilters = {
      ...filters,
      showFavorites: show
    };
    setFilters(newFilters);
    setPage(1);
    await fetchPlayers(newFilters, 1);
  };

  const handleCardClickAction = async (): Promise<void> => {
    return Promise.resolve();
  };

  const handleLoadMore = async () => {
    await fetchPlayers(filters, page + 1);
  };

  // Filter displayed players for today's games
  const displayPlayers = players.filter(player => {
    if (filters.todayOnly) {
      const gameInfo = scheduleData ? findPlayerGame(scheduleData, player.teamAbbrev) : undefined;
      return gameInfo?.is_today === true;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />
      <HockeyFilterBar
        onFilterChangeAction={handleFilterChangeAction}
        showFavorites={filters.showFavorites}
        setShowFavoritesAction={handleShowFavoritesAction}
      />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-500">{error}</div>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="text-emerald-500">Loading players...</div>
          </div>
        ) : displayPlayers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-400">No players found</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {displayPlayers.map((player) => (
                <PlayerCard
                  key={`${player.id}-${page}`}
                  player={{
                    ...player,
                    goal_odds: 2.5,
                    point_odds: 1.5,
                    next_game: scheduleData ? findPlayerGame(scheduleData, player.teamAbbrev) : undefined
                  }}
                  isFavorite={favorites.includes(player.id)}
                  activeFilter={filters.activeFilter}
                  onToggleFavoriteAction={async () => await handleToggleFavoriteAction(player.id)}
                  onCardClickAction={handleCardClickAction}
                />
              ))}
            </div>
            
            {hasMore && !isLoadingMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  Load More Players
                </button>
              </div>
            )}
            
            {isLoadingMore && (
              <div className="text-center mt-8">
                <div className="text-emerald-500">Loading more players...</div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}