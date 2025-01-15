// app/api/players/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

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

      return NextResponse.json(data);
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

      // Transform data to match frontend expectations
      const transformedData = data.map((player: any) => ({
        id: player.player_id.toString(),
        first_name: player.player_name.split(' ')[0],
        last_name: player.player_name.split(' ')[1],
        team_abbrev: player.team,
        position: player.position,
        streak_length: player.current_streak,
        total_goals: player.total_goals,
        total_assists: player.total_assists,
        total_points: player.total_points,
        total_shots: player.total_shots,
        avg_toi: player.avg_toi_formatted,
        streak_start: player.streak_start,
        streak_end: player.streak_end
      }));

      return NextResponse.json(transformedData);
    }

    return NextResponse.json([]);

  } catch (error: any) {
    console.error("Error processing request:", error);
    
    return NextResponse.json(
      { 
        error: error.message || "Internal Server Error",
        details: error.details || "Unknown error",
        code: error.code || "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}