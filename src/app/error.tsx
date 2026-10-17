"use client";

import { ErrorScreen } from "@/components/shell/ErrorScreen";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} fullScreen />;
}
