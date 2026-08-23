-- Переключение активности вопроса.
-- test_question_status: 1 = активен, 0 = отключён (не используется в тесте).
CREATE OR REPLACE FUNCTION public.test_question_toggle(
    p_id     BIGINT,
    p_status SMALLINT
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT
) AS $$
BEGIN
    UPDATE public.test_question
       SET test_question_status = p_status
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
