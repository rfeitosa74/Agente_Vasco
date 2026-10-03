import test from 'node:test';
import assert from 'node:assert/strict';
import { analisarMensagem, acharPrazo, proximoDiaUtil, tirarPrefixoWhatsApp, extrairItens } from '../js/core/zap.js';

const QUARTA = '2026-10-07'; // quarta-feira

test('vários componentes na mesma mensagem, com formatação do WhatsApp', () => {
  const msg = `*TAREFA DE CASA* 📚
*Matemática:* livro pág. 54, exercícios 1, 2 e 3
*Português*: Redação sobre as férias (mínimo 15 linhas) para sexta
História - Apostila cap. 3, questões 1 a 5
✅ Geografia: ler a página 22`;
  const r = analisarMensagem(msg, QUARTA);
  assert.deepEqual(r.tarefas.map((t) => t.disciplina), ['Matemática', 'Português', 'História', 'Geografia']);
  assert.match(r.tarefas[0].descricao, /pág\. 54/);
  assert.equal(r.tarefas[1].entrega, '2026-10-09'); // sexta
  assert.equal(r.tarefas[1].itens[0].tipo, 'redacao');
  assert.equal(r.tarefas[2].origem, 'apostila');
  assert.equal(r.tarefas[0].entrega, '2026-10-08'); // sem prazo: próximo dia de aula
});

test('questões numeradas viram itens, com alternativas objetivas', () => {
  const msg = `Ciências:
1) O que é fotossíntese?
2) Cite dois exemplos de seres vivos produtores.
3) Assinale a correta:
a) A planta respira só de noite
b) A planta produz o próprio alimento
c) A planta não precisa de luz`;
  const [t] = analisarMensagem(msg, QUARTA).tarefas;
  assert.equal(t.disciplina, 'Ciências');
  assert.equal(t.itens.length, 3);
  assert.equal(t.itens[2].tipo, 'objetiva');
  assert.equal(t.itens[2].opcoes.length, 3);
  assert.equal(t.itens[0].enunciado, 'O que é fotossíntese?');
});

test('prefixo de exportação do WhatsApp é removido e dá a data da mensagem', () => {
  const msg = `[05/10/2026 18:42] Profª Ana: Matemática: pág 60 ex 1 a 4 para amanhã`;
  const r = analisarMensagem(msg, '2026-10-20');
  assert.equal(r.dataMensagem, '2026-10-05');
  assert.equal(r.tarefas[0].disciplina, 'Matemática');
  assert.equal(r.tarefas[0].entrega, '2026-10-06');
  assert.equal(tirarPrefixoWhatsApp('05/10/2026 18:42 - Ana: oi').linha, 'oi');
  assert.equal(tirarPrefixoWhatsApp('[18:42, 05/10/2026] Ana: oi').dia, 5);
});

test('sem cabeçalho: usa a disciplina citada, se for uma só', () => {
  const r = analisarMensagem('Gente, lembrando que a lição de Geografia é ler o capítulo 4 e responder as perguntas do final. Entregar quinta.', QUARTA);
  assert.equal(r.tarefas.length, 1);
  assert.equal(r.tarefas[0].disciplina, 'Geografia');
  assert.equal(r.tarefas[0].entrega, '2026-10-08');
});

test('sem pista nenhuma: uma tarefa “Outra” com o texto inteiro e aviso', () => {
  const r = analisarMensagem('Fazer as páginas 10 e 11 do livro.', QUARTA);
  assert.equal(r.tarefas.length, 1);
  assert.equal(r.tarefas[0].disciplina, 'Outra');
  assert.ok(r.avisos.some((a) => /disciplina/.test(a)));
});

test('prazos: amanhã, dia da semana, data, dia do mês, depois de amanhã', () => {
  assert.equal(acharPrazo('entregar amanhã', QUARTA), '2026-10-08');
  assert.equal(acharPrazo('para depois de amanhã', QUARTA), '2026-10-09');
  assert.equal(acharPrazo('para segunda', QUARTA), '2026-10-12');
  assert.equal(acharPrazo('para quarta', QUARTA), '2026-10-14'); // mesma quarta → a da semana seguinte
  assert.equal(acharPrazo('até 15/10', QUARTA), '2026-10-15');
  assert.equal(acharPrazo('entrega dia 9', QUARTA), '2026-10-09');
  assert.equal(acharPrazo('prazo: dia 3', QUARTA), '2026-11-03'); // dia 3 já passou: próximo mês
  assert.equal(acharPrazo('pág 54 ex 3/4', QUARTA), null); // fração/numeração não é data
});

test('próximo dia útil pula fim de semana e dia livre', () => {
  assert.equal(proximoDiaUtil('2026-10-09'), '2026-10-12');
  assert.equal(proximoDiaUtil('2026-10-09', ['2026-10-12']), '2026-10-13');
});

test('lista com marcadores e linhas de continuação', () => {
  const { itens, sobra } = extrairItens(['Leia o texto', '- Qual é o título?', '- Quem são os personagens e o que', 'eles fazem?']);
  assert.equal(itens.length, 2);
  assert.match(itens[1].enunciado, /o que eles fazem/);
  assert.deepEqual(sobra, ['Leia o texto']);
});

test('cálculo, verdadeiro/falso e redação são reconhecidos', () => {
  const { itens } = extrairItens(['1) Calcule 12 x 15', '2) (V) ou (F): o Nilo corre para o norte', '3) Escreva um texto contando sua melhor viagem']);
  assert.deepEqual(itens.map((i) => i.tipo), ['calculo', 'vf', 'redacao']);
});

test('texto vazio devolve aviso e nenhuma tarefa', () => {
  const r = analisarMensagem('   \n  ', QUARTA);
  assert.equal(r.tarefas.length, 0);
  assert.ok(r.avisos.length);
});

test('palavras comuns no meio da frase não viram cabeçalho', () => {
  const r = analisarMensagem('Matemática: resolver os problemas da pág. 12. Leia sobre a história do Brasil no livro.', QUARTA);
  assert.equal(r.tarefas.length, 1);
  assert.equal(r.tarefas[0].disciplina, 'Matemática');
});
