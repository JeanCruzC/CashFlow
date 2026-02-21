#!/usr/bin/env bash
set -u
set -o pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT_DIR/.run"
LOG_DIR="$RUNTIME_DIR/logs"
CONFIG_FILE="$RUNTIME_DIR/menu.env"

FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"

mkdir -p "$LOG_DIR"

# Defaults
DEFAULT_FRONTEND_CMD="npm run dev -- --hostname 127.0.0.1 --port 3001"
DEFAULT_BACKEND_ENABLED="0"
DEFAULT_BACKEND_START_CMD=""
DEFAULT_BACKEND_STOP_CMD=""
DEFAULT_BACKEND_STATUS_CMD=""

# Runtime config vars
FRONTEND_CMD=""
BACKEND_ENABLED=""
BACKEND_START_CMD=""
BACKEND_STOP_CMD=""
BACKEND_STATUS_CMD=""

print_line() {
  printf "%s\n" "$*"
}

file_size_bytes() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    printf "0"
    return 0
  fi
  wc -c <"$file" 2>/dev/null | tr -d ' '
}

first_word() {
  printf "%s" "$1" | awk '{print $1}'
}

command_exists_from_cmd() {
  local cmd="$1"
  local bin
  bin="$(first_word "$cmd")"
  if [[ -z "$bin" ]]; then
    return 1
  fi
  command -v "$bin" >/dev/null 2>&1
}

save_config() {
  mkdir -p "$RUNTIME_DIR"
  cat >"$CONFIG_FILE" <<CFG
FRONTEND_CMD=$(printf '%q' "$FRONTEND_CMD")
BACKEND_ENABLED=$(printf '%q' "$BACKEND_ENABLED")
BACKEND_START_CMD=$(printf '%q' "$BACKEND_START_CMD")
BACKEND_STOP_CMD=$(printf '%q' "$BACKEND_STOP_CMD")
BACKEND_STATUS_CMD=$(printf '%q' "$BACKEND_STATUS_CMD")
CFG
}

load_config() {
  local cfg_frontend_cmd="$DEFAULT_FRONTEND_CMD"
  local cfg_backend_enabled="$DEFAULT_BACKEND_ENABLED"
  local cfg_backend_start="$DEFAULT_BACKEND_START_CMD"
  local cfg_backend_stop="$DEFAULT_BACKEND_STOP_CMD"
  local cfg_backend_status="$DEFAULT_BACKEND_STATUS_CMD"

  if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"

    cfg_frontend_cmd="${FRONTEND_CMD:-$cfg_frontend_cmd}"
    cfg_backend_enabled="${BACKEND_ENABLED:-$cfg_backend_enabled}"
    cfg_backend_start="${BACKEND_START_CMD:-$cfg_backend_start}"
    cfg_backend_stop="${BACKEND_STOP_CMD:-$cfg_backend_stop}"
    cfg_backend_status="${BACKEND_STATUS_CMD:-$cfg_backend_status}"
  fi

  FRONTEND_CMD="${FRONTEND_CMD:-$cfg_frontend_cmd}"
  BACKEND_ENABLED="${BACKEND_ENABLED:-$cfg_backend_enabled}"
  BACKEND_START_CMD="${BACKEND_START_CMD:-$cfg_backend_start}"
  BACKEND_STOP_CMD="${BACKEND_STOP_CMD:-$cfg_backend_stop}"
  BACKEND_STATUS_CMD="${BACKEND_STATUS_CMD:-$cfg_backend_status}"

  if [[ "$BACKEND_ENABLED" != "0" && "$BACKEND_ENABLED" != "1" ]]; then
    BACKEND_ENABLED="0"
  fi
}

frontend_is_running() {
  if [[ ! -f "$FRONTEND_PID_FILE" ]]; then
    local fallback_pid
    fallback_pid="$(find_frontend_process_pid || true)"
    if [[ -n "$fallback_pid" ]]; then
      echo "$fallback_pid" >"$FRONTEND_PID_FILE"
      return 0
    fi
    return 1
  fi

  local pid
  pid="$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)"

  if [[ -z "$pid" ]]; then
    rm -f "$FRONTEND_PID_FILE"
    return 1
  fi

  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  local fallback_pid
  fallback_pid="$(find_frontend_process_pid || true)"
  if [[ -n "$fallback_pid" ]]; then
    echo "$fallback_pid" >"$FRONTEND_PID_FILE"
    return 0
  fi

  rm -f "$FRONTEND_PID_FILE"
  return 1
}

