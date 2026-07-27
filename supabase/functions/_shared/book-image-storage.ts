const bucketName = "book-images";

export function getBookImagePath(storedValue: string): string | null {
  if (
    !storedValue.startsWith("http://") &&
    !storedValue.startsWith("https://")
  ) {
    return storedValue.replace(/^\/+/, "") || null;
  }

  const markers = [
    `/storage/v1/object/public/${bucketName}/`,
    `/storage/v1/object/sign/${bucketName}/`,
    `/storage/v1/object/authenticated/${bucketName}/`,
  ];
  const marker = markers.find((candidate) => storedValue.includes(candidate));
  if (!marker) return null;

  const markerIndex = storedValue.indexOf(marker);
  try {
    const path = decodeURIComponent(
      storedValue.slice(markerIndex + marker.length).split("?")[0],
    );
    return path || null;
  } catch {
    return null;
  }
}
