import request from 'supertest';
import { twoWriters } from './helpers';
import { DEFAULT_WRITING_STYLE, QUILL_STYLES } from '../shared/writing-styles';
it('persists reusable styles per account, updates the same name, and protects ownership', async () => {
  const { app, agent, other, owner, project } = await twoWriters();
  const style = { name: 'My opening', definition: QUILL_STYLES[0].definition };
  await request(app).get('/api/writing-styles').expect(401);
  await request(app).post('/api/writing-styles').send(style).expect(401);
  const saved = (await agent.post('/api/writing-styles').send(style).expect(200)).body;
  expect(saved).toMatchObject({ ...style, userId: owner.id });
  expect((await agent.get('/api/writing-styles').expect(200)).body).toHaveLength(1);
  expect((await other.get('/api/writing-styles').expect(200)).body).toEqual([]);
  await other.delete(`/api/writing-styles/${saved.id}`).expect(404);
  await agent.post('/api/writing-styles').send({ ...style, userId: 999 }).expect(400);
  const updated = (await agent.post('/api/writing-styles').send({ ...style, definition: DEFAULT_WRITING_STYLE }).expect(200)).body;
  expect(updated.id).toBe(saved.id);
  expect((await agent.get('/api/writing-styles').expect(200)).body).toHaveLength(1);
  expect(updated.definition).toEqual(DEFAULT_WRITING_STYLE);
  await other.post('/api/writing-styles').send(style).expect(200);
  const content = '<p><span style="font-family: Georgia; font-size: 13pt">Saved writing.</span></p>';
  const chapter = (await agent.post('/api/chapters').send({ projectId: project.id, title: 'Formatting stays', order: 1, content }).expect(201)).body;
  await agent.delete(`/api/writing-styles/${saved.id}`).expect(204);
  expect((await other.get('/api/writing-styles').expect(200)).body).toHaveLength(1);
  expect((await agent.get(`/api/chapters/${chapter.id}`).expect(200)).body.content).toBe(content);
});
it('rejects malformed styles and unsafe arbitrary CSS without losing valid saved styles', async () => {
  const { agent } = await twoWriters();
  for (const definition of [{ ...DEFAULT_WRITING_STYLE, font: 'url(https://example.test)' }, { ...DEFAULT_WRITING_STYLE, size: 500 }, { ...DEFAULT_WRITING_STYLE, color: 'red; background: url(x)' }, { ...DEFAULT_WRITING_STYLE, lineHeight: '-5' }, {}]) {
    await agent.post('/api/writing-styles').send({ name: 'Bad', definition }).expect(400);
  }
  await agent.post('/api/writing-styles').send({ name: ' ', definition: DEFAULT_WRITING_STYLE }).expect(400);
  expect((await agent.get('/api/writing-styles').expect(200)).body).toEqual([]);
});
