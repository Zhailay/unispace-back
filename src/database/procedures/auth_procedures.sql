-- Хранимые процедуры для авторизации
-- Использует таблицы: student, sotrudnik, student_password, sotrudnik_password

-- ============================================
-- Удаление старых функций
-- ============================================
DROP FUNCTION IF EXISTS authenticate_student(VARCHAR);
DROP FUNCTION IF EXISTS authenticate_student(CHARACTER VARYING);
DROP FUNCTION IF EXISTS authenticate_sotrudnik(VARCHAR);
DROP FUNCTION IF EXISTS authenticate_sotrudnik(CHARACTER VARYING);
DROP FUNCTION IF EXISTS get_student_by_id(INTEGER);
DROP FUNCTION IF EXISTS get_student_by_id(BIGINT);
DROP FUNCTION IF EXISTS get_sotrudnik_by_id(INTEGER);
DROP FUNCTION IF EXISTS get_sotrudnik_by_id(BIGINT);

-- ============================================
-- Процедура авторизации студента
-- ============================================
CREATE FUNCTION authenticate_student(p_login VARCHAR(255))
RETURNS TABLE (
    out_student_id BIGINT,
    out_student_iin VARCHAR,
    out_student_familiya VARCHAR,
    out_student_imya VARCHAR,
    out_student_otchestvo VARCHAR,
    out_password_hash VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.student_id,
        s.student_iin,
        s.student_familiya,
        s.student_imya,
        s.student_otchestvo,
        sp.student_password_value
    FROM public.student s
    INNER JOIN public.student_password sp ON s.student_id = sp.id_student
    WHERE sp.student_password_login = p_login;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Процедура авторизации сотрудника
-- ============================================
CREATE FUNCTION authenticate_sotrudnik(p_login VARCHAR(255))
RETURNS TABLE (
    out_sotrudnik_id BIGINT,
    out_sotrudnik_iin VARCHAR,
    out_sotrudnik_familiya VARCHAR,
    out_sotrudnik_imya VARCHAR,
    out_sotrudnik_otchestvo VARCHAR,
    out_password_hash VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.sotrudnik_id,
        s.sotrudnik_iin,
        s.sotrudnik_familiya,
        s.sotrudnik_imya,
        s.sotrudnik_otchestvo,
        sp.sotrudnik_password_value
    FROM public.sotrudnik s
    INNER JOIN public.sotrudnik_password sp ON s.sotrudnik_id = sp.id_sotrudnik
    WHERE sp.sotrudnik_password_login = p_login;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Процедура получения студента по ID
-- ============================================
CREATE FUNCTION get_student_by_id(p_student_id BIGINT)
RETURNS TABLE (
    out_student_id BIGINT,
    out_student_iin VARCHAR,
    out_student_familiya VARCHAR,
    out_student_imya VARCHAR,
    out_student_otchestvo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.student_id,
        s.student_iin,
        s.student_familiya,
        s.student_imya,
        s.student_otchestvo
    FROM public.student s
    WHERE s.student_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Процедура получения сотрудника по ID
-- ============================================
CREATE FUNCTION get_sotrudnik_by_id(p_sotrudnik_id BIGINT)
RETURNS TABLE (
    out_sotrudnik_id BIGINT,
    out_sotrudnik_iin VARCHAR,
    out_sotrudnik_familiya VARCHAR,
    out_sotrudnik_imya VARCHAR,
    out_sotrudnik_otchestvo VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.sotrudnik_id,
        s.sotrudnik_iin,
        s.sotrudnik_familiya,
        s.sotrudnik_imya,
        s.sotrudnik_otchestvo
    FROM public.sotrudnik s
    WHERE s.sotrudnik_id = p_sotrudnik_id;
END;
$$ LANGUAGE plpgsql;
