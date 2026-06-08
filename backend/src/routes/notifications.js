'use strict';
const express = require('express');
const notifSvc = require('../services/notificationService');

const router = express.Router();

// GET /api/notifications — all (persistent + computed) for current user
router.get('/', async (req, res) => {
  try {
    const onlyUnread = req.query.unread === 'true';
    const items = await notifSvc.getAllForUser(req.user, { onlyUnread });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/notifications/count — unread badge count
router.get('/count', async (req, res) => {
  try {
    const count = await notifSvc.unreadCount(req.user);
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/notifications/:id/read — mark one as read (persistent only)
router.put('/:id/read', async (req, res) => {
  try {
    const row = await notifSvc.markRead(req.params.id, req.user);
    res.json(row || { ok: true, computed: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/notifications/read-all — mark all persistent as read
router.put('/read-all', async (req, res) => {
  try {
    await notifSvc.markAllRead(req.user);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
