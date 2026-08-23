-- Получить текущий конфиг теста (если есть).
CREATE OR REPLACE FUNCTION public.test_config_get(
    p_id_test BIGINT
)
RETURNS TABLE (
    test_config_id           BIGINT,
    id_test                  BIGINT,
    test_config_max_minute   SMALLINT,
    test_config_max_question SMALLINT,
    test_config_data         TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.test_config_id,
           c.id_test,
           c.test_config_max_minute,
           c.test_config_max_question,
           c.test_config_data
      FROM public.test_config c
     WHERE c.id_test = p_id_test
     ORDER BY c.test_config_id DESC
     LIMIT 1;
END;
$$ LANGUAGE plpgsql;
