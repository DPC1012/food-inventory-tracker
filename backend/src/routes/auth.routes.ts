import e, { type Request, type Response } from "express"
import { loginSchema, registerSchema } from "../validation/auth.schema";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { User } from "../models/user";
const authRouter = e.Router();

authRouter.post("/register",async (req: Request, res: Response) => {
    const { data, success} = registerSchema.safeParse(req.body);
    if(!success)
    {
        res.status(400).json({
            success,
            data: null,
            error: "Invalid input"
        })
        return
    }

    const findUser = await User.findOne({email: data?.email});
    if(findUser)
    {
        res.status(409).json({
            success: false,
            data: null,
            error: "User already exist"
        })
    }
    try
    {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const response = await User.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
        })
    
        res.status(201).json({
            success,
            data: {
                id: response.id,
                name: response.name
            }
        })
        return;
    }
    catch(e)
    {
        return res.status(500).json({
            success: false,
            data: null,
            error: "Internal server error"
        })
    }
})

const secret = process.env.JWT_SECRET;
if(!secret) {
    throw new Error("JWT secret is not defined")
}
authRouter.post("/login", async (req: Request, res: Response) => {
    const { data, success } = loginSchema.safeParse(req.body);
    if(!success)
    {
        res.status(400).json({
            success,
            data: null,
            error: "Invalid input"
        })
        return;
    }
    const findUser = await User.findOne({email: data.email});
    if(!findUser)
    {
        res.status(404).json({
            success: false,
            data: null,
            error: "User not found"
        })
        return;
    }
    try
    {
        const isCorrectPassword = await bcrypt.compare(data?.password, findUser.password)
        if(!isCorrectPassword)
        {
            res.status(401).json({
                success: false,
                data: null,
                error: "Invalid credentials"
            })
            return;
        }
        const token = jwt.sign({userId: findUser._id}, secret);
        return res.status(201).json({
            success,
            data: {
                token
            },
            error: null
        })
    }
    catch(e)
    {
        return res.status(500).json({
            success: false,
            data: null,
            error: "Internal server error"
        })
    }
})
export default authRouter;