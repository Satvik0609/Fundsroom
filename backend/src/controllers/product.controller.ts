import { Response, NextFunction } from 'express';
import * as productService from '../services/product.service';
import { AuthRequest } from '../middleware/auth';
import { getParamId } from '../utils/params';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await productService.listProducts(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await productService.getProductById(getParamId(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await productService.updateProduct(getParamId(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await productService.getStockMovements(getParamId(req.params.id), req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function listAllMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await productService.listAllStockMovements(req.query as never);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function addMovement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await productService.recordStockMovement(getParamId(req.params.id), req.body, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
