import "server-only";

export {
  bookDtoSelect,
  parseBookRow,
} from "./api/codec";
export {
  createBook,
  deleteBook,
  getBook,
  listBooks,
  updateBook,
  type BookListData,
} from "./api/index.server";
export { fetchOwnedBook } from "./api/fetch-owned-book";
export {
  fetchOwnedBookDetail,
  type OwnedBookDetailQueryResult,
} from "./api/fetch-owned-book-detail";
export {
  applyBookDetailFixtureAction,
  fixtureUserId,
  getBookDetailFixture,
  getBookDetailFixtureConsumerBook,
} from "./model/book-detail-fixtures";
export {
  getBookLifecycleFixture,
  getBookLifecycleFixtureBook,
  getBookLifecycleFixtureConsumerBook,
} from "./model/book-lifecycle-fixtures";
