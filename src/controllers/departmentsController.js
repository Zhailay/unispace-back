const SotrudnikProcedures = require('../models/SotrudnikProcedures');
const DepartmentsProcedures = require('../models/DepartmentsProcedures');

class DepartmentsController {

  static async staffDepartments(req, res) {
    try {
      const sotrudnik = await SotrudnikProcedures.findById(req.session.userId);
      if (!sotrudnik) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      const search = req.query.search || null;
      const [departments, vidList] = await Promise.all([
        DepartmentsProcedures.getAll(search),
        DepartmentsProcedures.getVidList()
      ]);

      const total = departments.length;
      const active = departments.filter(d => d.status === true).length;

      // Создаём map для vidName и parentName
      const vidMap = {};
      vidList.forEach(v => { vidMap[v.id] = v.ru; });
      const depMap = {};
      departments.forEach(d => { depMap[d.id] = d; });
      departments.forEach(d => {
        d.vidName = vidMap[d.vidId] || '';
        d.parentName = depMap[d.secondId] ? depMap[d.secondId].ru : '';
      });

      // Строим дерево из плоского списка
      const tree = DepartmentsController._buildTree(departments);

      res.json({
        ok: true,
        data: {
          departments,
          treeJson: JSON.stringify(tree),
          allDepartments: departments,
          vidList,
          meta: { total, active },
          search
        }
      });
    } catch (error) {
      console.error('Staff departments error:', error);
      res.status(500).json({ ok: false, error: req.t('error.internal_server') });
    }
  }

  static async createDepartment(req, res) {
    try {
      const { name_kz, name_ru, name_en, type_id, parent_id, order, is_active } = req.body;

      const result = await DepartmentsProcedures.create({
        kz: name_kz,
        ru: name_ru,
        en: name_en,
        nomer: order ? parseInt(order) : null,
        secondId: parent_id ? parseInt(parent_id) : 0,
        vidId: type_id ? parseInt(type_id) : null,
        status: is_active === 'on'
      });

      if (result && result.code === 2) {
        return res.json({ ok: false, error: 'Такое подразделение уже существует' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('Create department error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при создании подразделения' });
    }
  }

  static async updateDepartment(req, res) {
    try {
      const id = parseInt(req.params.id);
      const { name_kz, name_ru, name_en, type_id, parent_id, order, is_active } = req.body;

      await DepartmentsProcedures.update(id, {
        kz: name_kz,
        ru: name_ru,
        en: name_en,
        nomer: order ? parseInt(order) : null,
        secondId: parent_id ? parseInt(parent_id) : 0,
        vidId: type_id ? parseInt(type_id) : null,
        status: is_active === 'on'
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('Update department error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при обновлении подразделения' });
    }
  }

  static _buildTree(departments) {
    const map = {};
    const roots = [];
    const orphans = [];
    departments.forEach(d => {
      map[d.id] = { ...d, children: [] };
    });
    departments.forEach(d => {
      if (!d.secondId || d.secondId === 0) {
        // Корневой элемент (нет родителя)
        roots.push(map[d.id]);
      } else if (map[d.secondId]) {
        // Родитель есть в списке
        map[d.secondId].children.push(map[d.id]);
      } else {
        // Родитель не найден в БД
        orphans.push(map[d.id]);
      }
    });
    return { roots, orphans };
  }

  static async deleteDepartment(req, res) {
    try {
      const id = parseInt(req.params.id);
      await DepartmentsProcedures.delete(id);
      return res.json({ ok: true });
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({ ok: false, error: 'Ошибка при удалении подразделения' });
    }
  }
}

module.exports = DepartmentsController;
