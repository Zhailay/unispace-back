-- Список тестов созданных конкретным сотрудником.
-- Используется для главной страницы /test-upload.
CREATE OR REPLACE FUNCTION public.test_list_by_sotrudnik(
    p_id_sotrudnik BIGINT,
    p_id_semestr   BIGINT DEFAULT NULL,
    p_limit        INT    DEFAULT 100,
    p_offset       INT    DEFAULT 0
)
RETURNS TABLE (
    test_id            BIGINT,
    id_disciplina      BIGINT,
    disciplina_name    VARCHAR,
    id_yazyk           BIGINT,
    yazyk_name         VARCHAR,
    id_nedelya         BIGINT,
    test_type          SMALLINT,
    tes_data           TIMESTAMPTZ,
    questions_count    BIGINT,
    total_count        BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT t.test_id,
               t.id_disciplina,
               t.id_yazyk,
               t.id_nedelya,
               t.test_type,
               t.tes_data
          FROM public.test t
         WHERE t.id_sotrudnik = p_id_sotrudnik
    ),
    cnt AS (SELECT COUNT(*) AS c FROM base)
    SELECT b.test_id,
           b.id_disciplina,
           d.disciplina_ru::VARCHAR AS disciplina_name,
           b.id_yazyk,
           y.yazyk_ru::VARCHAR AS yazyk_name,
           b.id_nedelya,
           b.test_type,
           b.tes_data,
           (SELECT COUNT(*) FROM public.test_question q WHERE q.id_test = b.test_id) AS questions_count,
           (SELECT c FROM cnt)
      FROM base b
      LEFT JOIN public.disciplina d ON d.disciplina_id = b.id_disciplina
      LEFT JOIN public.yazyk y      ON y.yazyk_id      = b.id_yazyk
     ORDER BY b.tes_data DESC
     LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
