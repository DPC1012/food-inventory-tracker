import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if(!token)
    {
        return res.status(401).json({
            success: false,
            data: null,
            error: "Unauthorized"
        })
    }
    try
    {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
        req.userId = (decoded as any).userId;
        next();
    }
    catch(e)
    {
        return res.status(401).json({
            success: false,
            data: null,
            error:"Invalid token"
        })
    }
}