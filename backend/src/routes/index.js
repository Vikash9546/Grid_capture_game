import express from 'express';
import { checkUsername, login, register } from '../controllers/auth.controller.js';
import { getTiles, getTileById } from '../controllers/tile.controller.js';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = express.Router();

// Auth Routes
router.get('/auth/check-username', checkUsername);
router.post('/auth/register', register);
router.post('/auth/login', login);

// Tile Routes
router.get('/tiles', getTiles);
router.get('/tiles/:id', getTileById);

// Leaderboard Route
router.get('/leaderboard', getLeaderboard);

// Health Check
router.get('/health', (req, res) => res.json({ status: 'ok' }));

export default router;
