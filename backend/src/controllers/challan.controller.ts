import { Response, NextFunction } from 'express';
import * as challanService from '../services/challan.service';
import { AuthRequest } from '../middleware/auth';
import { getParamId } from '../utils/params';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await challanService.listChallans(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await challanService.getChallanById(getParamId(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await challanService.createChallan(req.body, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await challanService.updateChallan(getParamId(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await challanService.confirmChallan(getParamId(req.params.id), req.user!.userId);
    res.json({ success: true, data, message: 'Challan confirmed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await challanService.cancelChallan(getParamId(req.params.id));
    res.json({ success: true, data, message: 'Challan cancelled successfully' });
  } catch (err) {
    next(err);
  }
}
