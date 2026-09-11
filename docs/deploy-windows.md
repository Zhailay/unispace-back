# Развёртывание на Windows Server (PM2 + XAMPP/Apache)

## Главное: PM2 нужен только для бэкенда

`unispace-front` — это **статическая сборка** Vite (`npm run build` → `dist/`),
а не процесс. Держать её «живой» нечему: там нет сервера, только `index.html`,
`.js` и `.css`. Добавлять фронт в PM2 не нужно и нельзя — `vite preview`
и `npm run dev` в проде не используются.

Итого под PM2 живёт один процесс — `unispace-back`. Фронт раздаёт Apache.

```
Браузер → Apache (домен, :443)
            ├─ /       → unispace-front\dist\   (статика)
            └─ /api/*  → proxy → 127.0.0.1:4015 (Node под PM2)
                                   └→ PostgreSQL
```

Фронт и API оказываются на **одном домене** — это важно: cookie сессии
ходит без CORS и без `SameSite=None`.

---

## 1. Подготовка

```powershell
# Бэкенд
cd C:\progs\tanym\unispace-back
npm ci --omit=dev
copy .env.example .env      # заполнить, см. раздел 2

# Фронт — собрать один раз, процесс не нужен
cd C:\progs\tanym\unispace-front
npm ci
npm run build               # -> dist/
```

Пересобирать фронт нужно после каждого обновления кода; PM2 к этому
отношения не имеет.

## 2. `.env` бэкенда

```ini
NODE_ENV=production
PORT=4015

DB_HOST=localhost
DB_PORT=5432
DB_NAME=p_lms
DB_USER=postgres
DB_PASSWORD=<пароль>

SESSION_SECRET=<длинная случайная строка>
SESSION_MAX_AGE=86400000

# Фронт и API на одном домене -> lax (кросс-доменных cookie не нужно).
COOKIE_SAMESITE=lax
# Сайт открывается по https:// -> true. Для http-стенда поставить false.
COOKIE_SECURE=true

# Тот же домен, что в адресной строке. Схема и порт тоже считаются.
CORS_ORIGIN=https://tanym.zhetysu.edu.kz

DEFAULT_LANGUAGE=ru
SUPPORTED_LANGUAGES=ru,kk,en

SOFFICE_PATH=C:/Program Files/LibreOffice/program/soffice.exe
```

> **Про cookie — самая частая причина «вход не работает».**
>
> `SameSite=None` браузер принимает только вместе с `Secure`, а `Secure`-cookie
> передаётся только по HTTPS. Раньше в коде на любом `NODE_ENV=production`
> жёстко ставилось `none` + `secure` — на HTTP-домене это давало «логин
> отвечает 200, а дальше везде 401»: браузер молча выбрасывал cookie.
> Теперь флаги задаются здесь.
>
> Правило простое:
> - фронт и API на одном домене (оба варианта vhost ниже) → `COOKIE_SAMESITE=lax`;
> - сайт по `https://` → `COOKIE_SECURE=true`, по `http://` → `false`;
> - `none` нужен **только** если фронт вынесен на отдельный домен, и он
>   обязательно требует HTTPS.
>
> При `COOKIE_SECURE=true` в vhost обязателен
> `RequestHeader set X-Forwarded-Proto "https"` — иначе Node считает
> соединение незащищённым и не выставит cookie (`trust proxy` уже включён).

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

cd C:\progs\tanym\unispace-back
pm2 start ecosystem.config.js --env production
pm2 save

