// Trocar o perfil de um usuário (aluno ↔ administrador) sem perder as salas.
// Uso: APP=http://127.0.0.1:5250 node tests/perfil-e2e.mjs   (base de dados vazia)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { abrirSala, entrar } from './helpers.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const APP = process.env.APP || 'http://127.0.0.1:5250';
const OUT = process.env.OUT || '.';
const ok = (m) => console.log(`✓ ${m}`);
const b = await chromium.launch();
const admin = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const aluno = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();

await entrar(admin, APP);
await admin.getByRole('button', { name: 'Usuários' }).click();
await admin.getByPlaceholder('ex.: Luan', { exact: true }).fill('Luan Carlos');
await admin.getByPlaceholder('ex.: luan', { exact: true }).fill('luan.carlos');
await admin.locator('.novo-usuario input[type=password]').fill('luan2026');
await admin.getByRole('button', { name: 'Criar usuário' }).click();
await admin.getByText('Usuário “luan.carlos” criado.').waitFor();

const LUAN = { usuario: 'luan.carlos', senha: 'luan2026' };
await entrar(aluno, APP, LUAN);
await abrirSala(aluno, 'Geografia');
assert.equal(await aluno.getByRole('button', { name: 'Usuários' }).count(), 0);
ok('Luan (aluno) criou a sala Geografia e não vê o menu Usuários');

const mudar = async (perfil) => {
  await admin.getByRole('button', { name: 'Usuários' }).click();
  await admin.getByLabel('Perfil de Luan Carlos').selectOption(perfil === 'Administrador' ? 'admin' : 'aluno');
  await admin.getByRole('button', { name: 'Confirmar' }).click();
  await admin.getByText(`alterado para ${perfil}. Salas e progresso foram mantidos.`).waitFor();
};
await mudar('Administrador');
await admin.screenshot({ path: `${OUT}/perfil-usuarios.png` });
await aluno.reload();
await aluno.getByRole('button', { name: 'Usuários' }).waitFor();
await aluno.getByRole('button', { name: 'Minhas salas', exact: true }).click();
assert.deepEqual(await aluno.locator('.sala-nome').allInnerTexts(), ['Geografia']);
ok('promovido a administrador sem sair: passa a ver Usuários e mantém a sala');

await mudar('Aluno');
await aluno.reload();
await aluno.locator('.sala-card').first().waitFor();
assert.equal(await aluno.getByRole('button', { name: 'Usuários' }).count(), 0);
assert.deepEqual(await aluno.locator('.sala-nome').allInnerTexts(), ['Geografia']);
ok('voltou a aluno: perde o menu Usuários e mantém a sala');

await admin.getByRole('button', { name: 'Usuários' }).click();
assert.equal(await admin.getByLabel('Perfil de Rubens').count(), 0, 'o próprio perfil não aparece como lista');
ok('o administrador não consegue tirar o próprio perfil');
await b.close();
