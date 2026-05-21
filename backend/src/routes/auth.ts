import { Router, Request, Response } from 'express';
import User from '../models/User';
import { comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    console.log('[auth/login] Login attempt for username:', username);
    
    if (!username || !password) {
      console.log('[auth/login] Missing username or password');
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    const user = await User.findOne({ username });
    console.log('[auth/login] User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('[auth/login] User not found in database');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, user.password);
    console.log('[auth/login] Password valid:', valid ? 'YES' : 'NO');
    
    if (!valid) {
      console.log('[auth/login] Invalid password');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const accessToken  = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    console.log('[auth/login] Login successful for user:', user.name, 'role:', user.role);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const user    = await User.findById(payload.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role);
    res.json({ accessToken });
  } catch (err) {
    console.error('[auth/refresh-token]', err);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
