-- Создание записи теста.
-- Вызывается при сохранении распарсенного файла.
CREATE OR REPLACE FUNCTION public.test_create(
    p_id_disciplina BIGINT,
    p_id_yazyk      BIGINT,
    p_id_sotrudnik  BIGINT,
    p_id_nedelya    BIGINT,
    p_test_type     SMALLINT
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT,
    out_test_id BIGINT
) AS $$
DECLARE
    v_test_id BIGINT;
BEGIN
    INSERT INTO public.test (id_disciplina, id_yazyk, id_sotrudnik, id_nedelya, test_type, tes_data)
    VALUES (p_id_disciplina, p_id_yazyk, p_id_sotrudnik, p_id_nedelya, p_test_type, NOW())
    RETURNING test_id INTO v_test_id;

    RETURN QUERY SELECT 1, 'OK'::TEXT, v_test_id;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM, NULL::BIGINT;
END;
$$ LANGUAGE plpgsql;
