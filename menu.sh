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
DEFAULT_FRONTEND_CMD="npm run dev"
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

  rm -f "$FRONTEND_PID_FILE"
  return 1
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

  print_line "Iniciando frontend: $FRONTEND_CMD"
  nohup bash -lc "cd '$ROOT_DIR' && $FRONTEND_CMD" >>"$FRONTEND_LOG" 2>&1 &
  local pid=$!
  sleep 1

  if kill -0 "$pid" 2>/dev/null; then
    echo "$pid" >"$FRONTEND_PID_FILE"
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
    else
      print_line "Frontend URL/puerto: todavía no detectado."
    fi
    print_line "Frontend log: $FRONTEND_LOG"
    return 0
  fi

  print_line "No se pudo iniciar frontend. Revisa log: $FRONTEND_LOG"
  tail -n 30 "$FRONTEND_LOG" 2>/dev/null || true
  return 1
}

stop_frontend() {
  if ! frontend_is_running; then
    print_line "Frontend no está corriendo."
    return 0
  fi

  local pid
  pid="$(cat "$FRONTEND_PID_FILE")"
  print_line "Deteniendo frontend (PID $pid)..."
  kill "$pid" 2>/dev/null || true

  local waited=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 1
    waited=$((waited + 1))
    if [[ $waited -ge 10 ]]; then
      print_line "Frontend sigue activo, enviando SIGKILL..."
      kill -9 "$pid" 2>/dev/null || true
      break
    fi
  done

  rm -f "$FRONTEND_PID_FILE"
  print_line "Frontend detenido."
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
  start_backend || true
  start_frontend || true
}

stop_all() {
  stop_frontend || true
  stop_backend || true
}

restart_all() {
  stop_all
  start_all
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
    help|-h|--help) print_usage ;;
    *)
      print_line "Acción no válida: $action"
      print_usage
      return 1
      ;;
  esac
}

main "$@"
