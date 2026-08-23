-- Список расписаний (назначений) теста.
CREATE OR REPLACE FUNCTION public.test_raspisanie_list(
    p_id_test BIGINT
)
RETURNS TABLE (
    test_raspisanie_id    BIGINT,
    id_plan               BIGINT,
    id_gruppa_student     BIGINT,
    id_test               BIGINT,
    test_raspisanie_start TIMESTAMPTZ,
    test_raspisanie_data  TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.test_raspisanie_id,
           r.id_plan,
           r.id_gruppa_student,
           r.id_test,
           r.test_raspisanie_start,
           r.test_raspisanie_data
      FROM public.test_raspisanie r
     WHERE r.id_test = p_id_test
     ORDER BY r.test_raspisanie_start DESC;
END;
$$ LANGUAGE plpgsql;
