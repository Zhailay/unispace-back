const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Модель Sotrudnik с использованием хранимых процедур PostgreSQL
 * Таблицы: sotrudnik, sotrudnik_password
 */
class SotrudnikProcedures {
  /**
   * Аутентификация сотрудника через хранимую процедуру
   * @param {string} login - Логин сотрудника
   * @param {string} password - Пароль сотрудника
   * @returns {Object|null} - Данные сотрудника или null
   */
  static async verifyPassword(login, password) {
    try {
      // Вызов хранимой процедуры authenticate_sotrudnik
      const result = await pool.query(
        'SELECT * FROM authenticate_sotrudnik($1)',
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

      // Возвращаем данные сотрудника без хэша пароля
      return {
        id: row.out_sotrudnik_id,
        iin: row.out_sotrudnik_iin,
        lastName: row.out_sotrudnik_familiya,
        firstName: row.out_sotrudnik_imya,
        middleName: row.out_sotrudnik_otchestvo,
        fullName: `${row.out_sotrudnik_familiya} ${row.out_sotrudnik_imya} ${row.out_sotrudnik_otchestvo || ''}`.trim(),
        type: 'sotrudnik'
      };
    } catch (error) {
      console.error('SotrudnikProcedures.verifyPassword error:', error);
      throw error;
    }
  }

  /**
   * Найти сотрудника по ID через хранимую процедуру
   * @param {number} id - ID сотрудника
   * @returns {Object|null} - Данные сотрудника или null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM get_sotrudnik_by_id($1)',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.out_sotrudnik_id,
        sotrudnik_id: row.out_sotrudnik_id,
        iin: row.out_sotrudnik_iin,
        lastName: row.out_sotrudnik_familiya,
        firstName: row.out_sotrudnik_imya,
        middleName: row.out_sotrudnik_otchestvo,
        fullName: `${row.out_sotrudnik_familiya} ${row.out_sotrudnik_imya} ${row.out_sotrudnik_otchestvo || ''}`.trim(),
        type: 'sotrudnik'
      };
    } catch (error) {
      console.error('SotrudnikProcedures.findById error:', error);
      throw error;
    }
  }

  /**
   * Смена пароля сотрудника
   * @param {number} sotrudnikId - ID сотрудника
   * @param {string} currentPassword - Текущий пароль
   * @param {string} newPassword - Новый пароль
   * @returns {Object} - Результат операции
   */
  static async changePassword(sotrudnikId, currentPassword, newPassword) {
    try {
      // Получаем текущий хэш пароля
      const result = await pool.query(
        'SELECT sotrudnik_password_value FROM sotrudnik_password WHERE id_sotrudnik = $1',
        [sotrudnikId]
      );

      if (result.rows.length === 0) {
        return { success: false, messageKey: 'profile.user_not_found' };
      }

      const currentHash = result.rows[0].sotrudnik_password_value;

      // Проверяем текущий пароль
      const isValid = await bcrypt.compare(currentPassword, currentHash);
      if (!isValid) {
        return { success: false, messageKey: 'profile.current_password_wrong' };
      }

      // Хэшируем новый пароль
      const newHash = await bcrypt.hash(newPassword, 10);

      // Обновляем пароль
      await pool.query(
        'UPDATE sotrudnik_password SET sotrudnik_password_value = $1 WHERE id_sotrudnik = $2',
        [newHash, sotrudnikId]
      );

      return { success: true };
    } catch (error) {
      console.error('SotrudnikProcedures.changePassword error:', error);
      throw error;
    }
  }

  // ========== Справочники (spisok) ==========

  static async getSpecList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.spec_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getFormaObuchList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.forma_obuch_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getGodList() {
    const result = await pool.query(`SELECT * FROM public.god_spisok()`);
    return result.rows;
  }

  static async getKursList() {
    const result = await pool.query(`SELECT * FROM public.kurs_spisok()`);
    return result.rows;
  }

  static async getOtdelenieList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.otdelenie_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getPeriodObuchList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.period_obuch_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getGruppaOpList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.gruppa_op_spisok($1)`, [yazyk_id]);
    return result.rows;
  }


  static async getTipModulList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.tip_modul_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getModulNameList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.modul_name_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getObshNameList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.obsh_name_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

    static async getFormaKontrolyaList(yazyk_id) {
    const result = await pool.query(`SELECT * FROM public.forma_kontrolya_spisok($1)`, [yazyk_id]);
    return result.rows;
  }

  static async getYazykList(yazyk_id) {
    const result = await pool.query(
      `SELECT yazyk_id,
              CASE WHEN $1 = 'kk' THEN yazyk_kz
                   WHEN $1 = 'ru' THEN yazyk_ru
                   ELSE yazyk_en END AS yazyk_name
       FROM public.yazyk
       ORDER BY yazyk_id`,
      [yazyk_id]
    );
    return result.rows;
  }

  static async getPodrazdelenieList(yazyk_id) {
    const langMap = { kz: 1, kk: 1, ru: 2, en: 3 };
    const numericId = langMap[yazyk_id] || yazyk_id;
    const result = await pool.query(`SELECT * FROM public.podrazdelenie_spisok($1)`, [numericId]);
    return result.rows;
  }
}

module.exports = SotrudnikProcedures;
