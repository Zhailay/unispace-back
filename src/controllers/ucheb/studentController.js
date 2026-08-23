const SotrudnikProcedures = require('../../models/SotrudnikProcedures');
const db = require('../../config/database');
const bcrypt = require('bcryptjs');

class StudentController {

  static async staffStudents(req, res) {
    try {

      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);

      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const yazyk_id = req.session.lang;

      const [spec_list, forma_obuch_list, god_list, kurs_list] = await Promise.all([
        SotrudnikProcedures.getSpecList(yazyk_id),
        SotrudnikProcedures.getFormaObuchList(yazyk_id),
        SotrudnikProcedures.getGodList(),
        SotrudnikProcedures.getKursList()
      ]);

      res.json({ ok: true, data: { spec_list, forma_obuch_list, god_list, kurs_list } });

    } catch (error) {
      console.error('Staff students error:', error);

      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async insertStudent(req, res) {
  try {
    const {
      student_imya,
      student_otchestvo,
      student_familiya,
      student_iin,
      id_gruppa,
      id_kurs,
      gruppa_student_status,
      student_password, 
      student_email
    } = req.body;

    if (
      !student_imya ||
      !student_otchestvo ||
      !student_familiya ||
      !student_iin ||
      !id_gruppa ||
      !id_kurs ||
      !gruppa_student_status ||
      !student_password ||
      !student_email
    ) {
      return res.json({
        success: false,
        message: 'Заполните все обязательные поля'
      });
    }

    const hashedPassword = await bcrypt.hash(student_password, 10);

    const result = await db.query(
      `
      SELECT *
      FROM public.student_full(
        $1,  -- p_command
        $2,  -- p_student_like
        $3,  -- p_limit
        $4,  -- p_offset
        $5,  -- p_student_id
        $6,  -- p_student_imya
        $7,  -- p_student_otchestvo
        $8,  -- p_student_familiya
        $9,  -- p_student_iin
        $10, -- p_id_gruppa
        $11, -- p_id_kurs
        $12, -- p_gruppa_student_status
        $13, -- p_student_password_value
        $14  -- p_student_email
      )
      `,
      [
        1,                    // INSERT
        null,                 // like
        null,                 // limit
        null,                 // offset
        null,                 // student_id
        student_imya,
        student_otchestvo,
        student_familiya,
        student_iin,
        id_gruppa,
        id_kurs,
        gruppa_student_status,
        hashedPassword,
        student_email
      ]
    );

    const row = result.rows[0];

    if (!row) {
      return res.json({
        success: false,
        message: 'Не удалось добавить студента'
      });
    }

    if (row.out_code === 1) {
      return res.json({
        success: true,
        message: 'Студент успешно добавлен',
        login: row.out_student_login
      });
    }

    if (row.out_code === 2) {
      return res.json({
        success: false,
        message: 'Студент с таким ИИН уже существует'
      });
    }

    return res.json({
      success: false,
      message: 'Неизвестный результат операции'
    });

  } catch (error) {
    console.error('Ошибка при добавлении студента:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при добавлении студента'
    });
  }
}


  static async deleteStudent(req, res) {
    try {

      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({
          success: false,
          message: 'Не авторизован'
        });
      }

      const { student_id } = req.body;

      if (!student_id) {
        return res.json({
          success: false,
          message: 'Не указан идентификатор студента'
        });
      }

      await db.query(
        `
      SELECT 1
      FROM public.student_full(
        3,        -- DELETE
        NULL,
        NULL,
        NULL,
        $1
      )
      `,
        [student_id]
      );

      return res.json({
        success: true,
        message: 'Студент успешно удален'
      });

    } catch (error) {
      console.error('Ошибка при удалении студента:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка сервера при удалении'
      });
    }
  }

  static async updateStudent(req, res) {
  try {
    const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
    if (!sotrudnik) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован'
      });
    }

    const {
      student_id,
      student_imya,
      student_otchestvo,
      student_familiya,
      student_iin,
      id_gruppa,
      id_kurs,
      gruppa_student_status,
      student_email
    } = req.body;

    // ✅ правильная валидация
    if (
      !student_id ||
      !student_imya ||
      !student_otchestvo ||
      !student_familiya ||
      !student_iin ||
      !id_gruppa ||
      !id_kurs ||
      !student_email
    ) {
      return res.json({
        success: false,
        message: 'Заполните все обязательные поля'
      });
    }

    await db.query(
      `
      SELECT 1
      FROM public.student_full(
        $1,  -- p_command
        $2,  -- p_student_like
        $3,  -- p_limit
        $4,  -- p_offset
        $5,  -- p_student_id
        $6,  -- p_student_imya
        $7,  -- p_student_otchestvo
        $8,  -- p_student_familiya
        $9,  -- p_student_iin
        $10, -- p_id_gruppa
        $11, -- p_id_kurs
        $12, -- p_gruppa_student_status
        $13, -- p_student_password_value
        $14  -- p_student_email
      )
      `,
      [
        2,                      // UPDATE
        null,                   // p_student_like
        null,                   // p_limit
        null,                   // p_offset
        student_id,
        student_imya,
        student_otchestvo,
        student_familiya,
        student_iin,
        id_gruppa,
        id_kurs,
        gruppa_student_status ?? 1,
        null,                   // p_student_password_value (не меняем при UPDATE)
        student_email
      ]
    );

    return res.json({
      success: true,
      message: 'Студент успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка при обновлении студента:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении'
    });
  }
}

