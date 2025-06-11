import { Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config();

export const registerUser = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send('Bad Request');


    const { email, name, password, birthYear, gender } = req.body;

    if (!email || !name || !password || !birthYear || !gender) return res.status(400).send('Bad Request');

    try {
        const existingUser = await prisma.user.findUnique({
            where: {email},
        });

        if (existingUser) {
            res.status(400).json({error: 'E-Mail already in use'});
        }
    } catch (error) {
        return res.status(500).send('Internal Server Error');
    }

    if (!email || !name || !password || !birthYear) {
        return res.status(400).send('Bad Request');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await prisma.user.create({data: { email, name, password: hashedPassword, birthYear, gender }});
    } catch (error) {
        return res.status(500).send('Internal Server Error');
    }

    return res.status(201).send('User registered successfully');
};

export const loginUser = async (req: Request, res: Response): Promise<any> => {
    if (!req.body) return res.status(400).send('Bad Request');

    const { email, password } = req.body;

    if (!email || !password) return res.status(400).send('Bad Request');

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(400).send('Invalid credentials');

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) return res.status(400).send('Invalid credentials');

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {expiresIn : '7d'});

        res.cookie('token', token, { httpOnly: true });

        return res.status(200).send(token);
    } catch (error) {
        return res.status(500).send('Internal Server Error');
    }
}
