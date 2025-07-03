import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config();

export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send('Bad Request');


    const { email, name, password, birthYear, gender } = req.body;

    if (!email || !name || !password || !birthYear || !gender) return res.status(400).send('Bad Request');

    try {
        const existingUser = await prisma.user.findUnique({
            where: {email},
        });

        if (existingUser) return res.status(400).send("Registration failed: Please check your credentials");
    } catch (error) {
        next(error);
    }

    if (!email || !name || !password || !birthYear) {
        return res.status(400).send('Bad Request');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await prisma.user.create({data: { email, name, password: hashedPassword, birthYear: parseInt(birthYear), gender }});
    } catch (error) {
        next(error);
    }

    return res.status(201).send('User registered successfully');
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (!req.body) return res.status(400).send('Bad Request');

    const { email, password } = req.body;

    if (!email || !password) return res.status(400).send('Bad Request');

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(401).send('Unauthorized');

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) return res.status(401).send('Unauthorized');

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {expiresIn : '1d'});

        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).send(token);
    } catch (error) {
        next(error);
    }
}

export const isAuthenticated = async (req: Request, res: Response): Promise<any> => {
    let token = req.headers.authorization?.split(' ')[1];

    if (!token) token = req.cookies.token; 

    if (!token) return res.status(401).send('Unauthorized');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user) return res.status(401).send('Unauthorized');

        return res.status(200).send(token);
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send('Unauthorized');
    }
}

export const logoutUser = async (req: Request, res: Response): Promise<any> => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    return res.status(200).send('Logged out successfully');
}