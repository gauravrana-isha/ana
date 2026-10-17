import { Bone, Skeleton, SkeletonCard, TextBone } from "@/components/ui/Skeleton";

/*
 * One skeleton per screen, laid out like the real thing (same cards, rows, sizes and gaps),
 * so the page keeps its shape while data arrives and nothing jumps when it does. Used both
 * by the route loading files (shown the instant a section is tapped) and by the screens
 * themselves while their data loads.
 */

/* ---------- shared pieces ---------- */

function SectionHead({ w = 150, action = false }: { w?: number; action?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <TextBone w={w} h={18} className="rounded-[6px]" />
      {action && <TextBone w={92} h={12} />}
    </div>
  );
}

/** A practice row: picture tile, name, a control on the right. */
export function PracticeRowSkeleton({ i = 0 }: { i?: number }) {
  return (
    <SkeletonCard className="flex items-center gap-3 px-3.5 py-3 mb-2">
      <Bone className="w-10 h-10 rounded-[12px] shrink-0" />
      <TextBone w={[118, 154, 96, 132, 108][i % 5]} h={14} />
      <span className="flex-1" />
      <Bone className={i % 3 === 0 ? "w-[86px] h-9 rounded-[12px]" : "w-[58px] h-9 rounded-[12px]"} />
      {i % 3 !== 0 && <Bone round className="w-[30px] h-[30px]" />}
    </SkeletonCard>
  );
}

/** A moment card: kind badge, title, time, a few lines of text (and sometimes media). */
export function MomentCardSkeleton({ i = 0 }: { i?: number }) {
  return (
    <SkeletonCard className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Bone className="w-[38px] h-[38px] rounded-[11px] shrink-0" />
        <div className="flex-1 flex flex-col gap-2 pt-0.5">
          <TextBone w={["56%", "42%", "64%"][i % 3]} h={16} />
          <TextBone w={86} h={11} />
        </div>
      </div>
      {i % 3 === 1 && <Bone className="mt-3 w-full aspect-[16/9] rounded-[14px]" />}
      <div className="mt-3 flex flex-col gap-2">
        <TextBone w="100%" h={12} />
        <TextBone w={["78%", "62%", "88%"][i % 3]} h={12} />
      </div>
    </SkeletonCard>
  );
}

/** A person row: round photo, name, two quiet lines. */
export function PersonRowSkeleton({ i = 0 }: { i?: number }) {
  return (
    <SkeletonCard className="flex items-center gap-4 p-4">
      <Bone round className="w-[52px] h-[52px] shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <TextBone w={[110, 84, 140, 96][i % 4]} h={15} />
        <TextBone w={[130, 112, 90, 120][i % 4]} h={11} />
        <TextBone w={[150, 124, 140, 104][i % 4]} h={11} />
      </div>
    </SkeletonCard>
  );
}

function DateNavSkeleton() {
  return (
    <div className="flex items-center justify-between mb-5">
      <Bone round className="w-10 h-10" />
      <TextBone w={170} h={18} />
      <Bone round className="w-10 h-10" />
    </div>
  );
}

function PromptCardSkeleton({ i = 0 }: { i?: number }) {
  return (
    <SkeletonCard className="p-4 sm:p-5 mb-3">
      <div className="flex items-start gap-3">
        <Bone round className="w-7 h-7 shrink-0" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <TextBone w={["72%", "58%", "80%", "64%"][i % 4]} h={15} />
          <TextBone w={["44%", "52%", "38%", "48%"][i % 4]} h={11} />
        </div>
      </div>
      <Bone className="mt-4 w-full h-[76px] rounded-[12px]" />
    </SkeletonCard>
  );
}

/* ---------- screens ---------- */

