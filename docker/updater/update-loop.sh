#!/bin/sh
# Watches a shared IPC dir for a trigger file and applies a stack update by
# pulling the latest images and recreating backend + admin. Intentionally NOT
# parameterised — the action is fixed regardless of the trigger file content,
# so the privileged Docker socket cannot be abused for arbitrary commands.

IPC="${UPDATE_IPC_DIR:-/ipc}"
WORKDIR="${COMPOSE_PROJECT_DIR:-/workspace}"
CF="${COMPOSE_FILE:-docker-compose.prod.yml}"
STAMP() { date -u +%Y-%m-%dT%H:%M:%SZ; }

mkdir -p "$IPC"
# /ipc is a shared docker volume, root-owned by default. The backend runs as
# uid 1000 (node) and must create the trigger file there, so hand it the dir.
# Files the updater writes (status/log) stay root-owned; the backend only reads
# those, so there is no cross-container write conflict.
chown -R 1000:1000 "$IPC" 2>/dev/null || true
[ -f "$IPC/status" ] || echo "idle" > "$IPC/status"
echo "[updater] watching $IPC/trigger (compose: $WORKDIR/$CF)"

while true; do
  if [ -f "$IPC/trigger" ]; then
    rm -f "$IPC/trigger"
    : > "$IPC/log"
    echo "in_progress" > "$IPC/status"
    STAMP > "$IPC/started_at"
    echo "[updater] $(STAMP) update requested" >> "$IPC/log"

    if (
        cd "$WORKDIR" || exit 1
        docker compose -f "$CF" pull backend admin &&
        docker compose -f "$CF" up -d backend admin
      ) >> "$IPC/log" 2>&1; then
      echo "success" > "$IPC/status"
      echo "[updater] $(STAMP) update finished: success" >> "$IPC/log"
    else
      echo "failed" > "$IPC/status"
      echo "[updater] $(STAMP) update finished: FAILED" >> "$IPC/log"
    fi
    STAMP > "$IPC/finished_at"
  fi
  sleep 3
done
