// utils/schedule.ts

export interface Game {
  id: string;
  startTimeUTC: string;
  venueTimezone: string;
  easternUTCOffset: string;
  awayTeam: {
    abbrev: string;
  };
  homeTeam: {
    abbrev: string;
  };
}

export interface ScheduleDay {
  date: string;
  games: Game[];
}

export interface ScheduleResponse {
  gameWeek: ScheduleDay[];
}

export interface GameInfo {
  opponent: string;
  is_today: boolean;
  date: string;
  is_home: boolean;
  time: string;
  startTimeUTC: string;
}

function formatDateToMatchAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function findPlayerGame(schedule: ScheduleResponse, playerTeam: string): GameInfo | undefined {
  // Get today's date in YYYY-MM-DD format to match API
  const todayString = formatDateToMatchAPI(new Date());
  
  for (const day of schedule.gameWeek) {
    for (const game of day.games) {
      if (game.awayTeam.abbrev === playerTeam || game.homeTeam.abbrev === playerTeam) {
        const isHome = game.homeTeam.abbrev === playerTeam;
        const opponent = isHome ? game.awayTeam.abbrev : game.homeTeam.abbrev;

        // Get the game's date in local time
        const gameDate = new Date(game.startTimeUTC);
        
        // Check if the game's date matches today's date
        const gameDateString = formatDateToMatchAPI(gameDate);
        const isToday = gameDateString === todayString;

        // Format time
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
          hour12: true
        };

        // Format display date
        const dateFormatted = isToday 
          ? 'Today'
          : gameDate.toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            });

        // Get time in local timezone
        const timeFormatted = gameDate.toLocaleTimeString('en-US', timeOptions);

        return {
          opponent,
          is_today: isToday,
          date: dateFormatted,
          is_home: isHome,
          time: timeFormatted,
          startTimeUTC: game.startTimeUTC
        };
      }
    }
  }
  
  return undefined;
}