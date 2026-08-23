-- Список вопросов теста с количеством ответов и количеством правильных.
-- Используется на странице управления вопросами.
CREATE OR REPLACE FUNCTION public.test_question_list(
    p_id_test BIGINT
)
RETURNS TABLE (
    test_question_id     BIGINT,
    test_question_value  VARCHAR,
    test_question_status SMALLINT,
    test_question_data   TIMESTAMPTZ,
    answers_count        BIGINT,
    true_answers_count   BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT q.test_question_id,
           q.test_question_value,
           q.test_question_status,
           q.test_question_data,
           COUNT(a.test_answer_id) AS answers_count,
           COUNT(a.test_answer_id) FILTER (WHERE a.test_answer_status = 1) AS true_answers_count
      FROM public.test_question q
      LEFT JOIN public.test_answer a ON a.id_question = q.test_question_id
     WHERE q.id_test = p_id_test
     GROUP BY q.test_question_id, q.test_question_value, q.test_question_status, q.test_question_data
     ORDER BY q.test_question_id;
END;
$$ LANGUAGE plpgsql;
