import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import joi from 'joi';
import {v4 as uuidv4} from "uuid";

const app = express();
app.use(cors());
app.use(express.json());

const databaseConfig = {
    user: 'postgres',
    password: '123456',
    database: 'mywallet',
    host: 'localhost',
    port: 5432
};

const { Pool } = pg;
const connection = new Pool(databaseConfig);

/* ------- Sign-up ------- */

app.post('/sign-up', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    const userSchema = joi.object({
        name: joi.string().trim().required(),
        email: joi.string().trim().required(),
        password: joi.string().min(6).required(),
        confirmPassword: joi.string().min(6).required()
    })

    try{
        if (password !== confirmPassword) return res.sendStatus(406);

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

    } catch (e){
        console.log(e);
        res.sendStatus(500);
    }
});

/* ------- Login ------- */

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try{
        const result = await connection.query(`
            SELECT * FROM users
            WHERE email = $1`
            , [email]);
        const user = result.rows[0];

        if (user && bcrypt.compareSync(password, user.password)){
            const token = uuidv4();

            await connection.query(`
                INSERT INTO sessions
                ("userId", token)
                VALUES ($1, $2)`
                , [user.id, token]);

            res.send(token)
            console.log(token)

        } else{
            return res.sendStatus(401);
        }

    } catch (e){
        console.log(e);
        res.sendStatus(500);
    }
});


app.listen(4000, () => {
    console.log('Server running on port 4000')
});