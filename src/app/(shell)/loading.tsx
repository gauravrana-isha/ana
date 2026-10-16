import { GenericSkeleton } from "@/components/skeletons/ScreenSkeletons";

/** Fallback for any section without its own skeleton (each main section has one). */
export default function Loading() {
  return <GenericSkeleton />;
}
