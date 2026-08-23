-- Назначение теста группе студентов на конкретное время.
CREATE OR REPLACE FUNCTION public.test_raspisanie_save(
    p_id_plan          BIGINT,
    p_id_gruppa_student BIGINT,
    p_id_test          BIGINT,
    p_start            TIMESTAMPTZ
)
RETURNS TABLE (
    out_code         INT,
    out_message      TEXT,
    out_raspisanie_id BIGINT
) AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO public.test_raspisanie (id_plan, id_gruppa_student, id_test, test_raspisanie_start, test_raspisanie_data)
    VALUES (p_id_plan, p_id_gruppa_student, p_id_test, p_start, NOW())
    RETURNING test_raspisanie_id INTO v_id;

    RETURN QUERY SELECT 1, 'OK'::TEXT, v_id;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, SQLERRM, NULL::BIGINT;
END;
$$ LANGUAGE plpgsql;
