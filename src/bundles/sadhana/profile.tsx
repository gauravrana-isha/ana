"use client";

import type { MonthFigure, SettingPart } from "../kit";
import { PracticesPanel } from "./practices";

export const sadhanaSettings: SettingPart[] = [{ key: "practices", title: "Practices", mark: "tracker", Panel: () => <PracticesPanel /> }];

export const sadhanaMonth: MonthFigure[] = [{ key: "practice-days", label: "Practice days", mark: "tracker", value: (s) => s.month.tracker }];
