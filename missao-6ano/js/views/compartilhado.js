// Peças usadas pelas telas do Luan e do pai.
import { h } from '../util/dom.js';
import { getState } from '../store.js';
import { resumoSemana, NIVEL_NOME, semanasOuroSeguidas } from '../core/xp.js';
import { fecharSemana } from '../actions.js';
import { abrirModal, chip, toast } from '../ui.js';
import { weekStart, fmtCurto, addDays } from '../util/dates.js';

/** Fechamento de sábado: soma o XP, mostra o nível e registra a recompensa escolhida. */
export function abrirFechamento(inicio, aoSalvar) {
  const s = getState();
  const ini = weekStart(inicio);
  const r = resumoSemana(s, ini);
  const reg = s.semanas[ini];
  const niveis = ['bronze', 'prata', 'ouro'].filter((k) => r.total >= s.config.niveis[k]);
  const rec = h('select', { 'aria-label': 'Recompensa escolhida' },
    h('option', { value: '' }, niveis.length ? 'Escolha a recompensa…' : 'Sem nível esta semana'),
    ...niveis.map((k) => h('option', { value: s.config.recompensas[k], selected: reg?.recompensa === s.config.recompensas[k] }, `${NIVEL_NOME[k]}: ${s.config.recompensas[k]}`)));
  const melhor = h('textarea', { 'aria-label': 'Melhor momento da semana', placeholder: 'Qual foi o melhor momento da semana?' }, reg?.melhor || '');
  let fechar;
  const corpo = h('div', { class: 'stack' },
    h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, `Semana de ${fmtCurto(ini)} a ${fmtCurto(addDays(ini, 6))}`), h('div', { class: 'hero', style: { fontSize: '2.6rem' } }, `⭐ ${r.total} XP`)),
      r.nivel ? chip(`Nível ${NIVEL_NOME[r.nivel]}`, 'ok') : chip('Sem nível ainda', '')),
    h('p', { class: 'small muted' }, `${r.completos} de ${r.necessarios} dias completos${r.bonus ? ` · bônus de semana cheia +${r.bonus} XP` : ''}. XP nunca é tirado: o que foi conquistado é dele.`),
    h('div', null, h('label', null, 'Recompensa'), rec),
    h('div', null, h('label', null, 'Melhor momento da semana'), melhor),
    h('div', { class: 'row', style: { justifyContent: 'flex-end' } },
      h('button', { class: 'btn ghost', onClick: () => fechar() }, 'Cancelar'),
      h('button', { class: 'btn primary', onClick: () => {
        fecharSemana(ini, { recompensa: rec.value, melhor: melhor.value.trim() });
        const n = semanasOuroSeguidas(getState());
        toast(n >= 4 ? '🏅 Conquista do Mês desbloqueada!' : 'Semana fechada!');
        fechar();
        aoSalvar?.();
      } }, reg?.fechada ? 'Atualizar fechamento' : 'Fechar a semana')));
  fechar = abrirModal(corpo, { titulo: 'Fechamento da semana' });
}