static async changeStudentPassword(req, res) {
  try {
    const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
    if (!sotrudnik) {
      return res.status(401).json({
        success: false,
        message: 'Не авторизован'
      });
    }

    const {
      student_id,
      student_password_value
    } = req.body;

    // ✅ правильная валидация
    if (
      !student_id ||
      !student_password_value
    ) {
      return res.json({
        success: false,
        message: 'Заполните все обязательные поля'
      });
    }

     const hashedPassword = await bcrypt.hash(student_password_value, 10);
    await db.query(
      `
      SELECT 1
      FROM public.student_full(
        $1,  -- p_command
        $2,  -- p_student_like
        $3,  -- p_limit
        $4,  -- p_offset
        $5,  -- p_student_id
        $6,  -- p_student_imya
        $7,  -- p_student_otchestvo
        $8,  -- p_student_familiya
        $9,  -- p_student_iin
        $10, -- p_id_gruppa
        $11, -- p_id_kurs
        $12, -- p_gruppa_student_status
        $13, -- p_student_password_value
        $14  -- p_student_email
      )
      `,
      [
        5,                      // CHANGE_PASSWORD
        null,                   // p_student_like
        null,                   // p_limit
        null,                   // p_offset
        student_id,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        hashedPassword,                   // p_student_password_value (не меняем при UPDATE)
        null
      ]
    );

    return res.json({
      success: true,
      message: 'Пароль студента успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка при изменении пароля студента:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при изменении пароля'
    });
  }
}

  static async selectStudents(req, res) {
    try {
      const search = req.body.search || '';
      const limit = parseInt(req.body.limit, 10) || 20;
      const offset = parseInt(req.body.offset, 10) || 0;

      const result = await db.query(
        `
      SELECT *
      FROM public.student_full(
        4,        -- команда: просто SELECT
        $1,       -- p_student_like
        $2,       -- limit
        $3        -- offset
      )
      ORDER BY out_student_id
      `,
        [search, limit, offset]
      );

      const totalResult = await db.query(
        `
      SELECT COUNT(*) AS total
      FROM public.student
      WHERE
        student_imya ILIKE '%' || $1 || '%'
        OR student_otchestvo ILIKE '%' || $1 || '%'
        OR student_iin ILIKE '%' || $1 || '%'
      `,
        [search]
      );

      const totalCount = parseInt(totalResult.rows[0].total, 10);

      return res.json({
        success: true,
        data: result.rows,
        totalCount
      });

    } catch (error) {
      console.error('Ошибка при получении списка студентов:', error);
      return res.status(500).json({
        success: false,
        message: 'Ошибка сервера при получении студентов'
      });
    }
  }

  static async selectGroups(req, res) {
  try {
    const {
      id_god,
      id_spec,
      id_forma_obuch
    } = req.body;

    // Минимальная валидация
    if (!id_god || !id_spec || !id_forma_obuch) {
      return res.json({
        success: false,
        message: 'Не все параметры переданы'
      });
    }

    const result = await db.query(
      `
      SELECT *
      FROM public.gruppa_spisok(
        $1,
        $2,
        $3
      )
      `,
      [
        id_god,
        id_spec,
        id_forma_obuch
      ]
    );

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении групп'
    });
  }
}


}

module.exports = StudentController;