pm2 list
pm2 logs unispace-back
```

### Процесс падает сразу после `pm2 start`

Признак в `pm2 list`: `status = errored`, счётчик рестартов растёт,
`memory = 0b`. После `max_restarts` (10) PM2 перестаёт поднимать процесс.

PM2 при быстром падении глотает вывод, поэтому **сначала запустите напрямую** —
ошибка напечатается в консоль:

```powershell
cd C:\progs\TanymV2\unispace-back
node src\server.js
```

Либо из PM2: `pm2 logs unispace-back --lines 100 --nostream`.

| Текст ошибки | Причина |
|---|---|
| `Cannot find module 'express'` | не установлены зависимости → `npm ci --omit=dev` |
| `client password must be a string`, `SASL: SCRAM-SERVER-FIRST-MESSAGE` | **нет файла `.env`** — `DB_PASSWORD` не подхватился. Самая частая причина |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL не запущен или другой хост/порт в `.env` |
| `password authentication failed for user` | неверные `DB_USER`/`DB_PASSWORD` |
| `relation "session" does not exist` | нет таблицы сессий (SQL в разделе 2) |
| `EADDRINUSE :::4015` | порт занят: `netstat -ano \| findstr :4015` |
| `EPERM` / `EACCES` при записи логов | `mkdir C:\progs\TanymV2\unispace-back\logs` |

После починки процесс нужно пересоздать, а не просто перезапустить —
`errored`-запись хранит старую конфигурацию:

```powershell
pm2 delete unispace-back
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list          # ожидаем status=online, restarts=0
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
nssm install tanym-api "C:\Program Files\nodejs\node.exe" "C:\progs\tanym\unispace-back\src\server.js"
nssm set tanym-api AppDirectory "C:\progs\tanym\unispace-back"
nssm set tanym-api AppEnvironmentExtra NODE_ENV=production
nssm start tanym-api
```

При варианте Б PM2 не нужен вовсе — служба Windows сама перезапускает процесс.
Для одного Node-процесса это часто проще, чем PM2 + обвязка.

## 4. Apache (XAMPP) — два варианта vhost

### Чем это отличается от Next.js

В Next.js-приложении (`next-cms`) проксируется **всё** `/` на `127.0.0.1:3001`,
потому что Next.js — это сервер: он рендерит страницы на каждый запрос.

Здесь фронт — статические файлы. Сервер ему не нужен. Отсюда два варианта:

| | Вариант А | Вариант Б |
|---|---|---|
| Статику отдаёт | Apache с диска | Node (`express.static`) |
| vhost | `DocumentRoot` + proxy только `/api` | proxy всего `/` — как у Next.js |
| Нужен `mod_rewrite` | да (SPA-fallback) | нет |
| Скорость статики | выше | достаточная |

**Вариант Б проще** и по форме совпадает с тем, что у вас уже работает:
`server.js` сам раздаёт `dist/` и делает SPA-fallback, так что достаточно
одной строки `ProxyPass /`. Начните с него; на А можно перейти позже,
если захочется снять раздачу статики с Node.

### Вариант Б — проксировать всё на Node (как в next-cms)

```apache
<VirtualHost *:443>
    ServerName tanym.zhetysu.edu.kz
    SSLEngine on
    SSLCertificateFile    "conf/ssl/_zhetysu_edu_kz.crt"
    SSLCertificateKeyFile "conf/ssl/zhetysu.edu.kz-private.key"
    SSLCACertificateFile  "${SRVROOT}/conf/ssl/_zhetysu_edu_kz.ca"

    ProxyPreserveHost On
    # Без этого Node считает соединение http:// и secure-cookie не выставится.
    RequestHeader set X-Forwarded-Proto "https"

    ProxyPass        /  http://127.0.0.1:4015/
    ProxyPassReverse /  http://127.0.0.1:4015/

    ErrorLog  "logs/tanym-error.log"
    CustomLog "logs/tanym-access.log" common
</VirtualHost>
```

Требует, чтобы `dist/` лежал там, где его ищет `server.js`
(`../unispace-front/dist` относительно бэка, либо явный `STATIC_DIR` в `.env`).

### Вариант А — статику отдаёт Apache

Включить модули в `C:\xampp\apache\conf\httpd.conf` — снять `#`:

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
```

```apache
<VirtualHost *:443>
    ServerName tanym.zhetysu.edu.kz
    SSLEngine on
    SSLCertificateFile    "conf/ssl/_zhetysu_edu_kz.crt"
    SSLCertificateKeyFile "conf/ssl/zhetysu.edu.kz-private.key"
    SSLCACertificateFile  "${SRVROOT}/conf/ssl/_zhetysu_edu_kz.ca"

    # ВАЖНО: этот путь и путь в <Directory> ниже должны совпадать ДОСЛОВНО
    # (включая регистр). Если они разные, у DocumentRoot не окажется
    # "Require all granted" и Apache отдаст 403 Forbidden.
    DocumentRoot "C:/progs/tanym/unispace-front/dist"

    # --- API: только /api уходит в Node, остальное Apache берёт с диска ---
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"

    ProxyPass        /api  http://127.0.0.1:4015/api
    ProxyPassReverse /api  http://127.0.0.1:4015/api

    <Directory "C:/progs/tanym/unispace-front/dist">
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

