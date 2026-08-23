const SotrudnikProcedures = require('../models/SotrudnikProcedures');
const EmployeesProcedures = require('../models/EmployeesProcedures');
const DepartmentsProcedures = require('../models/DepartmentsProcedures');
const PositionsProcedures = require('../models/PositionsProcedures');

class EmployeesController {

  static async staffEmployees(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const search = req.query.search || null;
      const [employees, departments, positions, formaList, shtatnostList] = await Promise.all([
        EmployeesProcedures.getAll(search),
        DepartmentsProcedures.getAll(),
        PositionsProcedures.getAll(),
        EmployeesProcedures.getFormaZamescheniyaList(),
        EmployeesProcedures.getVidShtatnostList()
      ]);

      const depMap = {};
      departments.forEach(d => { depMap[d.id] = d.ru; });
      const posMap = {};
      positions.forEach(p => { posMap[p.id] = p.ru; });
      const formaMap = {};
      formaList.forEach(f => { formaMap[f.id] = f.ru; });
      const shtatnostMap = {};
      shtatnostList.forEach(s => { shtatnostMap[s.id] = s.ru; });

      employees.forEach(e => {
        e.podrazdelenieName = depMap[e.podrazdelenieId] || '';
        e.doljnostName = posMap[e.doljnostId] || '';
        e.formaZamescheniyaName = formaMap[e.formaZamescheniyaId] || '';
        e.shtatnostName = shtatnostMap[e.shtatnostId] || '';
      });

      const total = employees.length;
      const active = employees.filter(e => e.status === true).length;

      res.json({
        ok: true,
        data: {
          employees,
          departments,
          positions,
          formaList,
          shtatnostList,
          meta: { total, active },
          search
        }
      });
    } catch (error) {
      console.error('Staff employees error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async createEmployee(req, res) {
    try {
      const { iin, lastname, firstname, middlename, department_id, position_id, replacement_form_id, staffing_id, is_active } = req.body;

      const result = await EmployeesProcedures.create({
        iin,
        familiya: lastname,
        imya: firstname,
        otchestvo: middlename || null,
        podrazdelenieId: department_id ? parseInt(department_id) : null,
        doljnostId: position_id ? parseInt(position_id) : null,
        formaZamescheniyaId: replacement_form_id ? parseInt(replacement_form_id) : 0,
        shtatnostId: staffing_id ? parseInt(staffing_id) : null,
        status: is_active === 'on'
      });

      if (result && result.code === 2) {
        return res.json({ ok: false, error: 'Сотрудник с таким ИИН уже существует' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при создании сотрудника' });
    }
  }

  static async updateEmployee(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { iin, lastname, firstname, middlename, department_id, position_id, replacement_form_id, staffing_id, is_active } = req.body;

      await EmployeesProcedures.update(id, {
        iin,
        familiya: lastname,
        imya: firstname,
        otchestvo: middlename || null,
        podrazdelenieId: department_id ? parseInt(department_id) : null,
        doljnostId: position_id ? parseInt(position_id) : null,
        formaZamescheniyaId: replacement_form_id ? parseInt(replacement_form_id) : 0,
        shtatnostId: staffing_id ? parseInt(staffing_id) : null,
        status: is_active === 'on'
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при обновлении сотрудника' });
    }
  }

  static async deleteEmployee(req, res) {
    try {
      const id = parseInt(req.params.id);
      await EmployeesProcedures.delete(id);
      return res.json({ ok: true });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при удалении сотрудника' });
    }
  }
}

module.exports = EmployeesController;
