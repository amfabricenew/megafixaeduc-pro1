export interface WeekItem {
  number: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  formattedStart: string; // DD/MM/YY
  formattedEnd: string;   // DD/MM/YY
  monthKey: string;       // YYYY-MM
  monthLabel: string;     // e.g. "SEPTEMBRE 2025"
  status: 'future' | 'current' | 'completed_done' | 'completed_pending';
}

export interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  weeks: WeekItem[];
}

const MONTH_NAMES = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

export function formatDateFr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const yearShort = parts[0].slice(-2);
  return `${parts[2]}/${parts[1]}/${yearShort}`;
}

export function generateSchoolYearWeeks(
  dateDebutStr?: string, 
  dateFinStr?: string, 
  validatedWeekNumbers: Set<number> = new Set()
): MonthGroup[] {
  // Default to September 1 of current/previous year to June 30 of next year if missing
  const now = new Date();
  const currentYear = now.getFullYear();
  const defaultStart = dateDebutStr || `${now.getMonth() >= 7 ? currentYear : currentYear - 1}-09-01`;
  const defaultEnd = dateFinStr || `${now.getMonth() >= 7 ? currentYear + 1 : currentYear}-06-30`;

  const startDate = new Date(defaultStart + 'T00:00:00');
  const endDate = new Date(defaultEnd + 'T23:59:59');
  const todayStr = now.toISOString().split('T')[0];

  const weeks: WeekItem[] = [];
  let weekNum = 1;
  let curr = new Date(startDate);

  while (curr <= endDate) {
    // Determine end of week (Saturday)
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
    
    let weekEnd = new Date(curr);
    weekEnd.setDate(weekEnd.getDate() + daysUntilSaturday);
    if (weekEnd > endDate) {
      weekEnd = new Date(endDate);
    }

    const startStr = curr.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    // Month label based on week start date
    const mIdx = curr.getMonth();
    const yr = curr.getFullYear();
    const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES[mIdx]} ${yr}`;

    // Determine status relative to today
    let status: WeekItem['status'] = 'future';
    if (startStr > todayStr) {
      status = 'future';
    } else if (startStr <= todayStr && todayStr <= endStr) {
      status = 'current';
    } else {
      // Completed week
      const isDone = validatedWeekNumbers.has(weekNum);
      status = isDone ? 'completed_done' : 'completed_pending';
    }

    weeks.push({
      number: weekNum,
      startDate: startStr,
      endDate: endStr,
      formattedStart: formatDateFr(startStr),
      formattedEnd: formatDateFr(endStr),
      monthKey,
      monthLabel,
      status
    });

    weekNum++;

    // Advance to next Monday
    const nextMon = new Date(weekEnd);
    nextMon.setDate(nextMon.getDate() + (weekEnd.getDay() === 6 ? 2 : 1));
    curr = nextMon;
  }

  // Group by month
  const monthMap = new Map<string, { label: string; weeks: WeekItem[] }>();
  for (const w of weeks) {
    if (!monthMap.has(w.monthKey)) {
      monthMap.set(w.monthKey, { label: w.monthLabel, weeks: [] });
    }
    monthMap.get(w.monthKey)!.weeks.push(w);
  }

  const groups: MonthGroup[] = [];
  monthMap.forEach((val, key) => {
    groups.push({
      monthKey: key,
      monthLabel: val.label,
      weeks: val.weeks
    });
  });

  return groups;
}
