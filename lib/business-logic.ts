/**
 * TakoHub Business Logic & Formulas Engine
 *
 * Rules:
 * 1. Total Plates Sold = Cheese + Octobits + Crab
 * 2. Total Sales = Total Plates Sold * 280
 * 3. Salary is strictly determined by the 13-tier matrix
 */

export interface PlateCounts {
  cheese: number;
  octobits: number;
  crab: number;
}

export const PRICE_PER_PLATE = 280;

/**
 * Calculate total plates sold from cheese, octobits, and crab
 */
export function calculatePlatesSold(counts: Partial<PlateCounts>): number {
  const cheese = Math.max(0, Number(counts.cheese) || 0);
  const octobits = Math.max(0, Number(counts.octobits) || 0);
  const crab = Math.max(0, Number(counts.crab) || 0);
  return cheese + octobits + crab;
}

/**
 * Calculate total sales: Total Plates Sold * 280
 */
export function calculateTotalSales(totalPlates: number): number {
  const plates = Math.max(0, Number(totalPlates) || 0);
  return plates * PRICE_PER_PLATE;
}

/**
 * Strict Salary Matrix:
 * | Plates Sold | Salary |
 * | 1–5         | ₱400   |
 * | 6–10        | ₱500   |
 * | 11–15       | ₱650   |
 * | 16–20       | ₱750   |
 * | 21–25       | ₱850   |
 * | 26–29       | ₱950   |
 * | 30–35       | ₱1,050 + ₱250 = ₱1,300 |
 * | 36–40       | ₱1,400 |
 * | 41–45       | ₱1,500 |
 * | 46–50       | ₱1,600 |
 * | 51–55       | ₱1,700 |
 * | 56–59       | ₱1,800 |
 * | 60+         | ₱1,900 + ₱250 = ₱2,150 |
 * | 0           | ₱0     |
 */
export const DEFAULT_SALARY_MATRIX = [
  { minPlates: 1, maxPlates: 5, salary: 400, description: "1–5 plates" },
  { minPlates: 6, maxPlates: 10, salary: 500, description: "6–10 plates" },
  { minPlates: 11, maxPlates: 15, salary: 650, description: "11–15 plates" },
  { minPlates: 16, maxPlates: 20, salary: 750, description: "16–20 plates" },
  { minPlates: 21, maxPlates: 25, salary: 850, description: "21–25 plates" },
  { minPlates: 26, maxPlates: 29, salary: 950, description: "26–29 plates" },
  { minPlates: 30, maxPlates: 35, salary: 1300, description: "30–35 plates" },
  { minPlates: 36, maxPlates: 40, salary: 1400, description: "36–40 plates" },
  { minPlates: 41, maxPlates: 45, salary: 1500, description: "41–45 plates" },
  { minPlates: 46, maxPlates: 50, salary: 1600, description: "46–50 plates" },
  { minPlates: 51, maxPlates: 55, salary: 1700, description: "51–55 plates" },
  { minPlates: 56, maxPlates: 59, salary: 1800, description: "56–59 plates" },
  { minPlates: 60, maxPlates: null, salary: 2150, description: "60+ plates" },
];

export function calculateSalary(totalPlates: number): number {
  const plates = Math.max(0, Number(totalPlates) || 0);

  if (plates === 0) return 0;
  if (plates >= 1 && plates <= 5) return 400;
  if (plates >= 6 && plates <= 10) return 500;
  if (plates >= 11 && plates <= 15) return 650;
  if (plates >= 16 && plates <= 20) return 750;
  if (plates >= 21 && plates <= 25) return 850;
  if (plates >= 26 && plates <= 29) return 950;
  if (plates >= 30 && plates <= 35) return 1300; // 1,050 + 250
  if (plates >= 36 && plates <= 40) return 1400;
  if (plates >= 41 && plates <= 45) return 1500;
  if (plates >= 46 && plates <= 50) return 1600;
  if (plates >= 51 && plates <= 55) return 1700;
  if (plates >= 56 && plates <= 59) return 1800;
  if (plates >= 60) return 2150; // 1,900 + 250

  return 0;
}

/**
 * Calculate salary dynamically from a given custom salary matrix
 */
export function calculateSalaryFromMatrix(
  totalPlates: number,
  matrix?: Array<{ minPlates: number; maxPlates: number | null; salary: number }> | null
): number {
  const plates = Math.max(0, Number(totalPlates) || 0);
  if (plates === 0) return 0;
  if (!matrix || matrix.length === 0) {
    return calculateSalary(plates);
  }
  const sorted = [...matrix].sort((a, b) => a.minPlates - b.minPlates);
  const tier = sorted.find(
    (t) =>
      plates >= t.minPlates &&
      (t.maxPlates === null || t.maxPlates === undefined || plates <= t.maxPlates)
  );
  return tier ? tier.salary : 0;
}

/**
 * Format dynamic running time from start timestamp to current time
 */
export function calculateRunningDuration(
  startTime: string | Date,
  endTime?: string | Date | null
): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  formattedString: string;
} {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedString = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    hours,
    minutes,
    seconds,
    totalMinutes,
    formattedString,
  };
}

/**
 * Currency formatting helper
 */
export function formatPeso(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `₱${val.toLocaleString("en-PH")}`;
}

/**
 * Format signed Short / Over display
 */
export function formatShortOver(amount: number): {
  type: "SHORT" | "OVER" | "BALANCED";
  text: string;
  className: string;
} {
  if (amount > 0) {
    return {
      type: "SHORT",
      text: `Short: ${formatPeso(amount)}`,
      className: "text-red-600 dark:text-red-400 font-semibold",
    };
  }
  if (amount < 0) {
    return {
      type: "OVER",
      text: `Over: ${formatPeso(Math.abs(amount))}`,
      className: "text-emerald-600 dark:text-emerald-400 font-semibold",
    };
  }
  return {
    type: "BALANCED",
    text: "Balanced: ₱0",
    className: "text-zinc-600 dark:text-zinc-400",
  };
}

export function calculateTotalPlates(cheese: number, octobits: number, crab: number): number {
  return (cheese || 0) + (octobits || 0) + (crab || 0);
}

export function calculateShortOver(
  cashOnHand: number,
  gcashPayment: number,
  expenses: number,
  salary: number,
  totalSales: number
): number {
  return (cashOnHand || 0) + (gcashPayment || 0) + (expenses || 0) + (salary || 0) - totalSales;
}

/**
 * Calculate net sales deducting expenses, salary, free b-box, short/over, and trash/leftover from gross sales
 */
export function calculateNetSales(
  grossSales: number,
  expenses: number,
  salary: number,
  free: number = 0,
  shortOver: number = 0,
  trashLeftover: number = 0
): number {
  return (
    (grossSales || 0) -
    (expenses || 0) -
    (salary || 0) -
    (free || 0) -
    (shortOver || 0) -
    (trashLeftover || 0)
  );
}


