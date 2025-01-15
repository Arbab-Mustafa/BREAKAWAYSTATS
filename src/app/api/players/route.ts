// app/api/players/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
}

interface PlayerData {
  player_id: number;
  player_name: string;
  first_name: string;
  last_name: string;
  teamAbbrev?: string;
  team?: string;
  position: string;
  streak_length: number;
  total_goals: number;
  total_assists: number;
  total_points: number;
  total_shots: number;
  avg_toi: string;
  avg_toi_formatted?: string;
  streak_start?: string;
  streak_end?: string;
  games_played?: number;
  current_streak?: number;
}

interface TransformedPlayer {
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
  games_played?: number;
}

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function normalizePosition(pos: string | null): string | null {
  if (!pos) return null;

  switch(pos.toUpperCase()) {
    case 'C':
    case 'CENTER':
      return 'C';
    case 'L':
    case 'LEFT_WING':
      return 'L';
    case 'R':
    case 'RIGHT_WING':
      return 'R';
    case 'D':
    case 'DEFENSE':
      return 'D';
    default:
      return pos;
  }
}

function transformPlayerData(player: PlayerData): TransformedPlayer {
  return {
    id: player.player_id.toString(),
    first_name: player.player_name?.split(' ')[0] || player.first_name,
    last_name: player.player_name?.split(' ')[1] || player.last_name,
    teamAbbrev: (player.teamAbbrev || player.team || "") as string, // Ensures teamAbbrev is always a string
    position: player.position,
    streak_length: player.streak_length || player.current_streak || 0,
    total_goals: player.total_goals,
    total_assists: player.total_assists,
    total_points: player.total_points,
    total_shots: player.total_shots,
    avg_toi: player.avg_toi_formatted || player.avg_toi,
    streak_start: player.streak_start,
    streak_end: player.streak_end,
    games_played: player.games_played
  };
}


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const activeFilter = url.searchParams.get("activeFilter");
    const position = url.searchParams.get("position");
    const sortBy = url.searchParams.get("sortBy") || "streak_length";
    const searchQuery = url.searchParams.get("searchQuery");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    console.log("Request parameters:", { activeFilter, position, sortBy, searchQuery, page, limit });

    // Handle filters for last X games
    if (activeFilter && ["last3", "last5", "last10"].includes(activeFilter)) {
      const timeFrame = parseInt(activeFilter.replace("last", ""));
      
      const { data, error } = await supabase
        .rpc('get_last_x_games', {
          x_games: timeFrame,
          pos: normalizePosition(position),
          sort_by: sortBy,
          search_term: searchQuery ? `%${searchQuery.toLowerCase()}%` : null,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Error fetching last X games:', error);
        throw error;
      }

      const transformedData = (data || []).map((player: PlayerData) => transformPlayerData(player));
      return NextResponse.json(transformedData);
    }

    // Handle streak filters
    if (activeFilter && ["goalStreak", "assistStreak", "pointStreak"].includes(activeFilter)) {
      let functionName: string;
      
      switch(activeFilter) {
        case "goalStreak":
          functionName = 'get_active_goal_streaks';
          break;
        case "assistStreak":
          functionName = 'get_active_assist_streaks';
          break;
        case "pointStreak":
          functionName = 'get_active_point_streaks';
          break;
        default:
          throw new Error('Invalid streak type');
      }

      const { data, error } = await supabase
        .rpc(functionName, {
          pos: normalizePosition(position),
          search_term: searchQuery ? `%${searchQuery.toLowerCase()}%` : null,
          sort_by: sortBy,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error(`Error fetching ${activeFilter}:`, error);
        throw error;
      }

      const transformedData = (data || []).map((player: PlayerData) => transformPlayerData(player));

      // Sort by streak length and then by the appropriate stat
      const sortedData = [...transformedData].sort((a, b) => {
        if (b.streak_length !== a.streak_length) {
          return b.streak_length - a.streak_length;
        }
        
        switch(activeFilter) {
          case 'goalStreak':
            return b.total_goals - a.total_goals;
          case 'assistStreak':
            return b.total_assists - a.total_assists;
          case 'pointStreak':
            return b.total_points - a.total_points;
          default:
            return 0;
        }
      });

      return NextResponse.json(sortedData);
    }

    return NextResponse.json([]);

  } catch (error) {
    console.error("Error processing request:", error, {
      name: error instanceof Error ? error.name : 'Unknown error',
      message: error instanceof Error ? error.message : 'Unknown error message',
      code: (error as SupabaseError).code,
      details: (error as SupabaseError).details,
      hint: (error as SupabaseError).hint
    });

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal Server Error", 
        details: (error as SupabaseError).details || "Unknown error",
        code: (error as SupabaseError).code || "UNKNOWN_ERROR",
        hint: (error as SupabaseError).hint
      },
      { status: 500 }
    );
  }
}