find_frontend_process_pid() {
  local pids
  pids="$(list_frontend_process_pids || true)"
  if [[ -z "$pids" ]]; then
    return 1
  fi

  printf "%s\n" "$pids" | tail -n 1
}

list_frontend_process_pids() {
  ps -eo pid=,args= 2>/dev/null | awk -v root="$ROOT_DIR" '
    index($0, root "/node_modules/.bin/next dev") || index($0, root "/node_modules/next/dist/bin/next dev") {
      print $1
    }
  '
}

frontend_url_from_log() {
  [[ -f "$FRONTEND_LOG" ]] || return 1

  local url=""
  url="$(grep -E 'Local:|url:' "$FRONTEND_LOG" 2>/dev/null | grep -Eo 'https?://[^ ]+' | tail -n 1 || true)"

  if [[ -z "$url" ]]; then
    url="$(grep -Eo 'https?://(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0):[0-9]+' "$FRONTEND_LOG" 2>/dev/null | tail -n 1 || true)"
  fi

  if [[ -z "$url" ]]; then
    return 1
  fi

  url="${url/0.0.0.0/localhost}"
  printf "%s" "$url"
}

frontend_port_from_pid() {
  local pid="$1"
  local port=""

  if command -v lsof >/dev/null 2>&1; then
    port="$(lsof -Pan -p "$pid" -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $9}' | grep -Eo '[0-9]+$' | head -n 1 || true)"
  fi

  if [[ -z "$port" ]] && command -v ss >/dev/null 2>&1; then
    port="$(ss -ltnp 2>/dev/null | awk -v pid="$pid" '$0 ~ ("pid=" pid ",") {print $4}' | grep -Eo '[0-9]+$' | head -n 1 || true)"
  fi

  if [[ -z "$port" ]]; then
    return 1
  fi

  printf "%s" "$port"
}

frontend_runtime_url() {
  local url=""
  url="$(frontend_url_from_log || true)"
  if [[ -n "$url" ]]; then
    printf "%s" "$url"
    return 0
  fi

  if ! frontend_is_running; then
    return 1
  fi

  local pid port
  pid="$(cat "$FRONTEND_PID_FILE")"
  port="$(frontend_port_from_pid "$pid" || true)"
  if [[ -z "$port" ]]; then
    return 1
  fi

  printf "http://localhost:%s" "$port"
}

frontend_localhost_fallback_cmd() {
  local cmd="$1"

  if [[ "$cmd" == *"--hostname"* || "$cmd" == *"-H "* ]]; then
    return 1
  fi

  if [[ "$cmd" == npm\ run\ dev* ]]; then
    if [[ "$cmd" == *" -- "* ]]; then
      printf "%s --hostname 127.0.0.1 --port 3001" "$cmd"
    else
      printf "%s -- --hostname 127.0.0.1 --port 3001" "$cmd"
    fi
    return 0
  fi

  if [[ "$cmd" == *"next dev"* ]]; then
    printf "%s --hostname 127.0.0.1 --port 3001" "$cmd"
    return 0
  fi

  return 1
}

frontend_log_tail() {
  local lines="${1:-200}"
  [[ -f "$FRONTEND_LOG" ]] || return 1
  tail -n "$lines" "$FRONTEND_LOG" 2>/dev/null || true
}

frontend_log_since_offset() {
  local offset="${1:-0}"
  [[ -f "$FRONTEND_LOG" ]] || return 1

  local start=$((offset + 1))
  if [[ $start -lt 1 ]]; then
    start=1
  fi
  tail -c +"$start" "$FRONTEND_LOG" 2>/dev/null || true
}