export function TodaySkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      <TextBone w={190} h={16} className="-mt-3" />
      <SkeletonCard className="rounded-[22px] px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-3">
        <TextBone w="88%" h={20} />
        <TextBone w="64%" h={20} />
      </SkeletonCard>
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
      <section>
        <SectionHead w={160} action />
        {[0, 1, 2, 3, 4].map((i) => <PracticeRowSkeleton key={i} i={i} />)}
      </section>
      <SkeletonCard className="rounded-[20px] p-4 sm:p-5 flex items-center gap-4">
        <Bone className="w-12 h-12 rounded-[13px] shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <TextBone w={150} h={17} />
          <TextBone w="70%" h={12} />
        </div>
      </SkeletonCard>
    </Skeleton>
  );
}

export function TrackerSkeleton() {
  return (
    <Skeleton>
      <Bone className="w-[170px] h-11 rounded-full mb-5" />
      <DateNavSkeleton />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <PracticeRowSkeleton key={i} i={i} />)}
    </Skeleton>
  );
}

/** Daily, answering one question at a time: the step line, one big question card, the buttons. */
export function ReflectionStepSkeleton() {
  return (
    <Skeleton>
      <div className="flex items-center justify-between mb-5">
        <TextBone w={52} h={13} />
        <div className="flex items-center gap-1.5">
          <Bone className="w-5 h-1.5 rounded-full" />
          {Array.from({ length: 7 }).map((_, i) => <Bone key={i} round className="w-1.5 h-1.5" />)}
        </div>
      </div>
      <SkeletonCard className="rounded-[22px] p-5 sm:p-7">
        <div className="flex flex-col gap-2.5">
          <TextBone w="88%" h={22} />
          <TextBone w="62%" h={22} />
        </div>
        <TextBone w="80%" h={12} className="mt-3" />
        <Bone className="mt-5 w-full h-[150px] rounded-[14px]" />
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:flex sm:gap-2">
          {[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="h-8 sm:w-[92px] rounded-full" />)}
        </div>
      </SkeletonCard>
      <div className="mt-5 flex items-center justify-between">
        <Bone className="w-[52px] h-11 rounded-[14px]" />
        <Bone className="w-[96px] h-11 rounded-[14px]" />
      </div>
    </Skeleton>
  );
}

/** Daily, a day already answered: the quote, then the answered questions as cards. */
export function ReflectionReadSkeleton() {
  return (
    <Skeleton>
      <div className="flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="rounded-16 p-5 flex gap-3">
            <TextBone w={12} h={13} />
            <div className="flex-1 flex flex-col gap-2.5">
              <TextBone w={["78%", "56%", "70%"][i]} h={15} />
              <TextBone w={["40%", "62%", "34%"][i]} h={14} />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </Skeleton>
  );
}

export function WeeklySkeleton() {
  return (
    <Skeleton>
      <DateNavSkeleton />
      <Bone className="w-[250px] h-10 rounded-full mb-6" />
      {[0, 1, 2].map((i) => <PromptCardSkeleton key={i} i={i} />)}
    </Skeleton>
  );
}

export function WeekReviewSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-4">
      <SkeletonCard className="rounded-[20px] p-5 flex flex-col gap-3">
        <TextBone w={140} h={16} />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 21 }).map((_, i) => <Bone key={i} className="aspect-square rounded-[6px]" />)}
        </div>
      </SkeletonCard>
      <SkeletonCard className="rounded-[20px] p-5 flex flex-col gap-3">
        <TextBone w={120} h={16} />
        <Bone className="w-full h-[110px] rounded-[12px]" />
      </SkeletonCard>
    </Skeleton>
  );
}

