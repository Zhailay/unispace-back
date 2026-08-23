-- Получить все вопросы и ответы теста (для страницы управления / экспорта).
CREATE OR REPLACE FUNCTION public.test_question_with_answers(
    p_id_test BIGINT
)
RETURNS TABLE (
    question_id     BIGINT,
    question_value  VARCHAR,
    question_status SMALLINT,
    answer_id       BIGINT,
    answer_value    VARCHAR,
    answer_status   SMALLINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT q.test_question_id,
           q.test_question_value,
           q.test_question_status,
           a.test_answer_id,
           a.test_answer_value,
           a.test_answer_status
      FROM public.test_question q
      LEFT JOIN public.test_answer a ON a.id_question = q.test_question_id
     WHERE q.id_test = p_id_test
     ORDER BY q.test_question_id, a.test_answer_id;
END;
$$ LANGUAGE plpgsql;
