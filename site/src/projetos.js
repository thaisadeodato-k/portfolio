// Pastas dos projetos e painel com camadas de vidro.
import { gsap } from 'gsap';
import { PROJETOS } from './dados.js';
import { urlDaCapa } from './texturas.js';

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Mantém o Tab dentro de um diálogo aberto
export function prenderFoco(caixa, e) {
  if (e.key !== 'Tab') return;
  const itens = [...caixa.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);
  if (!itens.length) return;
  const primeiro = itens[0], ultimo = itens[itens.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
}

const marcado = (txt) => txt.includes('[PREENCHER]') ? `<span class="preencher">${txt}</span>` : txt;

export function iniciarProjetos({ lista, painel, textos, idioma, reduzir, aoMudarRota }) {
  const capas = Object.fromEntries(PROJETOS.map((p) => [p.slug, urlDaCapa(p.textura)]));
  let aberto = null, origem = null, atual = 0;
  const carrossel = lista.closest('.carrossel');
  const controle = carrossel.nextElementSibling;
  const pontos = controle.querySelector('.carrossel-pontos');

  // Carrossel: o cartão do meio fica inteiro, os vizinhos menores dos lados
  function posicionar() {
    const n = PROJETOS.length, meio = Math.floor(n / 2);
    lista.querySelectorAll('li').forEach((li, i) => {
      // Dá a volta: sempre há cartões dos dois lados do meio
      const d = ((i - atual + n + meio) % n) - meio, a = Math.abs(d);
      const antes = Number(li.style.getPropertyValue('--d') || d);
      // Quem troca de lado passa por trás sem atravessar a tela
      li.classList.toggle('pulando', Math.abs(d - antes) > 2);
      li.style.setProperty('--d', d);
      li.style.setProperty('--escala', a === 0 ? 1 : a === 1 ? 0.78 : 0.62);
      li.style.zIndex = 10 - a;
      li.classList.toggle('ativo', d === 0);
      li.classList.toggle('longe', a > 2);
    });
    // Com número par de cartões sobra um de um lado: o conjunto anda meio passo para ficar no centro
    lista.style.setProperty('--desvio', n % 2 === 0 ? 0.5 : 0);
    pontos.querySelectorAll('i').forEach((p, i) => p.classList.toggle('ativo', i === atual));
  }
  function irPara(i, focar = false) {
    atual = (i + PROJETOS.length) % PROJETOS.length;
    posicionar();
    if (focar) lista.querySelectorAll('.pasta')[atual].focus({ preventScroll: true });
  }

  function desenharLista() {
    const t = textos();
    lista.innerHTML = PROJETOS.map((p) => {
      const c = p[idioma()];
      return `
        <li>
          <button class="pasta" type="button" data-slug="${p.slug}" aria-haspopup="dialog">
            <span class="pasta-capa" style="background-image:url(${capas[p.slug]})" aria-hidden="true"></span>
            <span class="pasta-titulo">${c.titulo}</span>
            <span class="pasta-resumo">${c.resumo}</span>
            <span class="pasta-abrir" aria-hidden="true">${t.abrirPasta}</span>
          </button>
        </li>`;
    }).join('');
    pontos.innerHTML = PROJETOS.map(() => '<i></i>').join('');
    controle.querySelector('[data-anterior]').setAttribute('aria-label', t.anterior);
    controle.querySelector('[data-proximo]').setAttribute('aria-label', t.proximo);
    lista.querySelectorAll('.pasta').forEach((b, i) => {
      // Cartão do lado vem para o meio; o do meio abre o projeto
      b.addEventListener('click', () => {
        if (arrastou) return;
        if (i === atual) abrir(b.dataset.slug, b);
        else irPara(i);
      });
      b.addEventListener('focus', () => { if (i !== atual) irPara(i); });
    });
    posicionar();
  }

  controle.querySelector('[data-anterior]').addEventListener('click', () => irPara(atual - 1));
  controle.querySelector('[data-proximo]').addEventListener('click', () => irPara(atual + 1));
  lista.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); irPara(atual - 1, true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); irPara(atual + 1, true); }
  });
  // Arrastar para os lados (toque ou mouse)
  let inicioX = null, arrastou = false;
  carrossel.addEventListener('pointerdown', (e) => { inicioX = e.clientX; arrastou = false; });
  addEventListener('pointerup', (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 40) {
      arrastou = true;
      irPara(atual + (dx < 0 ? 1 : -1));
      setTimeout(() => { arrastou = false; }, 0);
    }
  });

  function preencherPainel(projeto) {
    const t = textos(), c = projeto[idioma()];
    const janela = painel.querySelector('.painel-janela');
    janela.querySelector('.painel-capa').style.backgroundImage = `url(${capas[projeto.slug]})`;
    janela.querySelector('#painel-titulo').textContent = c.titulo;
    janela.querySelector('.painel-resumo').textContent = c.resumo;
    janela.querySelector('.painel-campos').innerHTML = ['problema', 'fez', 'ferramentas', 'resultado']
      .map((k) => `<dt>${t.campos[k]}</dt><dd>${marcado(c[k])}</dd>`).join('');
    janela.querySelector('.painel-link').innerHTML = projeto.link
      ? `<a class="botao-escuro" href="${projeto.link}" target="_blank" rel="noopener">${t.abrirProjeto}</a>`
      : `<span class="sem-link">${t.semLink}</span>`;
    painel.querySelector('.painel-fechar').setAttribute('aria-label', t.fechar);
  }

  // Abre a partir da pasta (ou do disco 3D, ou da URL direta)
  function abrir(slug, de = null, { mudarRota = true } = {}) {
    const projeto = PROJETOS.find((p) => p.slug === slug);
    if (!projeto) return;
    aberto = projeto;
    irPara(PROJETOS.indexOf(projeto));
    origem = de || lista.querySelector(`[data-slug="${slug}"]`);
    preencherPainel(projeto);
    painel.hidden = false;
    document.documentElement.classList.add('travado');
    if (mudarRota) aoMudarRota(slug);

    const janela = painel.querySelector('.painel-janela');
    const camadas = painel.querySelectorAll('.painel-camada');
    const veu = painel.querySelector('.painel-veu');
    const alvo = janela.getBoundingClientRect();
    const de0 = origem?.getBoundingClientRect();
    gsap.killTweensOf([veu, janela, ...camadas]);
    if (reduzir() || !de0) {
      gsap.fromTo([veu, ...camadas, janela], { opacity: 0 }, { opacity: 1, duration: 0.25 });
    } else {
      // Camadas de vidro saem do tamanho e lugar da pasta e crescem em sequência
      const dx = de0.left + de0.width / 2 - (alvo.left + alvo.width / 2);
      const dy = de0.top + de0.height / 2 - (alvo.top + alvo.height / 2);
      const sx = Math.max(0.08, de0.width / alvo.width), sy = Math.max(0.08, de0.height / alvo.height);
      const curva = 'expo.out';
      gsap.fromTo(veu, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: curva });
      gsap.fromTo(camadas, { x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 0 },
        { x: (i) => (i ? -10 : -20), y: (i) => (i ? -10 : -20), scaleX: 1, scaleY: 1, opacity: 1, duration: 0.7, ease: curva, stagger: 0.07 });
      gsap.fromTo(janela, { x: dx, y: dy, scaleX: sx, scaleY: sy, opacity: 0 },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1, duration: 0.75, ease: curva, delay: 0.14 });
    }
    setTimeout(() => painel.querySelector('.painel-fechar').focus(), reduzir() ? 50 : 420);
  }

  function fechar({ mudarRota = true } = {}) {
    if (!aberto) return;
    aberto = null;
    const veu = painel.querySelector('.painel-veu');
    const partes = [veu, ...painel.querySelectorAll('.painel-camada'), painel.querySelector('.painel-janela')];
    gsap.killTweensOf(partes);
    // Termina pelo fim da animação ou pelo relógio, o que vier primeiro
    // (numa aba sem quadros desenhados a animação não chega ao fim)
    let feito = false;
    const concluir = () => {
      if (feito || aberto) return;
      feito = true;
      painel.hidden = true;
      document.documentElement.classList.remove('travado');
      origem?.focus({ preventScroll: true });
    };
    const duracao = reduzir() ? 0.15 : 0.3;
    gsap.to(partes, { opacity: 0, duration: duracao, ease: 'power2.out', onComplete: concluir });
    setTimeout(concluir, duracao * 1000 + 80);
    if (mudarRota) aoMudarRota(null);
  }

  painel.querySelector('.painel-fechar').addEventListener('click', () => fechar());
  painel.querySelector('.painel-veu').addEventListener('click', () => fechar());
  painel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fechar();
    prenderFoco(painel.querySelector('.painel-janela'), e);
  });

  desenharLista();
  return {
    abrir,
    fechar,
    atualizarIdioma() {
      desenharLista();
      if (aberto) preencherPainel(aberto);
    },
    estaAberto: () => Boolean(aberto),
  };
}
