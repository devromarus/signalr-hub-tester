# =============================================================================
# SignalR Hub Tester — Dockerfile
# Раздача предварительно собранного билда (dist/) через nginx.
#
# Билд собирается локально командой `npm run build` (см. README), т.к.
# установка зависимостей @alfalab/core-components внутри контейнера падает
# из-за бага npm 10.x "Exit handler never called!". Готовый dist копируется
# в образ без этапа сборки.
# =============================================================================

FROM nginx:alpine

# Копируем конфигурацию nginx (SPA fallback, кэширование).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем предварительно собранные файлы.
COPY dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]