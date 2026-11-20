import { createRequire } from "node:module";
import { isAbsolute } from "node:path";
import { reject } from "./source";

// Node 24's built-in SQLite. The application's Node 20 declaration package predates it.
interface UsageDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...values: (number | string)[]): unknown;
    get(...values: (number | string)[]): Record<string, number>;
  };
  close(): void;
}
export class AssistantUsage {
  private db: UsageDatabase;
  constructor(
    path: string,
    private daily: number,
    private accountDaily: number,
  ) {
    if (
      (path !== ":memory:" && !isAbsolute(path)) ||
      ![daily, accountDaily].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 10000)
    )
      throw new Error("Invalid assistant allowance");
    const { DatabaseSync } = createRequire(process.cwd() + "/package.json")("node:sqlite");
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA busy_timeout=1500; CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY, account INTEGER NOT NULL, started INTEGER NOT NULL, active INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS attempts_time ON attempts(started)",
    );
  }
  reserve(account: number, now = Date.now()) {
    const day = Math.floor(now / 86400000) * 86400000;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM attempts WHERE started < ?").run(day - 86400000);
      const count = this.db
        .prepare(
          `SELECT count(*) FILTER (WHERE started>=?) AS daily,
        count(*) FILTER (WHERE account=? AND started>=?) AS personal,
        count(*) FILTER (WHERE account=? AND started>?) AS recent,
        count(*) FILTER (WHERE account=? AND started>? AND active=1) AS busy FROM attempts`,
        )
        .get(day, account, day, account, now - 60000, account, now - 90000);
      if (count.busy) reject(429, "A response is already running for this account.");
      if (count.recent >= 4) reject(429, "Wait a minute before asking another question.");
      if (count.daily >= this.daily || count.personal >= this.accountDaily)
        reject(429, "The daily assistant allowance is used. It resets at midnight UTC.");
      const { id } = this.db
        .prepare("INSERT INTO attempts(account,started,active) VALUES(?,?,1) RETURNING id")
        .get(account, now);
      this.db.exec("COMMIT");
      return () => {
        this.db.prepare("UPDATE attempts SET active=0 WHERE id=?").run(id);
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
