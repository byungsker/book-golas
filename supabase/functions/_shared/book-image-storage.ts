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
  const path = decodeURIComponent(
    value.slice(markerIndex + marker.length).split("?")[0],
  );
  return path || null;
}

export function isOwnedBookImagePath(
  storedValue: string,
  userId: string,
): boolean {
  const path = getBookImagePath(storedValue);
  return path?.split("/")[0] === userId;
}
