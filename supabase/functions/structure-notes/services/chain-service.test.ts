import {
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  type ContentItem,
  formatProviderContents,
  prepareProviderContents,
} from "./chain-service.ts";

const contents: ContentItem[] = [
  {
    id: "61ea30fd-4970-4d56-93f2-58abf7810462",
    content_type: "photo_ocr",
    content_text: "테스트 독서 기록",
    page_number: 42,
    source_id: "4ffd9fe4-5807-4af4-8dc5-577722cbe0d0",
  },
];

Deno.test("mind-map provider prompt replaces persistent identifiers", () => {
  const { providerContents, storedIdByProviderId } = prepareProviderContents(
    contents,
  );
  const prompt = formatProviderContents(providerContents);

  assertEquals(providerContents[0].id, "record-1");
  assertEquals(
    storedIdByProviderId.get("record-1"),
    "61ea30fd-4970-4d56-93f2-58abf7810462",
  );
  assertStringIncludes(prompt, "[record-1] 사진 속 텍스트 (42페이지)");
  assertStringIncludes(prompt, "테스트 독서 기록");
  assertFalse(prompt.includes("61ea30fd-4970-4d56-93f2-58abf7810462"));
  assertFalse(prompt.includes("4ffd9fe4-5807-4af4-8dc5-577722cbe0d0"));
});
