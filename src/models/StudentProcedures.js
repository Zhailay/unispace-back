const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Модель Student с использованием хранимых процедур PostgreSQL
 * Таблицы: student, student_password
 */
class StudentProcedures {
  /**
   * Аутентификация студента через хранимую процедуру
   * @param {string} login - Логин студента
   * @param {string} password - Пароль студента
   * @returns {Object|null} - Данные студента или null
   */
  static async verifyPassword(login, password) {
    try {
      // Вызов хранимой процедуры authenticate_student
      const result = await pool.query(
        'SELECT * FROM authenticate_student($1)',
        [login]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Проверка пароля
      const isValid = await bcrypt.compare(password, row.out_password_hash);
      if (!isValid) {
        return null;
      }

      // Возвращаем данные студента без хэша пароля
      return {
        id: row.out_student_id,
        iin: row.out_student_iin,
        lastName: row.out_student_familiya,
        firstName: row.out_student_imya,
        middleName: row.out_student_otchestvo,
        fullName: `${row.out_student_familiya} ${row.out_student_imya} ${row.out_student_otchestvo || ''}`.trim(),
        type: 'student'
      };
    } catch (error) {
      console.error('StudentProcedures.verifyPassword error:', error);
      throw error;
    }
  }

  /**
   * Найти студента по ID через хранимую процедуру
   * @param {number} id - ID студента
   * @returns {Object|null} - Данные студента или null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM get_student_by_id($1)',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // console.log(row);
      return {
        id: row.out_student_id,
        student_id: row.out_student_id,
        iin: row.out_student_iin,
        lastName: row.out_student_familiya,
        firstName: row.out_student_imya,
        middleName: row.out_student_otchestvo,
        fullName: `${row.out_student_familiya} ${row.out_student_imya} ${row.out_student_otchestvo || ''}`.trim(),
        type: 'student'
      };
    } catch (error) {
      console.error('StudentProcedures.findById error:', error);
      throw error;
    }
  }

  /**
   * Смена пароля студента
   * @param {number} studentId - ID студента
   * @param {string} currentPassword - Текущий пароль
   * @param {string} newPassword - Новый пароль
   * @returns {Object} - Результат операции
   */
  static async changePassword(studentId, currentPassword, newPassword) {
    try {
      // Получаем текущий хэш пароля
      const result = await pool.query(
        'SELECT student_password_value FROM student_password WHERE id_student = $1',
        [studentId]
      );

      if (result.rows.length === 0) {
        return { success: false, messageKey: 'profile.user_not_found' };
      }

      const currentHash = result.rows[0].student_password_value;

      // Проверяем текущий пароль
      const isValid = await bcrypt.compare(currentPassword, currentHash);
      if (!isValid) {
        return { success: false, messageKey: 'profile.current_password_wrong' };
      }

      // Хэшируем новый пароль
      const newHash = await bcrypt.hash(newPassword, 10);

      // Обновляем пароль
      await pool.query(
        'UPDATE student_password SET student_password_value = $1 WHERE id_student = $2',
        [newHash, studentId]
      );

      return { success: true };
    } catch (error) {
      console.error('StudentProcedures.changePassword error:', error);
      throw error;
    }
  }
}

module.exports = StudentProcedures;