frontend_log_has_recent() {
  local pattern="$1"
  frontend_log_tail 250 | grep -Eq "$pattern"
}

frontend_log_has_since() {
  local pattern="$1"
  local offset="${2:-0}"
  frontend_log_since_offset "$offset" | grep -Eq "$pattern"
}

frontend_cache_cleanup() {
  print_line "Limpiando caché de Next (.next)..."
  rm -rf "$ROOT_DIR/.next"
}

frontend_http_status() {
  local url="$1"
  if ! command -v curl >/dev/null 2>&1; then
    return 1
  fi

  curl -ksS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || true
}

frontend_wait_until_ready() {
  local pid="$1"
  local attempts="${2:-40}"
  local log_offset="${3:-0}"
  local i=0

  while [[ $i -lt $attempts ]]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      local fallback_pid
      fallback_pid="$(find_frontend_process_pid || true)"
      if [[ -n "$fallback_pid" ]]; then
        echo "$fallback_pid" >"$FRONTEND_PID_FILE"
        pid="$fallback_pid"
      else
        return 1
      fi
    fi

    if frontend_log_has_since "Failed to start server|Error: listen EPERM" "$log_offset"; then
      return 2
    fi

    if frontend_log_has_since "Module not found: Error: Can't resolve './sentry\\.client\\.config\\.ts'" "$log_offset"; then
      return 3
    fi

    if frontend_log_has_since "Ready in" "$log_offset"; then
      return 0
    fi

    sleep 0.5
    i=$((i + 1))
  done

  return 4
}

cleanup_frontend_process() {
  local pid="$1"
  local remove_pid_file="${2:-1}"

  if kill -0 "$pid" 2>/dev/null; then
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      pkill -KILL -P "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  if [[ "$remove_pid_file" == "1" ]]; then
    rm -f "$FRONTEND_PID_FILE"
  fi
}

cleanup_stale_frontend_processes() {
  local stale_pids=""
  stale_pids="$(list_frontend_process_pids || true)"

  if [[ -z "$stale_pids" ]]; then
    return 0
  fi

  local pid
  for pid in $stale_pids; do
    if [[ -f "$FRONTEND_PID_FILE" ]] && [[ "$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)" == "$pid" ]]; then
      continue
    fi

    if kill -0 "$pid" 2>/dev/null; then
      print_line "Deteniendo proceso frontend huérfano (PID $pid)..."
      cleanup_frontend_process "$pid" "0"
    fi
  done
}

wait_for_frontend_url() {
  local attempts="${1:-20}"
  local i url
  i=0

  while [[ $i -lt $attempts ]]; do
    url="$(frontend_runtime_url || true)"
    if [[ -n "$url" ]]; then
      printf "%s" "$url"
      return 0
    fi
    sleep 0.5
    i=$((i + 1))
  done

  return 1
}

print_frontend_runtime_info() {
  if ! frontend_is_running; then
    print_line "Frontend: detenido."
    return 0
  fi

  local pid url port
  pid="$(cat "$FRONTEND_PID_FILE")"
  url="$(frontend_runtime_url || true)"

  print_line "Frontend: corriendo (PID $pid)."
  if [[ -n "$url" ]]; then
    port="$(printf "%s" "$url" | grep -Eo ':[0-9]+' | tail -n 1 | tr -d ':' || true)"
    print_line "Frontend URL: $url"
    if [[ -n "$port" ]]; then
      print_line "Frontend puerto: $port"
    fi
  else
    print_line "Frontend URL: no detectada todavía."
  fi
  print_line "Frontend log: $FRONTEND_LOG"
}

