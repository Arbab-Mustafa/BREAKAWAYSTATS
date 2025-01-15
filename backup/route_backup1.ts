import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/utils/db';

export const runtime = 'nodejs'; // Add this for Vercel

function normalizePosition(pos: string | null) {
  if (!pos) return null;

  // The database has mixed formats, this handles both abbreviations and full names
  switch(pos.toUpperCase()) {
    case 'C':
    case 'CENTER':
      return `('C', 'Center')`;
    case 'L':
    case 'LEFT_WING':
      return `('L', 'Left Wing')`;
    case 'R':
    case 'RIGHT_WING':
      return `('R', 'Right Wing')`;
    case 'D':
    case 'DEFENSE':
      return `('D', 'Defense')`;
    default:
      return `('${pos}')`;
  }
}

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  
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
      const query = `
        WITH recent_games AS (
          SELECT
            pgl.player_id,
            pi.first_name,
            pi.last_name,
            pi.team_abbrev,
            pi.position,
            pgl.game_date,
            pgl.goals,
            pgl.assists,
            pgl.shots,
            pgl.toi,
            ROW_NUMBER() OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date DESC) AS row_num
          FROM player_game_logs pgl
          JOIN player_info_reordered pi ON pgl.player_id = pi.player_id
          WHERE true
          ${position ? `AND pi.position IN ${normalizePosition(position)}` : ''}
          ${searchQuery ? `AND (LOWER(pi.first_name) LIKE LOWER($${position ? '1' : '1'}) 
            OR LOWER(pi.last_name) LIKE LOWER($${position ? '1' : '1'}))` : ''}
        ),
        filtered_games AS (
          SELECT *
          FROM recent_games
          WHERE row_num <= ${timeFrame}
        ),
        player_stats AS (
          SELECT
            player_id as id,
            first_name,
            last_name,
            team_abbrev,
            position,
            COUNT(*) as games_played,
            SUM(goals) as total_goals,
            SUM(assists) as total_assists,
            SUM(goals + assists) as total_points,
            SUM(shots) as total_shots,
            TO_CHAR(
              INTERVAL '1 second' * AVG(
                EXTRACT(HOUR FROM toi::interval) * 3600 +
                EXTRACT(MINUTE FROM toi::interval) * 60 +
                EXTRACT(SECOND FROM toi::interval)
              ),
              'HH24:MI:SS'
            ) AS avg_toi
          FROM filtered_games
          GROUP BY player_id, first_name, last_name, team_abbrev, position
          HAVING COUNT(*) = ${timeFrame}
        )
        SELECT * FROM player_stats
        ORDER BY 
          CASE 
            WHEN '${sortBy}' = 'goals' THEN total_goals
            WHEN '${sortBy}' = 'assists' THEN total_assists
            WHEN '${sortBy}' = 'points' THEN total_points
            WHEN '${sortBy}' = 'shots' THEN total_shots
            ELSE total_points
          END DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      const params = [];
      if (searchQuery) params.push(`%${searchQuery}%`);

      const result = await client.query(query, params);
      return NextResponse.json(result.rows);
    }

    // Handle streak filters (goal, assist, point)
    let baseQuery = `
      WITH last_15_games AS (
        SELECT 
          pgl.player_id,
          pi.first_name,
          pi.last_name,
          pi.team_abbrev,
          pi.position,
          pgl.game_date,
          pgl.goals,
          pgl.assists,
          pgl.shots,
          pgl.toi,
          ROW_NUMBER() OVER (PARTITION BY pgl.player_id ORDER BY pgl.game_date DESC) AS row_num
        FROM player_game_logs pgl
        JOIN player_info_reordered pi ON pgl.player_id = pi.player_id
        WHERE true
        ${position ? `AND pi.position IN ${normalizePosition(position)}` : ''}
        ${searchQuery ? `AND (LOWER(pi.first_name) LIKE LOWER($${position ? '1' : '1'}) 
          OR LOWER(pi.last_name) LIKE LOWER($${position ? '1' : '1'}))` : ''}
      ),
      filtered_games AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY game_date) AS game_rank
        FROM last_15_games
        WHERE row_num <= 15
      )`;

    let streakCondition = "";
    let orderByClause = "";

    switch(activeFilter) {
      case "goalStreak":
        streakCondition = "WHERE goals > 0";
        orderByClause = `ORDER BY 
          ss.streak_length DESC,
          CASE 
            WHEN '${sortBy}' = 'goals' THEN ss.total_goals
            WHEN '${sortBy}' = 'assists' THEN ss.total_assists
            WHEN '${sortBy}' = 'points' THEN ss.total_points
            WHEN '${sortBy}' = 'shots' THEN ss.total_shots
            ELSE ss.total_goals
          END DESC`;
        break;
      case "assistStreak":
        streakCondition = "WHERE assists > 0";
        orderByClause = `ORDER BY 
          ss.streak_length DESC,
          CASE 
            WHEN '${sortBy}' = 'goals' THEN ss.total_goals
            WHEN '${sortBy}' = 'assists' THEN ss.total_assists
            WHEN '${sortBy}' = 'points' THEN ss.total_points
            WHEN '${sortBy}' = 'shots' THEN ss.total_shots
            ELSE ss.total_assists
          END DESC`;
        break;
      case "pointStreak":
        streakCondition = "WHERE (goals + assists) > 0";
        orderByClause = `ORDER BY 
          ss.streak_length DESC,
          CASE 
            WHEN '${sortBy}' = 'goals' THEN ss.total_goals
            WHEN '${sortBy}' = 'assists' THEN ss.total_assists
            WHEN '${sortBy}' = 'points' THEN ss.total_points
            WHEN '${sortBy}' = 'shots' THEN ss.total_shots
            ELSE ss.total_points
          END DESC`;
        break;
      default:
        return NextResponse.json([]);
    }

    const fullQuery = `${baseQuery},
      streak_groups AS (
        SELECT *,
          game_rank - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY game_rank) AS streak_group
        FROM filtered_games
        ${streakCondition}
      ),
      streak_summary AS (
        SELECT 
          player_id,
          first_name,
          last_name,
          team_abbrev,
          position,
          MIN(game_date) AS streak_start,
          MAX(game_date) AS streak_end,
          COUNT(*) AS streak_length,
          SUM(goals) AS total_goals,
          SUM(assists) AS total_assists,
          SUM(goals + assists) AS total_points,
          SUM(shots) AS total_shots,
          TO_CHAR(
            INTERVAL '1 second' * AVG(
              EXTRACT(HOUR FROM toi::interval) * 3600 + 
              EXTRACT(MINUTE FROM toi::interval) * 60 + 
              EXTRACT(SECOND FROM toi::interval)
            ),
            'HH24:MI:SS'
          ) AS avg_toi
        FROM streak_groups
        GROUP BY player_id, first_name, last_name, team_abbrev, position, streak_group
      ),
      latest_game AS (
        SELECT 
          player_id, 
          MAX(game_date) AS latest_game
        FROM filtered_games
        GROUP BY player_id
      )
      SELECT 
        ss.player_id as id,
        ss.first_name,
        ss.last_name,
        ss.team_abbrev,
        ss.position,
        ss.streak_start,
        ss.streak_end,
        ss.streak_length,
        ss.total_goals,
        ss.total_assists,
        ss.total_points,
        ss.total_shots,
        ss.avg_toi
      FROM streak_summary ss
      JOIN latest_game lg 
        ON ss.player_id = lg.player_id
      WHERE ss.streak_end = lg.latest_game
      ${orderByClause}
      LIMIT ${limit} OFFSET ${offset};`;

    const params = [];
    if (searchQuery) params.push(`%${searchQuery}%`);

    console.log("Executing query with params:", params);
    const result = await client.query(fullQuery, params);
    return NextResponse.json(result.rows);

  } catch (err) {
    console.error("Database query failed:", err, {
      stack: err instanceof Error ? err.stack : undefined,
      query: err instanceof Error && 'query' in err ? (err as any).query : undefined
    });
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}