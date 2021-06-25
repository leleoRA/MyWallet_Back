import supertest from 'supertest';

import app from '../src/app.js';
import connection from '../src/database.js';


describe('POST /sign-up', () => {

    it('returns status 201 when there is no user with given email', async () => {
        const body = {
            name: 'Fulano',
            email: 'fulano@email.com',
            password: '123456',
            confirmPassword: '123456'
        };

        const result = await supertest(app).post('/sign-up').send(body);

        expect(result.status).toEqual(201);
    });

    it('returns status 409 when there already an user with given email', async () => {
        const body = {
            name: 'Fulano',
            email: 'fulano@email.com',
            password: '123456',
            confirmPassword: '123456'
        };

        await connection.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`, [body.name, body.email, body.password]);
        const result = await supertest(app).post('/sign-up').send(body);

        expect(result.status).toEqual(409);
    });
});

describe('POST /login', () => {

    it('returns status 401 when email doesnt exists', async () => {
        const body = {
            email: "fulano@email.com",
            password: "123456"
          };
      
          await supertest(app).post("/sign-up").send(body);
      
          const result = await supertest(app).post("/login").send({ email: body.email, password: "654321" });
      
          expect(result.status).toEqual(401);
    });

});

beforeEach(async () => {
    await connection.query(`DELETE FROM users`);
});
  
afterAll(() => {
    connection.end();
});