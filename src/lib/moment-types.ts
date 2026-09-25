import type { AttachmentDTO } from "./media-client";

export type MomentKind = "writing" | "moment" | "audio" | "video" | "photo";

/** A moment as the API returns it (mirrors serializeMoment on the server). */
export interface Moment {
  id: string;
  title: string;
  kind: MomentKind;
  body: string;
  place: string | null;
  stamps: string[];
  lookBackOn: string | null;
  occurredAt: string;
  hasTime: boolean;
  people: { id: string; name: string; photoId: string | null }[];
  attachments: AttachmentDTO[];
  createdAt: string;
}
