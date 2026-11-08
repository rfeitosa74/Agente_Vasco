// Testes do armazenamento (usuários, salas, materiais) numa pasta temporária.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sala-teste-'));
const S = await import('../server/store.js');

test('usuários: senha com hash, login, troca de senha e último administrador', () => {
  const admin = S.criarUsuario({ usuario: 'Rubens', nome: 'Rubens', senha: 'segredo1', admin: true });
  assert.equal(admin.usuario, 'rubens');
  const bruto = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'usuarios.json'), 'utf8'));
  assert.ok(!JSON.stringify(bruto).includes('segredo1'), 'senha não fica em texto puro');
  assert.ok(S.verificarLogin('RUBENS', 'segredo1'));
  assert.equal(S.verificarLogin('rubens', 'errada'), null);
  assert.equal(S.verificarLogin('ninguem', 'segredo1'), null);
  assert.throws(() => S.criarUsuario({ usuario: 'rubens', senha: 'outra123' }), /Já existe/);
  assert.throws(() => S.criarUsuario({ usuario: 'luan', senha: '123' }), /6 caracteres/);
  assert.throws(() => S.criarUsuario({ usuario: 'com espaço', senha: '123456' }), /letras minúsculas/);
  const antes = S.buscarUsuario(admin.id).versaoSenha;
  S.alterarUsuario(admin.id, { senha: 'novasenha' });
  assert.equal(S.buscarUsuario(admin.id).versaoSenha, antes + 1, 'troca de senha encerra sessões');
  assert.throws(() => S.removerUsuario(admin.id), /único administrador/);
});

test('salas e materiais ficam separados por usuário', () => {
  const a = S.criarUsuario({ usuario: 'pai', senha: '123456', admin: true });
  const b = S.criarUsuario({ usuario: 'filho', senha: '123456' });
  const sala = S.criarSala(a.id, { nome: 'Ciências', tipo: 'disciplina' });
  assert.throws(() => S.criarSala(a.id, { nome: '  ' }), /nome/);
  const m = S.criarMaterial(a.id, sala.id, { tipo: 'texto', nome: 'Eclipses' }, 'texto da aula');
  S.salvarAnalise(a.id, sala.id, m.id, { titulo: 'Eclipses', conceitos: [{ id: 'x' }] });
  S.salvarEstado(a.id, sala.id, m.id, { conceitoId: 'x' });
  assert.equal(S.listarSalas(a.id)[0].totalMateriais, 1);
  assert.equal(S.lerSala(a.id, sala.id).materiais[0].titulo, 'Eclipses');
  assert.deepEqual(S.lerMaterial(a.id, sala.id, m.id).estado, { conceitoId: 'x' });
  assert.deepEqual(S.listarSalas(b.id), []);
  assert.throws(() => S.lerSala(b.id, sala.id), /não encontrada/);
  assert.throws(() => S.lerMaterial(b.id, sala.id, m.id), /não encontrado/);
  assert.throws(() => S.lerSala(a.id, '../../usuarios.json'), /id inválido/);
  const img = S.salvarImagem(a.id, sala.id, m.id, { mimeType: 'image/png', data: Buffer.from('png').toString('base64') });
  assert.equal(Buffer.from(S.lerImagem(a.id, sala.id, m.id, img).data, 'base64').toString(), 'png');
  S.removerMaterial(a.id, sala.id, m.id);
  assert.equal(S.lerSala(a.id, sala.id).materiais.length, 0);
  S.removerSala(a.id, sala.id);
  assert.deepEqual(S.listarSalas(a.id), []);
});
