# test_functions

PostgreSQL функции для модуля «Загрузка тестовых вопросов».

Применяются вручную (в проекте нет скрипта миграции). Чтобы накатить — выполнить все `*.sql` файлы из этой папки в рабочей БД, например:

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f test_create.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f test_question_insert.sql
# ... и т.д. для всех файлов
```

Или через psql одной командой:
```bash
for f in src/database/test_functions/*.sql; do psql -f "$f"; done
```

## Состав

| Файл | Описание |
|---|---|
| `test_create.sql` | Создаёт запись теста, возвращает `test_id` |
| `test_question_insert.sql` | Вставка вопроса (`test_question_status` = 1 по умолчанию) |
| `test_answer_insert.sql` | Вставка варианта ответа (`p_status`: 1 правильный, 0 нет) |
| `test_question_toggle.sql` | Включение/отключение вопроса (`test_question_status`) |
| `test_question_list.sql` | Список вопросов теста с подсчётом ответов |
| `test_question_with_answers.sql` | Все вопросы и их ответы (плоский join) |
| `test_list_by_sotrudnik.sql` | Список тестов конкретного преподавателя |
| `test_delete.sql` | Удаление теста с проверкой владельца |
| `test_config_save.sql` | UPSERT настроек (минуты, кол-во вопросов в попытке) |
| `test_config_get.sql` | Получить текущий конфиг |
| `test_raspisanie_save.sql` | Назначение теста группе |
| `test_raspisanie_list.sql` | Список расписаний теста |

## Зависимости от схемы

Функции рассчитывают на существование таблиц `test`, `test_question`, `test_answer`, `test_config`, `test_raspisanie` в схеме `public`. Если таблицы ещё не созданы — применить `schema.sql` (или DDL из CLAUDE.md / задачи) перед загрузкой функций.
