export const FIXTURE_NAMESPACE = "bookgolas-web-parity"

export const FIXTURE_IDS = Object.freeze({
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  bookA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bookB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  imageA: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
  imageB: "bbbbbbbb-bbbb-4bbb-8bbb-000000000002",
})

export const FIXTURE_USERS = Object.freeze([
  Object.freeze({ key: "userA", id: FIXTURE_IDS.userA, handle: "fixture-user-a" }),
  Object.freeze({ key: "userB", id: FIXTURE_IDS.userB, handle: "fixture-user-b" }),
])

export const FIXTURE_BOOKS = Object.freeze([
  Object.freeze({
    key: "bookA",
    id: FIXTURE_IDS.bookA,
    owner: "userA",
    title: "Fixture Book A",
    imageKey: "imageA",
  }),
  Object.freeze({
    key: "bookB",
    id: FIXTURE_IDS.bookB,
    owner: "userB",
    title: "Fixture Book B",
    imageKey: "imageB",
  }),
])

export const FIXTURE_IMAGES = Object.freeze([
  Object.freeze({ key: "imageA", id: FIXTURE_IDS.imageA, owner: "userA", book: "bookA" }),
  Object.freeze({ key: "imageB", id: FIXTURE_IDS.imageB, owner: "userB", book: "bookB" }),
])

export function fixtureEmail(handle) {
  return `${FIXTURE_NAMESPACE}-${handle}@fixture.invalid`
}

export function fixtureManifest() {
  return Object.freeze({
    namespace: FIXTURE_NAMESPACE,
    users: FIXTURE_USERS,
    books: FIXTURE_BOOKS,
    images: FIXTURE_IMAGES,
  })
}
