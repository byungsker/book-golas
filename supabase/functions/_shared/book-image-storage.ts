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
