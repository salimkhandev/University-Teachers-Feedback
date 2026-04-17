import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface TokenPayload {
  id: string;
  role: string;
}

export const generateAccessToken = (userId: string, role: string): string =>
  jwt.sign({ id: userId, role }, ENV.JWT_SECRET, { expiresIn: '15m' });

export const generateRefreshToken = (userId: string): string =>
  jwt.sign({ id: userId }, ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;

export const verifyRefreshToken = (token: string): { id: string } =>
  jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { id: string };
