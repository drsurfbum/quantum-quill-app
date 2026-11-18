-- Additive and repeatable. Existing accounts start with MCP disabled and no key.
CREATE TABLE IF NOT EXISTS agent_access (
  user_id integer PRIMARY KEY REFERENCES users(id),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  permissions jsonb NOT NULL,
  token_hash text
);
