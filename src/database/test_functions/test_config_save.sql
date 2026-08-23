-- Сохранение/обновление конфигурации теста (минуты + кол-во вопросов в попытке).
CREATE OR REPLACE FUNCTION public.test_config_save(
    p_id_test       BIGINT,
    p_max_minute    SMALLINT,
    p_max_question  SMALLINT
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT
) AS $$
DECLARE
    v_existing BIGINT;
BEGIN
    SELECT test_config_id INTO v_existing
      FROM public.test_config
     WHERE id_test = p_id_test
     LIMIT 1;

    IF v_existing IS NULL THEN
        INSERT INTO public.test_config (id_test, test_config_max_minute, test_config_max_question, test_config_data)
        VALUES (p_id_test, p_max_minute, p_max_question, NOW());
    ELSE
        UPDATE public.test_config
           SET test_config_max_minute   = p_max_minute,
               test_config_max_question = p_max_question,
               test_config_data         = NOW()
         WHERE test_config_id = v_existing;
    END IF;

    RETURN QUERY SELECT 1, 'OK'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;
