import { Repository } from "typeorm";
import { AppDataSource } from "../libs/data-source";
import { User } from "../models/user.model";
import { LoginInput, SignupInput, UpdateUserInput } from "../types/user.types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../utils/errors";
import "dotenv/config";

export class UserService {
    private readonly userRepository: Repository<User>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
    }

    async signup(data: SignupInput) {
        const normalizedEmail = data.email.trim().toLowerCase();
        const existingUser = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            throw new ConflictError("Email already exists");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = this.userRepository.create({
            ...data,
            email: normalizedEmail,
            password: hashedPassword,
        });

        await this.userRepository.save(user);

        return user;
    }

    async login(data: LoginInput) {
        const normalizedEmail = data.email.trim().toLowerCase();

        const user = await this.userRepository
            .createQueryBuilder("user")
            .addSelect("user.password")
            .where("LOWER(user.email) = :email", { email: normalizedEmail })
            .getOne();

        if (!user) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
            data.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const token = jwt.sign(
            { sub: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: "24h" },
        );

        return { user, token };
    }

    async delete(id: string) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundError("User not found");
        }
        await this.userRepository.remove(user);
        return { message: "User deleted successfully" };
    }

    async update(id: string, data: UpdateUserInput) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isPasswordValid = await bcrypt.compare(
            data.oldPassword,
            user.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid password");
        }

        if (data.name) {
            user.name = data.name;
        }

        if (data.email) {
            user.email = data.email.trim().toLowerCase();
        }

        if (data.newPassword) {
            user.password = await bcrypt.hash(data.newPassword, 10);
        }

        await this.userRepository.save(user);
        return user;
    }
}
