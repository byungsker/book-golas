const bucketName = "book-images";

export function getBookImagePath(storedValue: string): string | null {
  const value = storedValue.trim();
  if (!value) return null;

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value.replace(/^\/+/, "") || null;
  }

  const markers = [
    `/storage/v1/object/public/${bucketName}/`,
    `/storage/v1/object/sign/${bucketName}/`,
    `/storage/v1/object/authenticated/${bucketName}/`,
  ];
  const marker = markers.find((candidate) => value.includes(candidate));
  if (!marker) return null;

  const markerIndex = value.indexOf(marker);
  try {
    const path = decodeURIComponent(
      value.slice(markerIndex + marker.length).split("?")[0],
    );
    return path || null;
  } catch {
    return null;
  }
}

export function isOwnedBookImagePath(
  storedValue: string,
  userId: string,
): boolean {
  const path = getBookImagePath(storedValue);
  return path?.split("/")[0] === userId;
}

export function collectOwnedBookImagePaths({
  userId,
  referencedValues,
  legacyPaths,
  listedPaths,
}: {
  userId: string;
  referencedValues: string[];
  legacyPaths: string[];
  listedPaths: string[];
}): string[] {
  const referencedPaths = referencedValues
    .filter((value) => isOwnedBookImagePath(value, userId))
    .map(getBookImagePath)
    .filter((path): path is string => path !== null);
  return [
    ...new Set([
      ...referencedPaths,
      ...legacyPaths,
      ...listedPaths,
    ]),
  ];
}