start_frontend() {
  if frontend_is_running; then
    print_line "Frontend ya está en ejecución."
    print_frontend_runtime_info
    return 0
  fi

  cleanup_stale_frontend_processes

  local attempt=0
  while [[ $attempt -lt 2 ]]; do
    print_line "Iniciando frontend: $FRONTEND_CMD"
    local log_offset
    log_offset="$(file_size_bytes "$FRONTEND_LOG")"
    print_line "==== START $(date '+%Y-%m-%d %H:%M:%S') ====" >>"$FRONTEND_LOG"
    nohup bash -lc "cd '$ROOT_DIR' && $FRONTEND_CMD" >>"$FRONTEND_LOG" 2>&1 &
    local pid=$!
    sleep 1

    if ! kill -0 "$pid" 2>/dev/null; then
      print_line "No se pudo iniciar frontend. Revisa log: $FRONTEND_LOG"
      tail -n 40 "$FRONTEND_LOG" 2>/dev/null || true
      return 1
    fi

    echo "$pid" >"$FRONTEND_PID_FILE"
    frontend_wait_until_ready "$pid" 40 "$log_offset"
    local ready_rc=$?

    if [[ $ready_rc -eq 3 ]]; then
      print_line "Detectado error de caché (sentry.client.config.ts inexistente)."
      cleanup_frontend_process "$pid"
      if [[ $attempt -eq 0 ]]; then
        frontend_cache_cleanup
        attempt=$((attempt + 1))
        continue
      fi
    fi

    if [[ $ready_rc -eq 2 || $ready_rc -eq 1 ]]; then
      cleanup_frontend_process "$pid"
      print_line "Frontend falló durante el arranque. Revisa log: $FRONTEND_LOG"
      if frontend_log_has_since "Error: listen EPERM" "$log_offset"; then
        local fallback_cmd=""
        fallback_cmd="$(frontend_localhost_fallback_cmd "$FRONTEND_CMD" || true)"
        if [[ -n "$fallback_cmd" && "$fallback_cmd" != "$FRONTEND_CMD" && $attempt -eq 0 ]]; then
          print_line "EPERM al abrir 0.0.0.0. Reintentando en localhost: $fallback_cmd"
          FRONTEND_CMD="$fallback_cmd"
          save_config
          attempt=$((attempt + 1))
          continue
        fi
        print_line "Sugerencia: configura frontend en localhost explícito:"
        print_line "  ./menu.sh"
        print_line "  opción 12 -> npm run dev -- --hostname 127.0.0.1 --port 3001"
      fi
      frontend_log_since_offset "$log_offset" | tail -n 80 2>/dev/null || true
      return 1
    fi

    print_line "Frontend iniciado (PID $pid)."
    local url
    url="$(wait_for_frontend_url 30 || true)"
    if [[ -n "$url" ]]; then
      local port
      port="$(printf "%s" "$url" | grep -Eo ':[0-9]+' | tail -n 1 | tr -d ':' || true)"
      print_line "Frontend URL: $url"
      if [[ -n "$port" ]]; then
        print_line "Frontend puerto: $port"
      fi

      local http_status
      http_status="$(frontend_http_status "$url" || true)"
      if [[ "$http_status" == "500" ]] && frontend_log_has_recent "Module not found: Error: Can't resolve './sentry\\.client\\.config\\.ts'"; then
        print_line "Frontend responde 500 por caché vieja de Next. Ejecuta: ./menu.sh repair-frontend"
      fi
    else
      print_line "Frontend URL/puerto: todavía no detectado."
    fi
    print_line "Frontend log: $FRONTEND_LOG"
    return 0
  done

  print_line "No se pudo iniciar frontend. Revisa log: $FRONTEND_LOG"
  tail -n 60 "$FRONTEND_LOG" 2>/dev/null || true
  return 1
}

stop_frontend() {
  if ! frontend_is_running; then
    print_line "Frontend no está corriendo."
    cleanup_stale_frontend_processes
    return 0
  fi

  local pid
  pid="$(cat "$FRONTEND_PID_FILE")"
  print_line "Deteniendo frontend (PID $pid)..."
  cleanup_frontend_process "$pid"
  cleanup_stale_frontend_processes
  print_line "Frontend detenido."
}

repair_frontend() {
  print_line "Reparando frontend (stop + limpiar .next + start)..."
  stop_frontend || true
  frontend_cache_cleanup
  start_frontend
}

backend_is_enabled() {
  [[ "$BACKEND_ENABLED" == "1" ]]
}

