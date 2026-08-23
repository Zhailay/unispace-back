const bcrypt = require('bcryptjs');
const pool = require('../config/database');

/**
 * Seed script для заполнения таблиц тестовыми данными
 * Работает с таблицами: student, sotrudnik, student_password, sotrudnik_password
 * Логин - это числовой идентификатор (например ИИН)
 */
async function seed() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...');

    await client.query('BEGIN');

    // Очистка таблиц перед вставкой
    await client.query('DELETE FROM student_password');
    await client.query('DELETE FROM sotrudnik_password');
    await client.query('DELETE FROM student');
    await client.query('DELETE FROM sotrudnik');
    console.log('✓ Tables cleared');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Создание тестовых сотрудников
    const sotrudnik1 = await client.query(
      `INSERT INTO sotrudnik (sotrudnik_iin, sotrudnik_familiya, sotrudnik_imya, sotrudnik_otchestvo)
       VALUES ($1, $2, $3, $4) RETURNING sotrudnik_id`,
      ['123456789012', 'Администраторов', 'Админ', 'Админович']
    );

    const sotrudnik2 = await client.query(
      `INSERT INTO sotrudnik (sotrudnik_iin, sotrudnik_familiya, sotrudnik_imya, sotrudnik_otchestvo)
       VALUES ($1, $2, $3, $4) RETURNING sotrudnik_id`,
      ['234567890123', 'Сеитова', 'Айгуль', 'Нурлановна']
    );

    console.log('✓ Sotrudnik created');

    // Создание паролей для сотрудников (логин - числовой идентификатор)
    await client.query(
      `INSERT INTO sotrudnik_password (id_sotrudnik, sotrudnik_password_login, sotrudnik_password_value)
       VALUES ($1, $2, $3)`,
      [sotrudnik1.rows[0].sotrudnik_id, '111111111111', passwordHash]
    );

    await client.query(
      `INSERT INTO sotrudnik_password (id_sotrudnik, sotrudnik_password_login, sotrudnik_password_value)
       VALUES ($1, $2, $3)`,
      [sotrudnik2.rows[0].sotrudnik_id, '222222222222', passwordHash]
    );

    console.log('✓ Sotrudnik passwords created');

    // Создание тестовых студентов
    const student1 = await client.query(
      `INSERT INTO student (student_iin, student_familiya, student_imya, student_otchestvo)
       VALUES ($1, $2, $3, $4) RETURNING student_id`,
      ['345678901234', 'Жумабаев', 'Асылхан', 'Ерланулы']
    );

    const student2 = await client.query(
      `INSERT INTO student (student_iin, student_familiya, student_imya, student_otchestvo)
       VALUES ($1, $2, $3, $4) RETURNING student_id`,
      ['456789012345', 'Нурсултанова', 'Айжан', 'Кайраткызы']
    );

    console.log('✓ Students created');

    // Создание паролей для студентов (логин - числовой идентификатор)
    await client.query(
      `INSERT INTO student_password (id_student, student_password_login, student_password_value)
       VALUES ($1, $2, $3)`,
      [student1.rows[0].student_id, '333333333333', passwordHash]
    );

    await client.query(
      `INSERT INTO student_password (id_student, student_password_login, student_password_value)
       VALUES ($1, $2, $3)`,
      [student2.rows[0].student_id, '444444444444', passwordHash]
    );

    console.log('✓ Student passwords created');

    await client.query('COMMIT');

    console.log('\n=== Seeding completed successfully! ===');
    console.log('\nТестовые аккаунты (Сотрудники):');
    console.log('Админ:        логин: 111111111111 / пароль: password123');
    console.log('Преподаватель: логин: 222222222222 / пароль: password123');
    console.log('\nТестовые аккаунты (Студенты):');
    console.log('Студент 1:    логин: 333333333333 / пароль: password123');
    console.log('Студент 2:    логин: 444444444444 / пароль: password123');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
