import { Response, NextFunction } from 'express';
import * as customerService from '../services/customer.service';
import { AuthRequest } from '../middleware/auth';
import { getParamId } from '../utils/params';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerService.listCustomers(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await customerService.getCustomerById(getParamId(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await customerService.createCustomer(req.body, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await customerService.updateCustomer(getParamId(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function addFollowUp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await customerService.addFollowUp(getParamId(req.params.id), req.body, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
