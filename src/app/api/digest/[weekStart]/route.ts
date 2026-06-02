import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { addDays, computeSleepMinutes } from "@/lib/dates";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const user = await resolveUser();
  const { weekStart } = await params;

  if (!user) {
    return NextResponse.json({ tended: [], trends: [], totals: [], counts: [], weekStart });
  }

  const weekEnd = addDays(weekStart, 6);
  const dayLogs = await db.dayLog.findMany({
    where: {
      userId: user.id,
      date: { gte: new Date(weekStart), lte: new Date(weekEnd) },
    },
    orderBy: { date: "asc" },
  });

  const practices = await db.practice.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  // Helper: get entry for a practice on a specific day
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getEntry(log: any, practiceId: string) {
    const entries = log.entries as Record<string, { done?: boolean; values?: Record<string, number | string> }>;
    return entries?.[practiceId];
  }

  // Find practices by name
  const byName: Record<string, string> = {};
  practices.forEach(p => { byName[p.name.toLowerCase()] = p.id; });

  // === TENDED (done/not-done dots) ===
  const tendedPractices = ["Surya Kriya", "Yogasanas", "Breath Watching", "Samyama", "Dhyanalinga", "Lingabhairavi"];
  const tended: Array<{ name: string; days: boolean[] }> = [];
  for (const name of tendedPractices) {
    const id = byName[name.toLowerCase()];
    if (!id) continue;
    const days: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const log = dayLogs.find(l => l.date.toISOString().slice(0, 10) === dayDate);
      const entry = log ? getEntry(log, id) : undefined;
      days.push(!!entry?.done);
    }
    if (days.some(d => d)) {
      tended.push({ name, days });
    }
  }

  // === SPARKLINE TRENDS ===
  const trends: Array<{ name: string; values: number[]; unit: string }> = [];

  // Kapal Bhati count
  const shaktiId = byName["shakti chalana"];
  if (shaktiId) {
    const values: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const log = dayLogs.find(l => l.date.toISOString().slice(0, 10) === dayDate);
      const entry = log ? getEntry(log, shaktiId) : undefined;
      const kapal = entry?.values?.kapal;
      if (typeof kapal === "number" && kapal > 0) values.push(kapal);
    }
    if (values.length >= 2) trends.push({ name: "Kapal Bhati", values, unit: "count" });
  }

  // Sleep hours
  const wakeId = byName["wake up"];
  const bedId = byName["bedtime"];
  if (wakeId && bedId) {
    const values: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const prevDate = addDays(weekStart, i - 1);
      const log = dayLogs.find(l => l.date.toISOString().slice(0, 10) === dayDate);
      const prevLog = dayLogs.find(l => l.date.toISOString().slice(0, 10) === prevDate);
      const wakeTime = log ? getEntry(log, wakeId)?.values?.time : undefined;
      const bedTime = prevLog ? getEntry(prevLog, bedId)?.values?.time : undefined;
      if (typeof wakeTime === "string" && typeof bedTime === "string" && wakeTime && bedTime) {
        const mins = computeSleepMinutes(bedTime, wakeTime);
        if (mins > 0 && mins < 840) values.push(Math.round(mins / 6) / 10); // hours with 1 decimal
      }
    }
    if (values.length >= 2) trends.push({ name: "Sleep", values, unit: "hrs" });
  }

  // Surya Kriya, Breath Watching, Samyama minutes
  for (const name of ["Surya Kriya", "Breath Watching", "Samyama"]) {
    const id = byName[name.toLowerCase()];
    if (!id) continue;
    const values: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const log = dayLogs.find(l => l.date.toISOString().slice(0, 10) === dayDate);
      const entry = log ? getEntry(log, id) : undefined;
      const min = entry?.values?.min;
      if (typeof min === "number" && min > 0) values.push(min);
    }
    if (values.length >= 2) trends.push({ name, values, unit: "min" });
  }

  // === TOTALS (time spent) ===
  const totals: Array<{ name: string; totalMin: number; days: number }> = [];
  for (const name of ["Dhyanalinga", "Lingabhairavi", "Yogasanas"]) {
    const id = byName[name.toLowerCase()];
    if (!id) continue;
    let totalMin = 0;
    let days = 0;
    for (const log of dayLogs) {
      const entry = getEntry(log, id);
      const min = entry?.values?.min;
      if (typeof min === "number" && min > 0) { totalMin += min; days++; }
    }
    if (totalMin > 0) totals.push({ name, totalMin, days });
  }

  // === COUNTS (Shambhavi 1/2, Shoonya) ===
  const counts: Array<{ name: string; detail: string }> = [];

  const shambhaviId = byName["shambhavi"];
  if (shambhaviId) {
    let ones = 0, twos = 0;
    for (const log of dayLogs) {
      const entry = getEntry(log, shambhaviId);
      const count = entry?.values?.count;
      if (count === 1) ones++;
      if (count === 2) twos++;
    }
    if (ones + twos > 0) counts.push({ name: "Shambhavi", detail: `${twos}× twice, ${ones}× once (${ones + twos} days)` });
  }

  const shoonyaId = byName["shoonya"];
  if (shoonyaId) {
    let total = 0;
    for (const log of dayLogs) {
      const entry = getEntry(log, shoonyaId);
      const count = entry?.values?.count;
      if (typeof count === "number") total += count;
    }
    if (total > 0) counts.push({ name: "Shoonya", detail: `${total} total this week` });
  }

  return NextResponse.json({ tended, trends, totals, counts, weekStart, weekEnd });
}
