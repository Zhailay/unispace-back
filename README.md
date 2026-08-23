# unispace-back

JSON API образовательной платформы Tanym. Express + PostgreSQL, без ORM — вся логика в хранимых процедурах.

Отделён от фронтенда: рендеринга здесь нет, отдаётся только JSON по `/api/*`. Клиент — [unispace-front](../unispace-front).

## Запуск

```bash
npm install
cp .env.example .env    # заполнить параметры БД
npm run dev             # http://localhost:4005
```

Проверка: `GET /api/health` → `{ "ok": true }`.

## Требования

- Node.js 18+
- PostgreSQL с существующей таблицей `session` (для `connect-pg-simple`)
- LibreOffice — только для модуля загрузки тестов (`SOFFICE_PATH`), конвертирует RTF в HTML

## Архитектура

**Данные.** ORM нет. Контроллеры вызывают функции PostgreSQL через `db.query`. Два соглашения об именовании:

- `<entity>_full(p_command, ...)` — CRUD-диспетчер. `p_command`: 1 = INSERT, 2 = UPDATE, 3 = DELETE, 4 = SELECT. Возвращает колонки с префиксом `out_`, статус в `out_code` (1 — успех, 2 — дубликат).
- `<entity>_spisok(yazyk_id)` — списки для справочников, обёрнуты в `models/SotrudnikProcedures.js`.

Тела функций живут в самой БД, в репозитории версионируются только `src/database/procedures/auth_procedures.sql` и `src/database/test_functions/`. Чтобы узнать сигнатуру — `\df+ public.spec_full` в psql.

Числовые параметры приводить явно: `$1::bigint`, `$3::smallint[]` — иначе PostgreSQL не разрешит перегрузку.

**Аутентификация.** Два независимых потока: студенты (`student` / `student_password`) и сотрудники (`sotrudnik` / `sotrudnik_password`). Логин — числовой ИИН. Сессия в cookie, хранится в PostgreSQL. `req.session.userId` — это доменный первичный ключ, он же уходит в процедуры как `id_sotrudnik`.

Ролей в системе фактически нет: разграничение сводится к «студент или сотрудник». Пять ролей из старого README не реализованы — данные о ролях нигде не загружаются.

**Слой совместимости.** `src/middlewares/apiCompat.js` превращает оставшиеся в контроллерах `res.render()` и `res.redirect()` в JSON. Это временно: по мере переноса страниц на React контроллеры переписываются на явный `res.json()`. Когда `res.render`/`res.redirect` исчезнут из `src/controllers` — файл удаляется.

**Язык.** Порядок разрешения: заголовок `X-Lang` → `?lang=` → сессия → cookie → `DEFAULT_LANGUAGE`. Фронт — источник истины. Словари `src/locales/*.json` читаются один раз при старте, после правки нужен перезапуск. Новый ключ добавляется сразу в `ru`, `kk` и `en`.

## API

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/auth/login` | вход, тело `{ login, password, userType }` |
| GET | `/api/auth/me` | текущий пользователь по cookie |
| POST | `/api/auth/logout` | выход |
| GET | `/api/lang/translations?lang=ru` | словарь переводов |
| POST | `/api/lang` | запомнить язык в сессии |
| GET | `/api/health` | проверка живости |

Прикладные модули: `/api/dashboard`, `/api/staff`, `/api/student`, `/api/kadr`, `/api/specialties`, `/api/gruppa`, `/api/gruppa_op`, `/api/students`, `/api/kalendar`, `/api/disciplina`, `/api/modul_name`, `/api/obsh_name`, `/api/plan`, `/api/registraciya`, `/api/jurnal`, `/api/vneplanovoe`, `/api/test-upload`.

## Тестовые аккаунты

Логины — 12-значные числа, пароль у всех `password123`:

- Сотрудники: `111111111111`, `222222222222`
- Студенты: `333333333333`, `444444444444`

Создаются командой `npm run seed` (она предварительно очищает таблицы `student`, `sotrudnik` и их таблицы паролей).

## Скрипты

- `npm run dev` — nodemon
- `npm start` — продакшн
- `npm run seed` — тестовые пользователи

Системы миграций нет: SQL применяется вручную через psql.
