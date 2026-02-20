import { Response } from "express";

export function sendOk<T>(res: Response, body: T): void {
  res.status(200).json(body);
}

export function sendAccepted<T>(res: Response, body: T): void {
  res.status(202).json(body);
}
