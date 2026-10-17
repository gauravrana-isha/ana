"use client";

import { ErrorScreen } from "@/components/shell/ErrorScreen";

export default function ShellError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} />;
}
