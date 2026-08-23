const pool = require('../config/database');

class EmployeesProcedures {

  static _mapRow(row) {
    return {
      id: Number(row.out_podrazdelenie_sotrudnik_id),
      podrazdelenieId: Number(row.out_id_podrazdelenie) || 0,
      doljnostId: Number(row.out_id_doljnost) || 0,
      shtatnostId: Number(row.out_id_shtatnost) || 0,
      sotrudnikId: Number(row.out_id_sotrudnik) || 0,
      formaZamescheniyaId: Number(row.out_id_podrazdelenie_sotrudnik_type) || 0,
      status: row.out_podrazdelenie_sotrudnik_status,
      iin: row.out_sotrudnik_iin,
      familiya: row.out_sotrudnik_familiya,
      imya: row.out_sotrudnik_imya,
      otchestvo: row.out_sotrudnik_otchestvo,
      code: row.out_code != null ? Number(row.out_code) : null
    };
  }

  static async getAll(search, limit, offset) {
    const result = await pool.query(
      'SELECT * FROM sotrudnik_full($1, $2, $3, $4)',
      [0, search || null, limit || null, offset || null]
    );
    return result.rows.map(EmployeesProcedures._mapRow);
  }

  static async create({ iin, familiya, imya, otchestvo, podrazdelenieId, doljnostId, shtatnostId, formaZamescheniyaId, status }) {
    const result = await pool.query(
      'SELECT * FROM sotrudnik_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [1, null, null, null, null,
       podrazdelenieId || null, doljnostId || null, shtatnostId || null,
       null, formaZamescheniyaId != null ? formaZamescheniyaId : 0, status ?? true,
       iin, familiya, imya, otchestvo || null]
    );
    return result.rows.length > 0 ? EmployeesProcedures._mapRow(result.rows[0]) : null;
  }

  static async update(id, { iin, familiya, imya, otchestvo, podrazdelenieId, doljnostId, shtatnostId, formaZamescheniyaId, status }) {
    const result = await pool.query(
      'SELECT * FROM sotrudnik_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [2, null, null, null, id,
       podrazdelenieId || null, doljnostId || null, shtatnostId || null,
       null, formaZamescheniyaId != null ? formaZamescheniyaId : 0, status ?? true,
       iin, familiya, imya, otchestvo || null]
    );
    return result.rows.map(EmployeesProcedures._mapRow);
  }

  static async delete(id) {
    const result = await pool.query(
      'SELECT * FROM sotrudnik_full($1, $2, $3, $4, $5)',
      [3, null, null, null, id]
    );
    return result.rows.map(EmployeesProcedures._mapRow);
  }

  static async getFormaZamescheniyaList() {
    const result = await pool.query(
      'SELECT podrazdelenie_sotrudnik_type_id, podrazdelenie_sotrudnik_type_kz, podrazdelenie_sotrudnik_type_ru, podrazdelenie_sotrudnik_type_en FROM podrazdelenie_sotrudnik_type ORDER BY podrazdelenie_sotrudnik_type_id'
    );
    return result.rows.map(row => ({
      id: row.podrazdelenie_sotrudnik_type_id,
      kz: row.podrazdelenie_sotrudnik_type_kz,
      ru: row.podrazdelenie_sotrudnik_type_ru,
      en: row.podrazdelenie_sotrudnik_type_en
    }));
  }

  static async getVidShtatnostList() {
    const result = await pool.query(
      'SELECT shtatnost_id, shtatnost_kz, shtatnost_ru, shtatnost_en FROM shtatnost ORDER BY shtatnost_id'
    );
    return result.rows.map(row => ({
      id: row.shtatnost_id,
      kz: row.shtatnost_kz,
      ru: row.shtatnost_ru,
      en: row.shtatnost_en
    }));
  }
}

module.exports = EmployeesProcedures;
