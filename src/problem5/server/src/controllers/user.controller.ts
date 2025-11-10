import { NextFunction, Request, Response } from "express";
import { UserService } from "../services/user.service";
import {
    loginSchema,
    signupSchema,
    updateUserSchema,
} from "../types/user.types";

export class UserController {
    private readonly userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    signup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = signupSchema.parse(req.body);
            const user = await this.userService.signup(validatedData);
            res.status(201).json(user);
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = loginSchema.parse(req.body);
            const { user, token } = await this.userService.login(validatedData);
            res.status(200).json({ user, token });
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const result = await this.userService.delete(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const validatedData = updateUserSchema.parse(req.body);
            const user = await this.userService.update(id, validatedData);
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };
}