### Редирект с HTTP на HTTPS

```apache
<VirtualHost *:80>
    ServerName tanym.zhetysu.edu.kz
    Redirect permanent / https://tanym.zhetysu.edu.kz/
</VirtualHost>
```

Если вместо `Redirect` используете `RewriteRule`, не забудьте `RewriteEngine On`
внутри блока — в vhost он **не наследуется**, и без него правило молча
не сработает:

```apache
<VirtualHost *:80>
    ServerName tanym.zhetysu.edu.kz
    RewriteEngine On
    RewriteRule ^(.*) https://%{SERVER_NAME}$1 [R=301,L]
</VirtualHost>
```

Подключить файл vhosts, если ещё не подключён (`httpd.conf`):

```apache
Include conf/extra/httpd-vhosts.conf
```

### Если разворачиваете на HTTP (стенд без сертификата)

В `.env` поставить `COOKIE_SECURE=false` и `CORS_ORIGIN=http://...`,
в vhost — `RequestHeader set X-Forwarded-Proto "http"`.
При возврате на HTTPS вернуть `true`/`https` и выполнить
`pm2 restart unispace-back --update-env`.

### CORS-ошибка с «redirected from» и портом в адресе

```
Access to fetch at 'https://tanym.zhetysu.edu.kz:4000/api/auth/me'
(redirected from 'https://tanym.zhetysu.edu.kz/api/auth/me')
blocked by CORS policy
```

Origin — это **схема + хост + порт**. `…edu.kz` и `…edu.kz:4000` — разные
origin, поэтому браузер требует CORS-заголовки и блокирует запрос.

Причина: в vhost стоит **редирект вместо прокси**. Разница принципиальная:

| | Что делает | Видит ли браузер |
|---|---|---|
| `ProxyPass` / `RewriteRule [P]` | Apache сам ходит на бэк и отдаёт ответ | нет, origin один |
| `Redirect` / `RewriteRule [R]` | отдаёт браузеру `302`, тот идёт сам | да, origin меняется → CORS |

Нужен первый вариант. Проверить, что отдаёт сервер:

```powershell
curl.exe -k -i https://tanym.zhetysu.edu.kz/api/health
```

Есть `HTTP/1.1 302` и заголовок `Location:` с портом → в конфиге редирект.
Должно быть сразу `200` и JSON, без `Location`.

Уберите из vhost строки вида

```apache
Redirect    /api https://tanym.zhetysu.edu.kz:4000/api
RewriteRule ^/api/(.*)$ https://tanym.zhetysu.edu.kz:4000/api/$1 [R,L]
```

и оставьте только:

```apache
ProxyPass        /api  http://127.0.0.1:4015/api
ProxyPassReverse /api  http://127.0.0.1:4015/api
```

Цель прокси — всегда `http://127.0.0.1:<порт>`, а не публичный домен:
запрос не должен выходить наружу и возвращаться.

> **Не «чините» это добавлением `:4000` в `CORS_ORIGIN`.** Симптом уйдёт,
> но появятся новые: cookie сессии при разных origin потребует
> `SameSite=None` (а значит HTTPS на обоих портах), и порт Node окажется
> открыт наружу. Правильно — убрать редирект, чтобы всё осталось
> на одном origin.

**Если в конфиге редиректа нет, а браузер всё равно редиректит** — скорее
всего это **закешированный `301`**. `Redirect permanent` и `RewriteRule [R=301]`
браузер запоминает и повторяет, не спрашивая сервер: конфиг уже починен,
а Chrome продолжает уводить на старый адрес.

Разделить эти два случая:

```powershell
curl.exe -k -i https://tanym.zhetysu.edu.kz/api/health
```

`curl` кеш не использует. Вернулся `200` + JSON, а браузер всё равно
редиректит — виноват кеш: проверяйте в приватном окне либо в DevTools
на вкладке Network включите «Disable cache» и перезагрузите.

Найти живой редирект в любом из конфигов Apache:

```cmd
findstr /S /I "4000" C:\xampp\apache\conf\*.conf
findstr /S /I "4000" C:\xampp\apache\conf\extra\*.conf
```

И не забыть, что без перезапуска Apache правки не применяются:

```powershell
C:\xampp\apache\bin\httpd.exe -t
C:\xampp\apache\bin\httpd.exe -k restart
```

