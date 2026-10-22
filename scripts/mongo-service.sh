#!/usr/bin/env bash
# Manage the local MongoDB service for Story Builder.
# Supports systemd user service, Docker Compose, and direct daemon fallback.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

get_mongo_port() {
  local uri hostport host port
  uri="$(env_value MONGO_URI "$ROOT/.env")"
  uri="${uri:-mongodb://127.0.0.1/story-builder}"
  hostport="${uri#mongodb://}"
  hostport="${hostport%%/*}"
  hostport="${hostport##*@}"
  host="${hostport%%:*}"
  port="${hostport##*:}"
  if [[ "$port" == "$host" || -z "$port" ]]; then port=27017; fi
  printf '%s' "$port"
}

get_mongo_host() {
  local uri hostport host
  uri="$(env_value MONGO_URI "$ROOT/.env")"
  uri="${uri:-mongodb://127.0.0.1/story-builder}"
  hostport="${uri#mongodb://}"
  hostport="${hostport%%/*}"
  hostport="${hostport##*@}"
  host="${hostport%%:*}"
  if [[ -z "$host" ]]; then host=127.0.0.1; fi
  printf '%s' "$host"
}

is_systemd_user_service_active() {
  has_cmd systemctl && systemctl --user is-active --quiet mongod 2>/dev/null
}

is_docker_container_running() {
  if has_cmd docker; then
    docker ps --filter "name=story-builder-mongodb" --filter "status=running" -q 2>/dev/null | grep -q .
  else
    return 1
  fi
}

install_user_service() {
  log "installing systemd user service for MongoDB..."
  local mongod_bin
  mongod_bin="$(command -v mongod 2>/dev/null || true)"
  if [[ -z "$mongod_bin" && -x "$HOME/.local/bin/mongod" ]]; then
    mongod_bin="$HOME/.local/bin/mongod"
  fi
  if [[ -z "$mongod_bin" ]]; then
    die "mongod executable not found. Place it in ~/.local/bin/mongod or install via your package manager."
  fi

  local data_dir="$HOME/.local/share/mongodb/data"
  local log_dir="$HOME/.local/share/mongodb/log"
  local conf_dir="$HOME/.config/mongodb"
  local conf_file="$conf_dir/mongod.conf"
  local service_dir="$HOME/.config/systemd/user"
  local service_file="$service_dir/mongod.service"

  mkdir -p "$data_dir" "$log_dir" "$conf_dir" "$service_dir"

  if [[ ! -f "$conf_file" ]]; then
    cat >"$conf_file" <<EOF
storage:
  dbPath: $data_dir

systemLog:
  destination: file
  logAppend: true
  path: $log_dir/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1
EOF
    ok "created config $conf_file"
  fi

  cat >"$service_file" <<EOF
[Unit]
Description=MongoDB Database Server (User Service)
Documentation=https://docs.mongodb.com/manual
After=network.target

[Service]
Type=simple
ExecStart=$mongod_bin --config $conf_file
Restart=always
RestartSec=5
TimeoutSec=30

[Install]
WantedBy=default.target
EOF
  ln -sf mongod.service "$service_dir/mongodb.service"
  systemctl --user daemon-reload
  systemctl --user enable mongod.service
  ok "systemd user service installed: mongod.service (alias: mongodb.service)"
}

start_service() {
  local host port i
  host="$(get_mongo_host)"
  port="$(get_mongo_port)"

  if port_open "$port" "$host"; then
    ok "MongoDB is already running and reachable at ${host}:${port}"
    return 0
  fi

  log "starting MongoDB service for ${host}:${port}..."

  # 1. Try systemd user service
  if has_cmd systemctl; then
    if systemctl --user list-unit-files mongod.service >/dev/null 2>&1 || [[ -f "$HOME/.config/systemd/user/mongod.service" ]]; then
      systemctl --user start mongod >/dev/null 2>&1 || true
    fi
  fi

  # 2. Try Docker Compose if port still not open
  if ! port_open "$port" "$host"; then
    if [[ -f "$ROOT/docker-compose.yml" ]]; then
      if has_cmd docker && docker compose version >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
        (cd "$ROOT" && docker compose up -d mongodb >/dev/null 2>&1 || true)
      elif has_cmd docker-compose && docker ps >/dev/null 2>&1; then
        (cd "$ROOT" && docker-compose up -d mongodb >/dev/null 2>&1 || true)
      fi
    fi
  fi

  # 3. Try system-level systemctl
  if ! port_open "$port" "$host" && has_cmd systemctl; then
    systemctl start mongod >/dev/null 2>&1 || true
  fi

  # Wait for port to open
  for i in {1..15}; do
    if port_open "$port" "$host"; then
      ok "MongoDB is up at ${host}:${port}"
      return 0
    fi
    sleep 1
  done

  die "failed to start MongoDB at ${host}:${port}. Check logs with: scripts/mongo-service.sh logs"
}

