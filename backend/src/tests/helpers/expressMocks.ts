/**
 * Builders for fake Express `req`, `res`, and `next`. Used in middleware
 * unit tests where spinning up a full app would obscure the assertion.
 */
import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

export const buildReq = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request);

export const buildRes = (): Response & { _status?: number; _json?: unknown } => {
  const res: any = {};
  res.status = jest.fn<(code: number) => any>().mockImplementation((code: number) => {
    res._status = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((body: unknown) => {
    res._json = body;
    return res;
  });
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

export const buildNext = (): jest.MockedFunction<NextFunction> =>
  jest.fn() as unknown as jest.MockedFunction<NextFunction>;