### Открывается ЧУЖОЙ сайт (другой vhost) вместо нового

Самая частая проблема на сервере, где уже крутятся другие сайты.

Apache выбирает `<VirtualHost>` по заголовку `Host`. Если **ни один**
`ServerName`/`ServerAlias` не совпал с доменом из адресной строки, Apache
молча берёт **первый по порядку** vhost для этого порта. На вашем сервере
первый `*:443` — это `site.zhetysu.edu.kz`, поэтому туда и попадаете
(а его приложение может ещё и сделать свой редирект на канонический адрес —
отсюда ощущение «редиректит»).

**Сначала посмотрите, что Apache реально загрузил:**

```powershell
C:\xampp\apache\bin\httpd.exe -S
```

```
*:443  is a NameVirtualHost
       default server site.zhetysu.edu.kz (conf/extra/httpd-vhosts.conf:10)
       port 443 namevhost site.zhetysu.edu.kz  (conf/extra/httpd-vhosts.conf:10)
       port 443 namevhost tanym.zhetysu.edu.kz (conf/extra/httpd-vhosts.conf:35)
```

Нет строки `namevhost tanym.zhetysu.edu.kz` → Apache ваш блок не видит.
Дальше по списку:

1. **Порт.** Вы открываете `http://` или `https://`? vhost для `*:443`
   не обслуживает `:80`. Если для `:80` вашего блока нет — сработает первый
   `:80`-vhost, то есть чужой. Нужны **оба** блока (см. «Редирект с HTTP на HTTPS»).

2. **`ServerName` посимвольно равен домену в адресной строке.**
   `tanym.zhetysu.edu.kz` и `www.tanym.zhetysu.edu.kz` — разные имена.
   Второе добавляется через `ServerAlias`.

3. **Файл с vhost подключён** в `httpd.conf`
   (`Include conf/extra/httpd-vhosts.conf`), и блок дописан именно в него.

4. **Синтаксис.** `httpd.exe -t` — при ошибке Apache работает на старом
   конфиге, и правки просто не применяются.

5. **Apache перезапущен** после правки: `httpd.exe -k restart`
   (Reload в XAMPP Control Panel тоже подойдёт).

6. **DNS.** `nslookup tanym.zhetysu.edu.kz` должен вернуть IP этого сервера.
   Пока запись не появилась, можно проверить через `hosts`:
   `C:\Windows\System32\drivers\etc\hosts` → `127.0.0.1 tanym.zhetysu.edu.kz`.

7. **Сертификат должен покрывать поддомен.** Если `_zhetysu_edu_kz.crt`
   выписан на `*.zhetysu.edu.kz` — `tanym.zhetysu.edu.kz` подходит.
   Если это сертификат только на `site.zhetysu.edu.kz`, браузер выдаст
   предупреждение, но vhost всё равно должен выбираться правильно.

**Готовая пара блоков** (оба порта, с алиасом):

```apache
<VirtualHost *:80>
    ServerName  tanym.zhetysu.edu.kz
    ServerAlias www.tanym.zhetysu.edu.kz
    Redirect permanent / https://tanym.zhetysu.edu.kz/
</VirtualHost>

<VirtualHost *:443>
    ServerName  tanym.zhetysu.edu.kz
    ServerAlias www.tanym.zhetysu.edu.kz

    SSLEngine on
    SSLCertificateFile    "conf/ssl/_zhetysu_edu_kz.crt"
    SSLCertificateKeyFile "conf/ssl/zhetysu.edu.kz-private.key"
    SSLCACertificateFile  "${SRVROOT}/conf/ssl/_zhetysu_edu_kz.ca"

    DocumentRoot "C:/progs/tanym/unispace-front/dist"

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    # Статику Apache берёт с диска, в Node уходит только /api.
    ProxyPass        /api  http://127.0.0.1:4015/api
    ProxyPassReverse /api  http://127.0.0.1:4015/api

    <Directory "C:/progs/tanym/unispace-front/dist">
        Require all granted
        AllowOverride None
        RewriteEngine On
        RewriteCond %{REQUEST_URI} !^/api
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog  "logs/tanym-error.log"
    CustomLog "logs/tanym-access.log" common
</VirtualHost>
```

**Проверка мимо DNS и браузерного кеша** — обращаемся по IP, но с нужным
`Host`, так что подмешивается ровно тот vhost, который нас интересует:

