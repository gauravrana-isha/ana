"use client";

import { Bone, Skeleton, SkeletonCard, TextBone } from "@/components/ui/Skeleton";
import { useBundles } from "@/components/shell/Bundles";
import { PracticeRowSkeleton, SectionHead } from "./ScreenSkeletons";

/**
 * Home while it loads, shaped like Home itself: search, the bell and your picture, the
 * greeting, the quote, then the cards your bundles bring (and only those).
 */
export function HomeSkeleton() {
  const bundles = useBundles();
  return (
    <Skeleton className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Bone className="flex-1 h-12 rounded-full" />
          <Bone round className="w-12 h-12" />
          <Bone round className="lg:hidden w-12 h-12" />
        </div>
        <TextBone w={190} h={16} />
      </div>
      <SkeletonCard className="rounded-[22px] px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-3">
        <TextBone w="88%" h={20} />
        <TextBone w="64%" h={20} />
      </SkeletonCard>
      {bundles.includes("expressions") && (
        <section>
          <SectionHead w={140} />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-[96px] flex flex-col items-center justify-center gap-2.5">
                <Bone className="w-11 h-11 rounded-[13px]" />
                <TextBone w={42} h={11} />
              </SkeletonCard>
            ))}
          </div>
        </section>
      )}
      {bundles.includes("sadhana") && (
        <section>
          <SectionHead w={160} action />
          {[0, 1, 2, 3].map((i) => <PracticeRowSkeleton key={i} i={i} />)}
        </section>
      )}
      {bundles.includes("reflection") && (
        <SkeletonCard className="rounded-[20px] p-4 sm:p-5 flex items-center gap-4">
          <Bone className="w-12 h-12 rounded-[13px] shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <TextBone w={150} h={17} />
            <TextBone w="70%" h={12} />
          </div>
        </SkeletonCard>
      )}
    </Skeleton>
  );
}