run_backend_command() {
  local action="$1"
  local cmd="$2"
  local required="$3"

  if ! backend_is_enabled; then
    print_line "Backend desactivado en configuración."
    return 0
  fi

  if [[ -z "$cmd" ]]; then
    if [[ "$required" == "required" ]]; then
      print_line "Comando de backend no configurado para: $action"
      return 1
    fi
    print_line "Comando de backend no configurado para: $action"
    return 0
  fi

  if ! command_exists_from_cmd "$cmd"; then
    print_line "No encuentro el binario para backend: '$cmd'"
    print_line "Usa opción 11 del menú para configurar backend."
    return 1
  fi

  print_line "Backend ($action): $cmd"
  if bash -lc "cd '$ROOT_DIR' && $cmd" >>"$BACKEND_LOG" 2>&1; then
    print_line "Backend ($action) completado. Log: $BACKEND_LOG"
    return 0
  fi

  print_line "Backend ($action) falló. Revisa log: $BACKEND_LOG"
  tail -n 30 "$BACKEND_LOG" 2>/dev/null || true
  return 1
}

start_backend() {
  run_backend_command "start" "$BACKEND_START_CMD" "required"
}

stop_backend() {
  run_backend_command "stop" "$BACKEND_STOP_CMD" "optional"
}

status_backend() {
  if ! backend_is_enabled; then
    print_line "Backend: desactivado (modo cloud o externo)."
    return 0
  fi

  if [[ -z "$BACKEND_STATUS_CMD" ]]; then
    print_line "Backend status: sin comando de estado (define BACKEND_STATUS_CMD)."
    return 0
  fi

  if ! command_exists_from_cmd "$BACKEND_STATUS_CMD"; then
    print_line "Backend status: no encuentro el binario para '$BACKEND_STATUS_CMD'."
    return 0
  fi

  print_line "Backend status:"
  bash -lc "cd '$ROOT_DIR' && $BACKEND_STATUS_CMD" || true
}

status_frontend() {
  print_frontend_runtime_info
}

start_all() {
  local rc=0
  start_backend || rc=1
  start_frontend || rc=1
  return $rc
}

stop_all() {
  local rc=0
  stop_frontend || rc=1
  stop_backend || rc=1
  return $rc
}

restart_all() {
  local rc=0
  stop_all || rc=1
  start_all || rc=1
  return $rc
}

status_all() {
  status_frontend
  status_backend
}

tail_frontend_log() {
  print_line "Mostrando log frontend (Ctrl+C para salir): $FRONTEND_LOG"
  touch "$FRONTEND_LOG"
  tail -f "$FRONTEND_LOG"
}

tail_backend_log() {
  print_line "Mostrando log backend (Ctrl+C para salir): $BACKEND_LOG"
  touch "$BACKEND_LOG"
  tail -f "$BACKEND_LOG"
}

configure_backend() {
  print_line ""
  print_line "Configurar backend:"
  print_line "1) Desactivado (recomendado si usas Supabase cloud)"
  print_line "2) Supabase local (supabase start/stop/status)"
  print_line "3) Comandos personalizados"
  read -r -p "Elige una opción [1-3]: " cfg

  case "$cfg" in
    1)
      BACKEND_ENABLED="0"
      BACKEND_START_CMD=""
      BACKEND_STOP_CMD=""
      BACKEND_STATUS_CMD=""
      save_config
      print_line "Backend desactivado y configuración guardada."
      ;;
    2)
      BACKEND_ENABLED="1"
      BACKEND_START_CMD="supabase start"
      BACKEND_STOP_CMD="supabase stop"
      BACKEND_STATUS_CMD="supabase status"
      save_config
      print_line "Backend configurado para Supabase local."
      ;;
    3)
      local start_cmd stop_cmd status_cmd
      read -r -p "Comando start backend: " start_cmd
      read -r -p "Comando stop backend (puede quedar vacío): " stop_cmd
      read -r -p "Comando status backend (puede quedar vacío): " status_cmd

      BACKEND_ENABLED="1"
      BACKEND_START_CMD="$start_cmd"
      BACKEND_STOP_CMD="$stop_cmd"
      BACKEND_STATUS_CMD="$status_cmd"
      save_config
      print_line "Backend personalizado guardado."
      ;;
    *)
      print_line "Opción inválida."
      ;;
  esac
}

