-- Обновить текст и/или статус ответа.
-- p_status: 1 — правильный, 0 — неправильный.
CREATE OR REPLACE FUNCTION public.test_answer_update(
    p_id     BIGINT,
    p_value  VARCHAR,
    p_status SMALLINT
)
RETURNS TABLE (
    out_code    INT,
    out_message TEXT
) AS $$
BEGIN
    UPDATE public.test_answer
       SET test_answer_value  = p_value,
           test_answer_status = p_status
     WHERE test_answer_id = p_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 'Ответ не найден'::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT 1, 'OK'::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM;
END;
$$ LANGUAGE plpgsql;
