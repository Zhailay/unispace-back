const pool = require('../config/database');

class DepartmentsProcedures {

  static _mapRow(row) {
    return {
      id: Number(row.out_podrazdelenie_id),
      kz: row.out_podrazdelenie_kz,
      ru: row.out_podrazdelenie_ru,
      en: row.out_podrazdelenie_en,
      nomer: row.out_podrazdelenie_nomer != null ? Number(row.out_podrazdelenie_nomer) : null,
      secondId: Number(row.out_podrazdelenie_second_id) || 0,
      vidId: Number(row.out_id_vid_podrazdelenie) || 0,
      status: row.out_podrazdelenie_status,
      code: row.out_code != null ? Number(row.out_code) : null
    };
  }

  static async getAll(search, limit, offset) {
    const result = await pool.query(
      'SELECT * FROM podrazdelenie_full($1, $2, $3, $4)',
      [0, search || null, limit || null, offset || null]
    );
    return result.rows.map(DepartmentsProcedures._mapRow);
  }

  static async create({ kz, ru, en, nomer, secondId, vidId, status }) {
    const result = await pool.query(
      'SELECT * FROM podrazdelenie_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [1, null, null, null, null, kz, ru, en, nomer || null, secondId, vidId || null, status ?? true]
    );
    return result.rows.length > 0 ? DepartmentsProcedures._mapRow(result.rows[0]) : null;
  }

  static async update(id, { kz, ru, en, nomer, secondId, vidId, status }) {
    const result = await pool.query(
      'SELECT * FROM podrazdelenie_full($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [2, null, null, null, id, kz, ru, en, nomer || null, secondId ?? 0, vidId || null, status ?? true]
    );
    return result.rows.map(DepartmentsProcedures._mapRow);
  }

  static async getVidList() {
    const result = await pool.query(
      'SELECT vid_podrazdelenie_id, vid_podrazdelenie_kz, vid_podrazdelenie_ru, vid_podrazdelenie_en FROM vid_podrazdelenie ORDER BY vid_podrazdelenie_id'
    );
    return result.rows.map(row => ({
      id: row.vid_podrazdelenie_id,
      kz: row.vid_podrazdelenie_kz,
      ru: row.vid_podrazdelenie_ru,
      en: row.vid_podrazdelenie_en
    }));
  }

  static async delete(id) {
    const result = await pool.query(
      'SELECT * FROM podrazdelenie_full($1, $2, $3, $4, $5)',
      [3, null, null, null, id]
    );
    return result.rows.map(DepartmentsProcedures._mapRow);
  }
}

module.exports = DepartmentsProcedures;