configure_frontend() {
  read -r -p "Comando frontend actual '$FRONTEND_CMD'. Nuevo comando (enter para mantener): " new_cmd
  if [[ -n "$new_cmd" ]]; then
    FRONTEND_CMD="$new_cmd"
    save_config
    print_line "Comando frontend actualizado."
  else
    print_line "Sin cambios en frontend."
  fi
}

show_config() {
  print_line ""
  print_line "Configuración actual:"
  print_line "  FRONTEND_CMD=$FRONTEND_CMD"
  print_line "  BACKEND_ENABLED=$BACKEND_ENABLED"
  print_line "  BACKEND_START_CMD=$BACKEND_START_CMD"
  print_line "  BACKEND_STOP_CMD=$BACKEND_STOP_CMD"
  print_line "  BACKEND_STATUS_CMD=$BACKEND_STATUS_CMD"
  print_line "  CONFIG_FILE=$CONFIG_FILE"
}

print_menu() {
  cat <<MENU

================ CashFlow Service Menu ================
1) Iniciar backend + frontend
2) Detener backend + frontend
3) Reiniciar backend + frontend
4) Iniciar solo frontend
5) Detener solo frontend
6) Iniciar solo backend
7) Detener solo backend
8) Ver estado
9) Ver log frontend
10) Ver log backend
11) Configurar backend
12) Configurar comando frontend
13) Ver configuración actual
14) Reparar frontend (limpiar cache .next)
0) Salir
=======================================================
MENU
}

run_menu_option() {
  local option="$1"
  case "$option" in
    1) start_all ;;
    2) stop_all ;;
    3) restart_all ;;
    4) start_frontend ;;
    5) stop_frontend ;;
    6) start_backend ;;
    7) stop_backend ;;
    8) status_all ;;
    9) tail_frontend_log ;;
    10) tail_backend_log ;;
    11) configure_backend ;;
    12) configure_frontend ;;
    13) show_config ;;
    14) repair_frontend ;;
    0) return 10 ;;
    *)
      print_line "Opción inválida."
      return 1
      ;;
  esac
}

menu_once() {
  print_menu
  read -r -p "Elige una opción: " option
  run_menu_option "$option"
  return $?
}

menu_loop() {
  while true; do
    menu_once
    local rc=$?
    if [[ $rc -eq 0 ]]; then
      continue
    fi
    if [[ $rc -eq 10 ]]; then
      break
    fi
  done
}

print_usage() {
  cat <<USAGE
Uso:
  ./menu.sh               # menú 1 sola acción y salida
  ./menu.sh menu-loop     # menú continuo (repite opciones)
  ./menu.sh start         # inicia backend + frontend
  ./menu.sh stop          # detiene backend + frontend
  ./menu.sh restart       # reinicia backend + frontend
  ./menu.sh status        # muestra estado
  ./menu.sh start-frontend
  ./menu.sh stop-frontend
  ./menu.sh start-backend
  ./menu.sh stop-backend
  ./menu.sh config-backend
  ./menu.sh show-config
  ./menu.sh repair-frontend

Persistencia de configuración:
  $CONFIG_FILE
USAGE
}

main() {
  load_config

  local action="${1:-menu}"

  case "$action" in
    menu)
      menu_once
      local rc=$?
      if [[ $rc -eq 10 ]]; then
        return 0
      fi
      return "$rc"
      ;;
    menu-loop) menu_loop ;;
    start) start_all ;;
    stop) stop_all ;;
    restart) restart_all ;;
    status) status_all ;;
    start-frontend) start_frontend ;;
    stop-frontend) stop_frontend ;;
    start-backend) start_backend ;;
    stop-backend) stop_backend ;;
    config-backend) configure_backend ;;
    show-config) show_config ;;
    repair-frontend) repair_frontend ;;
    help|-h|--help) print_usage ;;
    *)
      print_line "Acción no válida: $action"
      print_usage
      return 1
      ;;
  esac
}

main "$@"
