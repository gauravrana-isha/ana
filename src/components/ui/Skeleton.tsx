import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-14 bg-surface-2",
        className
      )}
    />
  );
}

export function PracticeRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-[14px_16px] bg-surface rounded-14 mb-2">
      <div className="flex items-center gap-3">
        <Skeleton className="w-[34px] h-[34px] rounded-9" />
        <Skeleton className="w-24 h-4 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-[30px] h-[30px] rounded-full" />
        <Skeleton className="w-12 h-7 rounded-[10px]" />
      </div>
    </div>
  );
}

export function TrackerSkeleton() {
  return (
    <div>
      {/* View toggle */}
      <Skeleton className="w-40 h-9 rounded-[30px] mb-4" />
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-[34px] h-[34px] rounded-full" />
        <Skeleton className="w-40 h-5 rounded-lg" />
        <Skeleton className="w-[34px] h-[34px] rounded-full" />
      </div>
      {/* Hint */}
      <Skeleton className="w-full h-4 rounded-lg mb-5" />
      {/* Section label */}
      <Skeleton className="w-32 h-3 rounded-lg mb-3 mt-4" />
      {/* Practice rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <PracticeRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReflectionSkeleton() {
  return (
    <div>
      {/* Quote */}
      <Skeleton className="w-full h-16 rounded-16 mb-4" />
      {/* Divider */}
      <Skeleton className="w-24 h-4 rounded-lg mx-auto mb-4" />
      {/* Title */}
      <Skeleton className="w-28 h-7 rounded-lg mb-4" />
      {/* Prompt cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-16 p-5 mb-3.5 bg-surface">
          <div className="flex gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-full h-5 rounded-lg" />
              <Skeleton className="w-3/4 h-4 rounded-lg" />
              <Skeleton className="w-full h-10 rounded-[10px] mt-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeeklySkeleton() {
  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-[34px] h-[34px] rounded-full" />
        <Skeleton className="w-48 h-5 rounded-lg" />
        <Skeleton className="w-[34px] h-[34px] rounded-full" />
      </div>
      {/* Tabs */}
      <Skeleton className="w-52 h-9 rounded-[30px] mb-5" />
      {/* Cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-16 p-5 mb-3.5 bg-surface">
          <div className="flex gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-full h-5 rounded-lg" />
              <Skeleton className="w-full h-10 rounded-[10px] mt-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExpressionsListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-14 p-4 bg-surface">
          <Skeleton className="w-32 h-5 rounded-lg mb-1.5" />
          <Skeleton className="w-20 h-3 rounded-lg mb-2" />
          <Skeleton className="w-full h-4 rounded-lg" />
          <Skeleton className="w-3/4 h-4 rounded-lg mt-1" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="w-20 h-7 rounded-lg mb-3" />
        <Skeleton className="w-48 h-9 rounded-[30px]" />
      </div>
      <div>
        <Skeleton className="w-24 h-7 rounded-lg mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-14 mb-1.5">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-9" />
              <Skeleton className="w-24 h-4 rounded-lg" />
            </div>
            <Skeleton className="w-12 h-3 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
