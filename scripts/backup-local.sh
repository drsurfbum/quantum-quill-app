#!/usr/bin/env bash
# Local-only backup. Stop the app first for a consistent database/uploads pair.
set -euo pipefail
umask 077
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
if lsof -nP -iTCP:5055 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Stop the local app on port 5055 before taking a paired backup."
  exit 1
fi
mkdir -p "$repo_root/.local/backups"
backup_dir="$(mktemp -d "$repo_root/.local/backups/$(date -u +%Y%m%dT%H%M%SZ)-local.XXXXXX")"
pg_dump -h "/tmp/quantum-quill-$(id -u)" -p 55432 -U qq_local -Fc -f "$backup_dir/database.dump" quantum_quill
tar -czf "$backup_dir/uploads.tar.gz" -C "$repo_root" uploads
(cd "$backup_dir" && shasum -a 256 database.dump uploads.tar.gz > SHA256SUMS)
echo "$backup_dir"
