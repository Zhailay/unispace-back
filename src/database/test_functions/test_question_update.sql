-- Обновить текст вопроса.
CREATE OR REPLACE FUNCTION public.test_question_update(
    p_id    BIGINT,
    p_value VARCHAR
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT
) AS $$
BEGIN
    UPDATE public.test_question
       SET test_question_value = p_value
     WHERE test_question_id = p_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 'Вопрос не найден'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT 1, 'OK'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;
