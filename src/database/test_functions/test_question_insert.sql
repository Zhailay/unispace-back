-- Вставка вопроса теста. Возвращает ID нового вопроса.
CREATE OR REPLACE FUNCTION public.test_question_insert(
    p_id_test BIGINT,
    p_value   VARCHAR
)
RETURNS TABLE (
    out_code        INT,
    out_message     TEXT,
    out_question_id BIGINT
) AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO public.test_question (id_test, test_question_value, test_question_data, test_question_status)
    VALUES (p_id_test, p_value, NOW(), 1)
    RETURNING test_question_id INTO v_id;

    RETURN QUERY SELECT 1, 'OK'::TEXT, v_id;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM, NULL::BIGINT;
END;
$$ LANGUAGE plpgsql;
