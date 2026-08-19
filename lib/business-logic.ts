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
  if (amount < 0) {
    return {
      type: "SHORT",
      text: `Short: ${formatPeso(Math.abs(amount))}`,
      className: "text-red-600 dark:text-red-400 font-semibold",
    };
  }
  if (amount > 0) {
    return {
      type: "OVER",
      text: `Over: ${formatPeso(amount)}`,
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

