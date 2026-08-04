export interface DailyTimesheetInput {
  date: string;
  type: "munka" | "szabadsag" | "betegseg" | "hetvege" | "unnep";
  checkIn: string | null;
  checkOut: string | null;
}

export interface CalculatedDay {
  date: string;
  type: "munka" | "szabadsag" | "betegseg" | "hetvege" | "unnep";
  plannedHours: number;
  actualHours: number;
  balance: number;
}

export function calculateMonthlyTimesheet(
  days: DailyTimesheetInput[],
  standardDailyHours: number = 8.0,
  fte: number = 1.0
): {
  calculatedDays: CalculatedDay[];
  totalPlanned: number;
  totalActual: number;
  totalBalance: number;
} {
  let totalPlanned = 0;
  let totalActual = 0;
  let totalBalance = 0;
  
  const calculatedDays = days.map(day => {
    let plannedHours = 0;
    
    // Alapértelmezetten a munkanapokra (és fizetett távollétekre) számolunk tervet
    if (day.type === "munka" || day.type === "szabadsag" || day.type === "betegseg") {
      plannedHours = standardDailyHours * fte;
    }

    let actualHours = 0;

    if (day.type === "munka" && day.checkIn && day.checkOut) {
      const inTime = new Date(day.checkIn);
      const outTime = new Date(day.checkOut);
      const diffMs = outTime.getTime() - inTime.getTime();
      actualHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // 2 decimal places
    } else if (day.type === "szabadsag" || day.type === "betegseg") {
      // Szabadság és betegség esetén a ledolgozott óra megegyezik a tervezettel (nem generál mínuszt)
      actualHours = plannedHours;
    }

    const balance = Math.round((actualHours - plannedHours) * 100) / 100;

    totalPlanned += plannedHours;
    totalActual += actualHours;
    totalBalance += balance;

    return {
      date: day.date,
      type: day.type,
      plannedHours,
      actualHours,
      balance
    };
  });

  return {
    calculatedDays,
    totalPlanned: Math.round(totalPlanned * 100) / 100,
    totalActual: Math.round(totalActual * 100) / 100,
    totalBalance: Math.round(totalBalance * 100) / 100
  };
}
