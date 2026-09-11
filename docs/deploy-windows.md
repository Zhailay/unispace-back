# Развёртывание на Windows Server (PM2 + XAMPP/Apache)

## Главное: PM2 нужен только для бэкенда

`unispace-front` — это **статическая сборка** Vite (`npm run build` → `dist/`),
а не процесс. Держать её «живой» нечему: там нет сервера, только `index.html`,
`.js` и `.css`. Добавлять фронт в PM2 не нужно и нельзя — `vite preview`
и `npm run dev` в проде не используются.

Итого под PM2 живёт один процесс — `unispace-back`. Фронт раздаёт Apache.

```
Браузер → Apache (домен, :80/:443)
            ├─ /            → C:\www\tanym\dist\   (статика, отдаёт Apache)
            └─ /api/*       → proxy → 127.0.0.1:4005 (Node под PM2)
                                        └→ PostgreSQL
```

Фронт и API оказываются на **одном домене** — это важно: cookie сессии
ходит без CORS и без `SameSite=None`.

---

## 1. Подготовка

```powershell
# Бэкенд
cd C:\www\tanym\unispace-back
npm ci --omit=dev
copy .env.example .env      # заполнить, см. раздел 2

# Фронт — собрать один раз, процесс не нужен
cd C:\www\tanym\unispace-front
npm ci
npm run build               # -> dist/
```

Пересобирать фронт нужно после каждого обновления кода; PM2 к этому
отношения не имеет.

## 2. `.env` бэкенда

```ini
NODE_ENV=production
PORT=4005

DB_HOST=localhost
DB_PORT=5432
DB_NAME=p_lms
DB_USER=postgres
DB_PASSWORD=<пароль>

SESSION_SECRET=<длинная случайная строка>
SESSION_MAX_AGE=86400000

# Фронт и API на одном домене -> lax. По HTTPS переключить COOKIE_SECURE=true.
COOKIE_SAMESITE=lax
COOKIE_SECURE=false

# Тот же домен, что в браузере. Без завершающего слэша.
CORS_ORIGIN=http://tanym.example.kz

DEFAULT_LANGUAGE=ru
SUPPORTED_LANGUAGES=ru,kk,en

SOFFICE_PATH=C:/Program Files/LibreOffice/program/soffice.exe
```

> **Про cookie — самая частая причина «вход не работает».**
> `SameSite=None` браузер принимает только вместе с `Secure`, а `Secure`-cookie
> передаётся только по HTTPS. На домене без сертификата это выглядит так:
> логин отвечает 200, но каждый следующий запрос — 401, потому что браузер
> молча выбросил cookie. При раздаче с одного домена ставьте `lax`.
> После подключения HTTPS: `COOKIE_SECURE=true` (`COOKIE_SAMESITE` оставить `lax`).

Таблица `session` должна существовать в БД (`connect-pg-simple`):

```sql
CREATE TABLE IF NOT EXISTS session (
  sid    varchar NOT NULL COLLATE "default" PRIMARY KEY,
  sess   json    NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
```

## 3. PM2

```powershell
npm install -g pm2

cd C:\www\tanym\unispace-back
pm2 start ecosystem.config.js --env production
pm2 save

pm2 list
pm2 logs unispace-back
```

### Автозапуск при перезагрузке сервера

**`pm2 startup` на Windows не работает** — команда рассчитана на systemd/launchd.
Нужен один из вариантов:

**Вариант А — `pm2-installer` (рекомендуется).** Ставит PM2 как службу Windows
с корректными правами:

```powershell
# https://github.com/jessety/pm2-installer
git clone https://github.com/jessety/pm2-installer.git
cd pm2-installer
npm run setup
```

**Вариант Б — NSSM.** Обернуть в службу вручную:

```powershell
nssm install tanym-api "C:\Program Files\nodejs\node.exe" "C:\www\tanym\unispace-back\src\server.js"
nssm set tanym-api AppDirectory "C:\www\tanym\unispace-back"
nssm set tanym-api AppEnvironmentExtra NODE_ENV=production
nssm start tanym-api
```

