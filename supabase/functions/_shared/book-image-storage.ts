export function collectBookImageCleanupPaths(
  rows: Array<{ object_name?: unknown }>,
): string[] {
  return [
    ...new Set(
      rows
        .map((row) => row.object_name)
        .filter((path): path is string =>
          typeof path === "string" && path.trim().length > 0
        ),
    ),
  ];
}

export async function removeAllOwnedBookImagePaths({
  fetchPage,
  removePage,
  pageSize = 500,
}: {
  fetchPage: (
    afterObjectName: string | null,
    pageSize: number,
  ) => Promise<Array<{ object_name?: unknown }>>;
  removePage: (paths: string[]) => Promise<void>;
  pageSize?: number;
}): Promise<number> {
  let afterObjectName: string | null = null;
  let removedCount = 0;

  while (true) {
    const rows = await fetchPage(afterObjectName, pageSize);
    if (rows.length === 0) return removedCount;

    const paths = collectBookImageCleanupPaths(rows);
    if (paths.length === 0) {
      throw new Error("Ownership query returned no valid object paths");
    }

    const nextCursor = paths[paths.length - 1];
    if (nextCursor === afterObjectName) {
      throw new Error("Ownership query cursor did not advance");
    }

    await removePage(paths);
    removedCount += paths.length;
    afterObjectName = nextCursor;

    if (rows.length < pageSize) return removedCount;
  }
}
