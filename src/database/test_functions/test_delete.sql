-- Удаление теста с проверкой владельца.
-- Каскадно удаляет все вопросы, ответы и связанный конфиг/расписание.
CREATE OR REPLACE FUNCTION public.test_delete(
    p_id_test      BIGINT,
    p_id_sotrudnik BIGINT
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT
) AS $$
DECLARE
    v_owner BIGINT;
BEGIN
    SELECT id_sotrudnik INTO v_owner
      FROM public.test
     WHERE test_id = p_id_test;

    IF v_owner IS NULL THEN
        RETURN QUERY SELECT 0, 'Тест не найден'::TEXT;
        RETURN;
    END IF;

    IF v_owner <> p_id_sotrudnik THEN
        RETURN QUERY SELECT 0, 'Нет прав на удаление чужого теста'::TEXT;
        RETURN;
    END IF;

    DELETE FROM public.test_answer
     WHERE id_question IN (SELECT test_question_id FROM public.test_question WHERE id_test = p_id_test);

    DELETE FROM public.test_question WHERE id_test = p_id_test;
    DELETE FROM public.test_config   WHERE id_test = p_id_test;
    DELETE FROM public.test_raspisanie WHERE id_test = p_id_test;
    DELETE FROM public.test           WHERE test_id = p_id_test;

    RETURN QUERY SELECT 1, 'OK'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;
