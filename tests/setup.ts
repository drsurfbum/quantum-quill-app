// Tests cannot import a real database integration, even if DATABASE_URL is set.
jest.mock("../server/db", () => { throw new Error("Database access is forbidden in the isolated test suite"); });
jest.mock("../server/database-storage", () => { throw new Error("Use injected MemStorage for isolated tests"); });
