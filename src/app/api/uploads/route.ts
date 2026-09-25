import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { resolveUser } from "@/lib/session";
import { MEDIA_RULES, USER_QUOTA_BYTES, bytesUsed, isMediaKind, storageMode, userPrefix } from "@/lib/storage";

/**
 * Issues short-lived tokens so the browser can upload straight to the private Blob store
 * (big videos never pass through our server). Only approved people, only their own folder,
 * only allowed types and sizes, and never past their quota.
 */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user || !(user.effective.includes("expressions") || user.effective.includes("people"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (storageMode() !== "blob") return NextResponse.json({ mode: "local" }, { status: 409 });

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { kind } = JSON.parse(clientPayload ?? "{}");
        if (!isMediaKind(kind)) throw new Error("Unknown media kind");
        if (!pathname.startsWith(`${userPrefix(user.id)}${kind}/`)) throw new Error("Wrong folder");
        const rules = MEDIA_RULES[kind];
        if ((await bytesUsed(user.id)) + rules.maxBytes > USER_QUOTA_BYTES) {
          throw new Error("Storage is full for this account");
        }
        return {
          allowedContentTypes: rules.types.flatMap((t) => [t, `${t};*`]),
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: true,
          validUntil: Date.now() + 30 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload refused" }, { status: 400 });
  }
}