export function MomentsSkeleton({ toolbar = true }: { toolbar?: boolean }) {
  return (
    <Skeleton>
      {toolbar && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <Bone className="flex-1 h-11 rounded-[14px]" />
            <Bone className="h-11 sm:w-[150px] rounded-[14px]" />
          </div>
          <div className="flex items-center gap-2 mb-6">
            <Bone className="flex-1 sm:flex-none sm:w-[420px] h-11 rounded-full" />
            <Bone round className="w-9 h-9" />
          </div>
        </>
      )}
      <div className="flex items-center gap-3 mb-4">
        <TextBone w={150} h={18} />
        <span className="flex-1 h-px bg-line" />
      </div>
      <TextBone w={70} h={11} className="mb-3 ml-1" />
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => <MomentCardSkeleton key={i} i={i} />)}
      </div>
    </Skeleton>
  );
}

export function PeopleSkeleton() {
  return (
    <Skeleton>
      <Bone className="w-full h-11 rounded-[14px] mb-3" />
      <Bone className="w-full h-11 rounded-[14px] mb-6" />
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => <PersonRowSkeleton key={i} i={i} />)}
      </div>
    </Skeleton>
  );
}

export function PersonSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-6">
      <div data-bare className="flex items-center justify-between -mx-1 -mb-2">
        <Bone className="w-10 h-10 rounded-full" />
        <div className="flex gap-2">
          <Bone className="w-10 sm:w-[78px] h-10 rounded-full" />
          <Bone className="w-10 sm:w-[104px] h-10 rounded-full" />
        </div>
      </div>
      <SkeletonCard className="rounded-[22px] p-5 sm:p-6 flex items-center gap-5">
        <Bone round className="w-20 h-20 shrink-0" />
        <div className="flex-1 flex flex-col gap-2.5">
          <TextBone w={160} h={22} />
          <TextBone w={110} h={12} />
          <TextBone w={180} h={12} />
        </div>
      </SkeletonCard>
      <MomentsSkeleton toolbar={false} />
    </Skeleton>
  );
}

export function InsightsSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-10">
      {[0, 1].map((s) => (
        <section key={s}>
          <SectionHead w={s ? 130 : 170} />
          <SkeletonCard className="rounded-[20px] p-5 flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="flex items-center gap-3">
                <TextBone w={86} h={11} />
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
                  {Array.from({ length: 20 }).map((_, i) => <Bone key={i} className="aspect-square rounded-[3px]" />)}
                </div>
              </div>
            ))}
          </SkeletonCard>
        </section>
      ))}
      <section>
        <SectionHead w={120} />
        <SkeletonCard className="rounded-[20px] p-5 flex flex-col gap-3">
          {[78, 56, 40, 28].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone round className="w-[30px] h-[30px] shrink-0" />
              <Bone className="h-3 rounded-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </SkeletonCard>
      </section>
    </Skeleton>
  );
}

export function CommitmentSkeleton() {
  return (
    <Skeleton>
      <SkeletonCard className="rounded-[22px] px-6 py-7 sm:px-10 sm:py-10 flex flex-col gap-3.5">
        <TextBone w={120} h={14} className="mb-3" />
        <TextBone w={96} h={11} className="mb-2" />
        {["94%", "88%", "97%", "72%", "90%", "60%"].map((w, i) => <TextBone key={i} w={w} h={15} />)}
        <TextBone w={110} h={16} className="mt-5" />
      </SkeletonCard>
    </Skeleton>
  );
}

export function ProfileSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-8">
      <SkeletonCard className="rounded-[22px]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Bone round className="w-16 h-16 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <TextBone w={150} h={20} />
              <TextBone w={190} h={12} />
              <TextBone w={160} h={11} />
            </div>
          </div>
          <div className="mt-4 sm:pl-[80px] flex flex-col gap-3">
            <TextBone w="70%" h={15} />
            <Bone className="w-[118px] h-9 rounded-full" />
          </div>
        </div>
        <div className="border-t border-line px-5 sm:px-6 pt-4 pb-5">
          <TextBone w={80} h={12} className="mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[16px] bg-bg/70 px-3 py-3">
                <Bone className="w-9 h-9 rounded-[11px] shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <TextBone w={26} h={18} />
                  <TextBone w={54} h={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SkeletonCard>
      <section>
        <SectionHead w={110} />
        <SkeletonCard className="rounded-[22px] p-4 sm:p-5">
          <Bone className="w-full sm:w-[55%] aspect-[4/3] rounded-[18px]" />
        </SkeletonCard>
      </section>
      <section>
        <SectionHead w={100} />
        <SkeletonCard className="divide-y divide-line">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
              <Bone className="w-[34px] h-[34px] rounded-[10px] shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <TextBone w={90} h={13} />
                <TextBone w="62%" h={11} />
              </div>
              <Bone className="w-11 h-[26px] rounded-full" />
            </div>
          ))}
        </SkeletonCard>
      </section>
    </Skeleton>
  );
}

