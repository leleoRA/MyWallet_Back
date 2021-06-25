import supertest from 'supertest';
import app from '../src/app.js';
import connection from './database.js';


describe("GET /teste", () => {
    it("returns status 200 for valid params", async () => {
        const result = await supertest(app).get("/teste");
        expect(result.status).toEqual(200);
    });
});