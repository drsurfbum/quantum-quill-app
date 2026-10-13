import express from 'express';
import request from 'supertest';
import { authLimiter } from '../server/auth-limit';
it('limits repeated authentication attempts, supplies a retry time, and expires the limit',async()=>{
 let now=0;const app=express();app.use(express.json());app.post('/login',authLimiter(2,1000,()=>now,true),(_req,res)=>res.sendStatus(401));
 await request(app).post('/login').send({username:'a'}).expect(401);await request(app).post('/login').send({username:'A'}).expect(401);
 const limited=await request(app).post('/login').send({username:'a'}).expect(429);expect(limited.headers['retry-after']).toBe('1');
 await request(app).post('/login').send({username:'b'}).expect(401);now=1001;await request(app).post('/login').send({username:'a'}).expect(401);
});
