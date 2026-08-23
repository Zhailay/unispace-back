const pool = require('../config/database');

class PositionsProcedures {

  static _mapRow(row) {
    return {
      id: Number(row.out_doljnost_id),
      kz: row.out_doljnost_kz,
      ru: row.out_doljnost_ru,
      en: row.out_doljnost_en,
      vidPersonalId: Number(row.out_id_vid_personal) || 0,
      code: row.out_code != null ? Number(row.out_code) : null
    };
  }

  static async getAll(search, limit, offset) {
    const result = await pool.query(
      'SELECT * FROM doljnost_full($1, $2, $3, $4)',
      [0, search || null, limit || null, offset || null]
    );
    return result.rows.map(PositionsProcedures._mapRow);
  }

  static async create({ kz, ru, en, vidPersonalId }) {
    const result = await pool.query(
      'SELECT * FROM doljnost_full($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [1, null, null, null, null, kz, ru, en, vidPersonalId || null]
    );
    return result.rows.length > 0 ? PositionsProcedures._mapRow(result.rows[0]) : null;
  }

  static async update(id, { kz, ru, en, vidPersonalId }) {
    const result = await pool.query(
      'SELECT * FROM doljnost_full($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [2, null, null, null, id, kz, ru, en, vidPersonalId || null]
    );
    return result.rows.map(PositionsProcedures._mapRow);
  }

  static async delete(id) {
    const result = await pool.query(
      'SELECT * FROM doljnost_full($1, $2, $3, $4, $5)',
      [3, null, null, null, id]
    );
    return result.rows.map(PositionsProcedures._mapRow);
  }

  static async getVidPersonalList() {
    const result = await pool.query(
      'SELECT vid_personal_id, vid_personal_kz, vid_personal_ru, vid_personal_en FROM vid_personal ORDER BY vid_personal_id'
    );
    return result.rows.map(row => ({
      id: row.vid_personal_id,
      kz: row.vid_personal_kz,
      ru: row.vid_personal_ru,
      en: row.vid_personal_en
    }));
  }
}

module.exports = PositionsProcedures;