stop_service() {
  local stopped=0
  if is_systemd_user_service_active; then
    log "stopping systemd user service mongod..."
    systemctl --user stop mongod
    stopped=1
  fi

  if is_docker_container_running; then
    log "stopping docker container mongodb..."
    if has_cmd docker && docker compose version >/dev/null 2>&1; then
      (cd "$ROOT" && docker compose stop mongodb >/dev/null 2>&1 || true)
    elif has_cmd docker-compose; then
      (cd "$ROOT" && docker-compose stop mongodb >/dev/null 2>&1 || true)
    else
      docker stop story-builder-mongodb >/dev/null 2>&1 || true
    fi
    stopped=1
  fi

  if [[ "$stopped" == 1 ]]; then
    ok "MongoDB service stopped"
  else
    warn "no running MongoDB service detected (or already stopped)"
  fi
}

status_service() {
  local host port
  host="$(get_mongo_host)"
  port="$(get_mongo_port)"

  printf 'MongoDB Service Status:\n'
  printf '  Address:  %s:%s\n' "$host" "$port"

  if port_open "$port" "$host"; then
    ok "Status:   RUNNING (accepting connections on ${host}:${port})"
  else
    warn "Status:   NOT RUNNING (port ${port} closed)"
  fi

  if has_cmd systemctl && systemctl --user list-unit-files mongod.service >/dev/null 2>&1; then
    local ustate
    ustate="$(systemctl --user is-active mongod 2>/dev/null || printf 'inactive')"
    printf '  systemd --user mongod:  %s\n' "$ustate"
  fi

  if is_docker_container_running; then
    printf '  docker container:       running\n'
  elif has_cmd docker && [[ -f "$ROOT/docker-compose.yml" ]]; then
    printf '  docker container:       stopped\n'
  fi
}

show_logs() {
  if is_systemd_user_service_active || [[ -f "$HOME/.local/share/mongodb/log/mongod.log" ]]; then
    if [[ -f "$HOME/.local/share/mongodb/log/mongod.log" ]]; then
      tail -n 50 "$HOME/.local/share/mongodb/log/mongod.log"
    else
      journalctl --user -u mongod -n 50 --no-pager
    fi
  elif is_docker_container_running; then
    if has_cmd docker && docker compose version >/dev/null 2>&1; then
      (cd "$ROOT" && docker compose logs --tail=50 mongodb)
    else
      docker logs --tail=50 story-builder-mongodb
    fi
  else
    if [[ -f "$HOME/.local/share/mongodb/log/mongod.log" ]]; then
      tail -n 50 "$HOME/.local/share/mongodb/log/mongod.log"
    else
      warn "no log file found at ~/.local/share/mongodb/log/mongod.log"
    fi
  fi
}

usage() {
  cat <<'EOF'
Usage: scripts/mongo-service.sh <command>

Commands:
  start                  Start MongoDB (via systemd user service or Docker Compose)
  stop                   Stop MongoDB
  restart                Restart MongoDB
  status                 Show status of local MongoDB service
  logs                   Show recent logs
  install-user-service   Set up and enable systemd user service (~/.config/systemd/user/mongod.service)
  help                   Show this help
EOF
}

cmd="${1:-status}"
case "$cmd" in
  start) start_service ;;
  stop) stop_service ;;
  restart) stop_service; start_service ;;
  status) status_service ;;
  logs) show_logs ;;
  install-user-service) install_user_service ;;
  help | -h | --help) usage ;;
  *) usage; die "unknown command: $cmd" ;;
esac
