import { describe, expect, it } from "vitest";
import {
  getRecallFixtureDelete,
  getRecallFixtureForbiddenMarkers,
  getRecallFixtureHistory,
  getRecallFixtureSearch,
  getRecallFixtureSourceImage,
  recallFixtureBookId,
  recallFixturePhotoId,
  recallFixtureSecondBookId,
} from "./recall-fixtures";

describe("Recall fixtures", () => {
  it("covers global groups and book-scoped history", () => {
    const global = getRecallFixtureHistory({ fixture: "recall-happy", scope: "global", bookId: null, cursor: null, limit: 10 });
    expect(global).toMatchObject({ ok: true, value: { scope: "global", suggestions: expect.arrayContaining(["attention"]) } });
    const search = getRecallFixtureSearch({ fixture: "recall-happy", scope: "global", bookId: null });
    expect(search).toMatchObject({ ok: true, value: { result: { sourcesByBook: { [recallFixtureBookId]: expect.any(Array), [recallFixtureSecondBookId]: expect.any(Array) } } } });
    const book = getRecallFixtureHistory({ fixture: "recall-happy", scope: "book", bookId: recallFixtureBookId, cursor: null, limit: 10 });
    expect(book).toMatchObject({ ok: true, value: { scope: "book", bookId: recallFixtureBookId } });
  });

  it("keeps failures and empty results distinct", () => {
    expect(getRecallFixtureSearch({ fixture: "recall-consent", scope: "global", bookId: null })).toMatchObject({ ok: false, error: { code: "consent_required", status: 403 } });
    expect(getRecallFixtureSearch({ fixture: "recall-quota", scope: "global", bookId: null })).toMatchObject({ ok: false, error: { code: "quota_exceeded", status: 429 } });
    expect(getRecallFixtureSearch({ fixture: "recall-provider", scope: "global", bookId: null })).toMatchObject({ ok: false, error: { code: "provider_error", status: 502 } });
    expect(getRecallFixtureSearch({ fixture: "recall-offline", scope: "global", bookId: null })).toMatchObject({ ok: false, error: { code: "offline", status: 503 } });
    expect(getRecallFixtureSearch({ fixture: "recall-empty", scope: "global", bookId: null })).toMatchObject({ ok: true, value: { result: { answer: "", sources: [] } } });
  });

  it("never includes foreign markers and keeps image URLs signed", () => {
    const foreign = getRecallFixtureSearch({ fixture: "recall-foreign", scope: "global", bookId: null });
    expect(JSON.stringify(foreign)).not.toContain("Foreign private title");
    expect(getRecallFixtureForbiddenMarkers()).toContain("foreign-user-id");
    const image = getRecallFixtureSourceImage({ fixture: "recall-image", bookId: recallFixtureSecondBookId, sourceId: recallFixturePhotoId });
    expect(image).toMatchObject({ ok: true, value: { signedUrl: expect.stringMatching(/^https:\/\/.+token=/) } });
    expect(getRecallFixtureDelete("00000000-0000-4000-8000-000000004331")).toMatchObject({ ok: true, value: { deleted: true } });
  });
});