При варианте Б PM2 не нужен вовсе — служба Windows сама перезапускает процесс.
Для одного Node-процесса это часто проще, чем PM2 + обвязка.

## 4. Apache (XAMPP)

Включить модули в `C:\xampp\apache\conf\httpd.conf` — снять `#`:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
```

Виртуальный хост в `C:\xampp\apache\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    ServerName tanym.example.kz
    DocumentRoot "C:/www/tanym/unispace-front/dist"

    # --- API: всё под /api уходит в Node ---
    ProxyPreserveHost On
    ProxyPass        /api  http://127.0.0.1:4005/api
    ProxyPassReverse /api  http://127.0.0.1:4005/api

    # Node доверяет X-Forwarded-* (app.set('trust proxy', 1)),
    # без них req.protocol и secure-cookie определяются неверно.
    RequestHeader set X-Forwarded-Proto "http"

    <Directory "C:/www/tanym/unispace-front/dist">
        Require all granted
        AllowOverride None

        # SPA-fallback: реальные файлы отдаём как есть, остальное — index.html,
        # иначе прямой переход на /staff/jurnal даст 404 от Apache.
        RewriteEngine On
        RewriteCond %{REQUEST_URI} !^/api
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Хэшированные ассеты Vite неизменяемы — кешируем надолго.
    <LocationMatch "^/assets/">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </LocationMatch>
    # index.html не кешируем, иначе после деплоя отдаются старые ссылки.
    <Files "index.html">
        Header set Cache-Control "no-cache, must-revalidate"
    </Files>

    ErrorLog  "logs/tanym-error.log"
    CustomLog "logs/tanym-access.log" common
</VirtualHost>
```

Подключить файл vhosts, если ещё не подключён (`httpd.conf`):

```apache
Include conf/extra/httpd-vhosts.conf
```

### Если позже появится HTTPS

1. В vhost `*:443` добавить сертификат, `RequestHeader set X-Forwarded-Proto "https"`.
2. В `.env`: `COOKIE_SECURE=true`, `CORS_ORIGIN=https://tanym.example.kz`.
3. `pm2 restart unispace-back --update-env`.

## 5. Проверка

```powershell
# 1. Node поднят
curl http://127.0.0.1:4005/api/health          # {"ok":true,...}

# 2. Через Apache
curl http://tanym.example.kz/api/health        # тот же ответ

# 3. Cookie выставляется без Secure (иначе вход не заработает по HTTP)
curl -i -X POST http://tanym.example.kz/api/lang ^
  -H "Content-Type: application/json" -d "{\"lang\":\"ru\"}"
# Ожидаем: Set-Cookie: connect.sid=...; HttpOnly; SameSite=Lax
# Если видите "SameSite=None; Secure" по HTTP — вход работать не будет,
# проверьте COOKIE_SAMESITE в .env.

# 4. SPA-роут открывается напрямую
curl -I http://tanym.example.kz/staff/jurnal   # 200 и text/html, не 404
```

## 6. Обновление

```powershell
cd C:\www\tanym\unispace-front
git pull && npm ci && npm run build     # фронт: только пересборка

cd C:\www\tanym\unispace-back
git pull && npm ci --omit=dev
pm2 restart unispace-back --update-env  # бэк: рестарт процесса
```

Репозитории независимы (разная история git) — `git pull` делается в каждом
отдельно.

## Частые проблемы

| Симптом | Причина |
|---|---|
| Вход 200, дальше везде 401 | `Secure`-cookie по HTTP. Поставить `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=false` |
| 404 при F5 на `/staff/...` | Нет SPA-fallback в `<Directory>` или не включён `mod_rewrite` |
| 502/503 на `/api` | Node не запущен (`pm2 list`) или занят другой порт |
| Ошибка CORS в консоли | `CORS_ORIGIN` не совпадает с доменом в адресной строке (протокол и порт тоже считаются) |
| Старый фронт после деплоя | Не пересобран `dist/` или закеширован `index.html` |
| Не грузятся шрифты | Сервер без доступа в интернет: Google Fonts недоступен. Текст отрисуется системным шрифтом — см. `index.html` |
