import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import joi from 'joi';
import {v4 as uuidv4} from 'uuid';
import dayjs from 'dayjs';
import connection from './database.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/teste', (req, res) => {
    res.sendStatus(200);
});

/* ---------------------- Sign-up ---------------------- */

app.post('/sign-up', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    const userSchema = joi.object({
        name: joi.string().trim().required(),
        email: joi.string().trim().email().required(),
        password: joi.string().min(6).required(),
        confirmPassword: joi.string().valid(joi.ref('password')).required()
    })

    try {
        const emailExists = await connection.query(`
            SELECT * FROM users 
            WHERE email = $1`
            , [email]);
        if (emailExists.rows[0]) return res.sendStatus(409);

        const hash = bcrypt.hashSync(password, 12);

        const isValid = userSchema.validate({name, email, password, confirmPassword});
        if (isValid.error === undefined){
            await connection.query(`
                INSERT INTO users 
                (name, email, password) 
                VALUES ($1, $2, $3)`
                , [name, email, hash]);
            return res.sendStatus(201);
        } else {
            return res.sendStatus(400);
        }

    } catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

/* ---------------------- Login ---------------------- */

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await connection.query(`
            SELECT * FROM users
            WHERE email = $1`
            , [email]);
        const user = result.rows[0];

        if (user && bcrypt.compareSync(password, user.password)){
            const token = uuidv4();

            const result = await connection.query(`
                INSERT INTO sessions
                ("userId", token)
                VALUES ($1, $2)`
                , [user.id, token]);

            res.send(token)

        } else{
            return res.sendStatus(401);
        }

    } catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

/* ---------------------- Get finances ---------------------- */

app.get('/finances', async (req, res) => {
    const authorization = req.header("Authorization");
    const token = authorization?.replace("Bearer ", "");
    
    try{
        if (!token) return res.sendStatus(400);

        const tokenValidation = await connection.query(`
            SELECT * FROM sessions
            JOIN users
            ON sessions."userId" = users.id
            WHERE sessions.token = $1`
            , [token]);
        
        const user = tokenValidation.rows[0];

        if (user){
            const result = await connection.query(`
                SELECT * FROM finances
                WHERE "userId" = $1`
                , [user.id]);
            res.send(result.rows);
        } else{
            return res.sendStatus(404);
        }

    } catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

/* ---------------------- Add revenue/expense ---------------------- */

app.post('/finances', async (req, res) => {
    const { value, description, eventType } = req.body;
    const authorization = req.header("Authorization");
    const token = authorization?.replace("Bearer ", "");

    const financeSchema = joi.object({
        value: joi.number().integer().required(),
        description: joi.string().min(1).max(20).required(),
    });

    try {
        if (!token) return res.sendStatus(400);

        const isValid = financeSchema.validate({value, description});
        if (isValid.error === undefined){
            const user = await connection.query(`
                SELECT "userId" FROM sessions
                WHERE token = $1`
                , [token]);

            await connection.query(`
            INSERT INTO finances
            ("userId", value, description, "eventType", date)
            VALUES ($1, $2, $3, $4, NOW())`
            , [user.rows[0].userId, value, description, eventType]);

            return res.sendStatus(201);
        } else {
            return res.sendStatus(400);
        }
        
    } catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

/* ---------------------- Logout ---------------------- */

app.post('/logout', async (req, res) => {
    const authorization = req.header("Authorization");
    const token = authorization?.replace("Bearer ", "");

    try{
        if (!token) return res.sendStatus(401);

        await connection.query(`
            DELETE FROM sessions
            WHERE token = $1`
            , [token]);
        res.sendStatus(200);

    } catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

export default app;