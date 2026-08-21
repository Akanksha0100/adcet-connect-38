/**
 * Uploads module service.
 *
 * `presignDownload` and `remove` take an object key straight from the request
 * body, so both need an authorisation check before they touch storage — a key
 * is a guessable-ish string, not a capability. Without one, any signed-in
 * member could hand over `resume/<someone-else>/…` and get a signed URL to
 * another alumnus's CV, or `newsletter/…` to `DELETE /uploads` and wipe a
 * published edition. `authorizeRead` / `authorizeWrite` below are what stand
 * between the route and the storage adapter.
 */
import { prisma } from "../../lib/prisma.js";
import { Forbidden, NotFound } from "../../lib/errors.js";
import { getStorage } from "../../storage/index.js";
import { UPLOAD_SCOPES, type UploadScope } from "../../config/constants.js";

/**
 * Scopes whose objects are *not* publicly delivered. Everything else is
 * fetched by anyone with the URL anyway (`storageUrl()` on the frontend builds
 * a plain public URL for it), so presigning one grants no access that a
 * visitor did not already have — but these two must be authorised.
 */
const PRIVATE_SCOPES = new Set<UploadScope>(["resume", "receipt"]);

const SCOPES = new Set<string>(UPLOAD_SCOPES);

export interface KeyParts {
  scope: UploadScope;
  ownerId: string;
}

/**
 * Split a key produced by `buildObjectKey` — `<scope>/<ownerId>/<uuid>-<name>`.
 *
 * Returns null for anything that isn't that shape, which also rejects the
 * traversal payloads (`../../server.ts`) that `LocalStorage.delete` would
 * otherwise happily `path.join` its way out of the storage root with.
 */
export const parseObjectKey = (key: string): KeyParts | null => {
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) return null;
  const [scope, ownerId, ...rest] = key.split("/");
  if (!SCOPES.has(scope) || !ownerId || rest.length === 0) return null;
  return { scope: scope as UploadScope, ownerId };
};

export interface Caller {
  id: string;
  isAdmin: boolean;
}

/**
 * May `caller` obtain a download URL for `key`?
 *
 * Public scopes: yes. Private scopes: the owner and admins always; plus the one
 * legitimate cross-owner case — the alumnus who posted a job may read the
 * résumés submitted to it, which is the whole point of collecting them.
 */
const authorizeRead = async (caller: Caller, key: string): Promise<void> => {
  const parts = parseObjectKey(key);
  if (!parts) throw NotFound("No such object");
  if (!PRIVATE_SCOPES.has(parts.scope)) return;
  if (caller.isAdmin || parts.ownerId === caller.id) return;

  if (parts.scope === "resume") {
    const application = await prisma.jobApplication.findFirst({
      where: { resumeKey: key, job: { createdById: caller.id } },
      select: { id: true },
    });
    if (application) return;
  }
  throw Forbidden("You do not have access to this file");
};

/**
 * May `caller` delete `key`? Owner or admin only — there is no equivalent of
 * the résumé case, because nobody but the uploader should ever destroy a file.
 */
const authorizeWrite = (caller: Caller, key: string): void => {
  const parts = parseObjectKey(key);
  if (!parts) throw NotFound("No such object");
  if (caller.isAdmin || parts.ownerId === caller.id) return;
  throw Forbidden("You do not have access to this file");
};

export const presignUpload = (
  ownerId: string,
  input: { fileName: string; contentType: string; scope: UploadScope },
) => getStorage().presignUpload({ ...input, ownerId });

export const uploadDirect = (
  ownerId: string,
  input: { fileName: string; contentType: string; scope: UploadScope; body: Buffer },
) => getStorage().upload({ ...input, ownerId });

export const presignDownload = async (caller: Caller, key: string) => {
  await authorizeRead(caller, key);
  return getStorage().presignDownload(key);
};

export const remove = async (caller: Caller, key: string) => {
  authorizeWrite(caller, key);
  await getStorage().delete(key);
};
