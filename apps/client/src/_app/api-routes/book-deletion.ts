import { deleteBook } from "@/entities/book/index.server";
import { BookIdSchema } from "@/shared/api/contracts";
import { resolveProductSession } from "@/shared/api/product/index.server";
import { failure, notFoundError } from "@/shared/api/product/errors";
import { deleteOwnedBookImages } from "@/features/images-ocr/index.server";

export async function deleteBookAndImages(bookId: string, expectedRevision?: string) {
  const parsedBookId = BookIdSchema.safeParse(bookId);
  if (!parsedBookId.success) return failure(notFoundError());

  const session = await resolveProductSession();
  if (!session.ok) return failure(session.error);

  const clientFactory = () => Promise.resolve(session.value.supabase);
  const storage = (session.value.supabase as unknown as { storage?: { from?: unknown } }).storage;
  const deleted = await deleteBook(parsedBookId.data, clientFactory, expectedRevision);
  if (!deleted.ok) return failure(deleted.error);

  if (storage && typeof storage.from === "function") {
    const cleaned = await deleteOwnedBookImages(parsedBookId.data, clientFactory, { requireActiveBook: false });
    if (!cleaned.ok) return failure(cleaned.error);
  }

  return deleted;
}
