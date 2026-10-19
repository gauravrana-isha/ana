"use client";

import { QuestionsEditor } from "@/components/profile/QuestionsEditor";
import type { MonthFigure, SettingPart } from "../kit";

export const reflectionSettings: SettingPart[] = [{ key: "questions", title: "Reflection questions", mark: "daily", Panel: ({ me }) => <QuestionsEditor me={me} /> }];

export const reflectionMonth: MonthFigure[] = [
  { key: "daily", label: "Daily", mark: "daily", value: (s) => s.month.daily },
  { key: "weekly", label: "Weekly", mark: "weekly", value: (s) => s.month.weekly },
];