```powershell
curl -k -I -H "Host: tanym.zhetysu.edu.kz" https://127.0.0.1/
```

Вернулся ваш `index.html` (200, `text/html`) — vhost работает, проблема в DNS
или в кеше браузера. Вернулся редирект на `site.zhetysu.edu.kz` — Apache
по-прежнему не сопоставляет имя, возвращайтесь к пункту 1.

> Браузер агрессивно кеширует `301 Redirect permanent`. Если один раз
> прилетел редирект на чужой домен, он будет повторяться и после починки
> конфига — проверяйте в приватном окне.

## 5. Проверка

```powershell
# 1. Node поднят
curl http://127.0.0.1:4015/api/health          # {"ok":true,...}

# 2. Через Apache
curl https://tanym.zhetysu.edu.kz/api/health   # тот же ответ

# 3. Cookie сессии вообще выставляется — без неё вход не работает
curl -i -X POST https://tanym.zhetysu.edu.kz/api/lang ^
  -H "Content-Type: application/json" -d "{\"lang\":\"ru\"}"
# По HTTPS ожидаем: Set-Cookie: connect.sid=...; HttpOnly; Secure; SameSite=Lax
# По HTTP  ожидаем: Set-Cookie: connect.sid=...; HttpOnly; SameSite=Lax
#
# Заголовка Set-Cookie НЕТ вообще -> Node считает соединение незащищённым
# при COOKIE_SECURE=true. Проверьте RequestHeader X-Forwarded-Proto в vhost.
# Видите SameSite=None -> уберите COOKIE_SAMESITE=none из .env.

# 4. SPA-роут открывается напрямую
curl -I https://tanym.zhetysu.edu.kz/staff/jurnal   # 200 и text/html, не 404
```

## 6. Обновление

```powershell
cd C:\progs\tanym\unispace-front
git pull && npm ci && npm run build     # фронт: только пересборка

cd C:\progs\tanym\unispace-back
git pull && npm ci --omit=dev
pm2 restart unispace-back --update-env  # бэк: рестарт процесса
```

Репозитории независимы (разная история git) — `git pull` делается в каждом
отдельно.

## Частые проблемы

| Симптом | Причина |
|---|---|
| **403 Forbidden на всём сайте** | Пути в `DocumentRoot` и `<Directory>` не совпадают, поэтому у корня нет `Require all granted`. В Apache 2.4 глобально действует `Require all denied`. Сверьте обе строки посимвольно; в `logs/tanym-error.log` будет `client denied by server configuration` |
| 403 и пути совпадают | Папки `dist/` нет (фронт не собран) или у службы Apache нет прав на чтение диска `C:\progs\...` |
| Вход 200, дальше везде 401 | `Secure`-cookie по HTTP. Поставить `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=false` |
| 404 при F5 на `/staff/...` | Нет SPA-fallback в `<Directory>` или не включён `mod_rewrite` |
| Редирект с `:80` не работает | В блоке `*:80` нет `RewriteEngine On` — в vhost он не наследуется |
| 502/503 на `/api` | Node не запущен (`pm2 list`) или занят другой порт |
| **Вместо текста видны ключи** (`common.app_name`, `auth.login_label`) | Словарь не загрузился: `GET /api/lang/translations` не отвечает. Фронт в этом случае показывает сам ключ. Причина всегда в `/api` — начните с `curl.exe -i http://127.0.0.1:4015/api/health` |
| Ошибка CORS в консоли | `CORS_ORIGIN` не совпадает с доменом в адресной строке (протокол и порт тоже считаются) |
| **Переводы грузятся, а вход даёт «origin не разрешён»** | Браузер шлёт `Origin` на POST, но не на GET — поэтому GET проходил, а POST нет. Впишите домен в `CORS_ORIGIN` и `pm2 restart unispace-back --update-env`. В свежем коде свой собственный origin разрешается автоматически |
| **CORS + `(redirected from ...)` с портом в адресе** | В vhost редирект вместо прокси — см. раздел ниже. Порт входит в origin, поэтому `:4000` это уже чужой origin |
| Старый фронт после деплоя | Не пересобран `dist/` или закеширован `index.html` |
| Не грузятся шрифты | Сервер без доступа в интернет: Google Fonts недоступен. Текст отрисуется системным шрифтом — см. `index.html` |