export function WhoSkeleton() {
  return (
    <Skeleton className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
      <Bone className="w-full max-w-[440px] aspect-[4/3] rounded-[18px] mx-auto" />
      <div className="flex flex-col gap-4">
        <TextBone w={140} h={12} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <TextBone w={60} h={10} />
            <TextBone w={["70%", "56%", "64%"][i]} h={18} />
          </div>
        ))}
        <Bone className="w-[120px] h-11 rounded-[14px] mt-1" />
      </div>
    </Skeleton>
  );
}

export function AdminSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-2.5">
      <Bone className="w-[260px] h-10 rounded-full mb-3" />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} className="flex items-center gap-3.5 p-4">
          <Bone round className="w-10 h-10 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <TextBone w={[140, 110, 160, 120][i]} h={14} />
            <TextBone w={[190, 170, 150, 200][i]} h={11} />
          </div>
          <Bone className="w-[84px] h-8 rounded-full" />
        </SkeletonCard>
      ))}
    </Skeleton>
  );
}

/** For any section without its own: a page of rows. */
export function GenericSkeleton() {
  return (
    <Skeleton className="flex flex-col gap-2.5">
      <SkeletonCard className="rounded-[22px] h-[96px] p-5 flex flex-col gap-3">
        <TextBone w="60%" h={16} />
        <TextBone w="40%" h={12} />
      </SkeletonCard>
      {[0, 1, 2, 3].map((i) => <PracticeRowSkeleton key={i} i={i} />)}
    </Skeleton>
  );
}

/** Just the list part of a screen, for sections that load below content already shown. */
export function ListSkeleton({ kind, count = 3 }: { kind: "practice" | "moment" | "person"; count?: number }) {
  return (
    <Skeleton className={kind === "practice" ? "" : "flex flex-col gap-2.5"}>
      {Array.from({ length: count }).map((_, i) =>
        kind === "practice" ? <PracticeRowSkeleton key={i} i={i} /> : kind === "moment" ? <MomentCardSkeleton key={i} i={i} /> : <PersonRowSkeleton key={i} i={i} />
      )}
    </Skeleton>
  );
}

export function MomentPageSkeleton() {
  return (
    <Skeleton>
      <div data-bare className="flex items-center justify-between -mx-1 mb-4">
        <Bone className="w-10 h-10 rounded-full" />
        <div className="flex gap-2">
          <Bone className="w-10 sm:w-[78px] h-10 rounded-full" />
          <Bone className="w-10 sm:w-[96px] h-10 rounded-full" />
        </div>
      </div>
      <div className="flex items-start gap-3.5">
        <Bone className="w-11 h-11 rounded-[13px] shrink-0 mt-1" />
        <div className="flex-1 flex flex-col gap-2.5">
          <TextBone w="70%" h={26} />
          <TextBone w={220} h={13} />
        </div>
      </div>
      <Bone className="mt-6 w-full aspect-[4/3] max-h-[60vh] rounded-[18px]" />
      <div className="mt-6 flex flex-col gap-2.5">
        {["96%", "90%", "94%", "62%"].map((w, i) => <TextBone key={i} w={w} h={15} />)}
      </div>
    </Skeleton>
  );
}
