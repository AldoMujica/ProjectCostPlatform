const express = require('express');
const { WorkOrderApproval, WorkOrder, User } = require('../models');
const { verificarRol } = require('../middleware/auth');

const router = express.Router();

const STEPS = ['cotizacion', 'compras', 'produccion', 'calidad', 'liberacion_final'];
const ROLE_BY_STEP = {
  cotizacion:       ['admin', 'ventas', 'jefe_area'],
  compras:          ['admin', 'compras', 'jefe_area'],
  produccion:       ['admin', 'jefe_area', 'supervisor'],
  calidad:          ['admin', 'jefe_area'],
  liberacion_final: ['admin', 'jefe_area'],
};

// List approvals for one OT. Auto-creates the 5 pending rows the first time
// an OT is inspected so the UI can render the flow without pre-seeding.
router.get('/:workOrderId', async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.workOrderId);
    if (!wo) return res.status(404).json({ error: 'OT no encontrada' });
    let rows = await WorkOrderApproval.findAll({
      where: { workOrderId: wo.id },
      include: [{ model: User, as: 'decidedByUser', attributes: ['id', 'nombre', 'rol'] }],
      order: [['createdAt', 'ASC']],
    });
    if (rows.length === 0) {
      await WorkOrderApproval.bulkCreate(STEPS.map((step) => ({ workOrderId: wo.id, step })));
      rows = await WorkOrderApproval.findAll({
        where: { workOrderId: wo.id },
        include: [{ model: User, as: 'decidedByUser', attributes: ['id', 'nombre', 'rol'] }],
        order: [['createdAt', 'ASC']],
      });
    }
    // Return in canonical step order.
    rows.sort((a, b) => STEPS.indexOf(a.step) - STEPS.indexOf(b.step));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transition a step. Role-gated per ROLE_BY_STEP. Also enforces that earlier
// steps must be "aprobada" before later ones can transition.
router.post('/:id/transition', async (req, res) => {
  try {
    const row = await WorkOrderApproval.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Paso no encontrado' });
    const { status, comments } = req.body;
    if (!['aprobada', 'rechazada', 'pendiente'].includes(status)) {
      return res.status(400).json({ error: 'status debe ser pendiente, aprobada o rechazada' });
    }
    const allowed = ROLE_BY_STEP[row.step] || [];
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ error: `Rol ${req.user.rol} no puede decidir el paso ${row.step}` });
    }
    if (status === 'aprobada') {
      const earlier = await WorkOrderApproval.findAll({ where: { workOrderId: row.workOrderId } });
      const idx = STEPS.indexOf(row.step);
      for (const r of earlier) {
        const rIdx = STEPS.indexOf(r.step);
        if (rIdx < idx && r.status !== 'aprobada') {
          return res.status(400).json({ error: `Paso previo "${r.step}" aún no está aprobado` });
        }
      }
    }
    await row.update({
      status,
      decidedBy: req.user.id,
      decidedAt: new Date(),
      comments: comments || row.comments,
    });
    // When the final liberation step is approved, flip the OT to Liberada.
    if (row.step === 'liberacion_final' && status === 'aprobada') {
      await WorkOrder.update({ status: 'Liberada' }, { where: { id: row.workOrderId } });
    }
    res.json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin-only reset for a whole OT's approvals (useful for demos / restart).
router.delete('/:workOrderId/reset', verificarRol('admin'), async (req, res) => {
  try {
    await WorkOrderApproval.destroy({ where: { workOrderId: req.params.workOrderId } });
    res.json({ message: 'Flujo reiniciado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
