-- Вставка варианта ответа.
-- p_status: 1 — правильный, 0 — неправильный.
CREATE OR REPLACE FUNCTION public.test_answer_insert(
    p_id_question BIGINT,
    p_value       VARCHAR,
    p_status      SMALLINT
)
RETURNS TABLE (
    out_code      INT,
    out_message   TEXT,
    out_answer_id BIGINT
) AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO public.test_answer (id_question, test_answer_value, test_answer_status, test_answer_data)
    VALUES (p_id_question, p_value, p_status, NOW())
    RETURNING test_answer_id INTO v_id;

    RETURN QUERY SELECT 1, 'OK'::TEXT, v_id;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM, NULL::BIGINT;
END;
$$ LANGUAGE plpgsql;
