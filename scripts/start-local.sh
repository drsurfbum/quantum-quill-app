#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
socket_dir="/tmp/quantum-quill-$(id -u)"

if [[ ! -f .env || ! -f .local/postgres/PG_VERSION ]]; then
  echo "The local database has not been restored. See LOCAL_SETUP.md."
  exit 1
fi
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 24 ]]; then
  echo "Quantum Quill's local setup requires Node 24."
  exit 1
fi
mkdir -p "$socket_dir"
chmod 700 "$socket_dir" .local
if ! pg_ctl -D .local/postgres status >/dev/null 2>&1; then
  pg_ctl -D .local/postgres -l .local/postgres.log \
    -o "-k $socket_dir -p 55432 -h ''" start
fi

# Always target the restored local database from this launcher.
export DATABASE_URL="postgresql://qq_local@localhost:55432/quantum_quill?host=$socket_dir"
export NODE_ENV=development
export HOST=127.0.0.1
export PORT=5055
echo "Open http://127.0.0.1:5055 in your browser. Press Control-C to stop the app."
exec node --env-file=.env --import tsx server/index.ts
