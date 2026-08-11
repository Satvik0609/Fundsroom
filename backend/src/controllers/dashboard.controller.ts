import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function health(_req: Request, res: Response) {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
}
