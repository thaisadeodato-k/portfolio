import './style.css';
import { gsap } from 'gsap';
import { SITE, TEXTOS, PROJETOS } from './dados.js';
import { iniciarProjetos, prenderFoco } from './projetos.js';

const BASE = import.meta.env.BASE_URL;
// Animações seguem o relógio real (ao voltar para a aba, terminam em vez de recomeçar devagar)
gsap.ticker.lagSmoothing(0);
const raiz = document.documentElement;
const params = new URLSearchParams(location.search);
const reduzirMq = matchMedia('(prefers-reduced-motion: reduce)');
// ?movimento=sim força a animação completa (para testar num sistema com "reduzir movimento")
const reduzir = () => reduzirMq.matches && params.get('movimento') !== 'sim';
const celular = matchMedia('(max-width: 760px)').matches;

const lerPref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarPref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

let idioma = lerPref('idioma') === 'pt' ? 'pt' : 'en';
if (params.get('lang') === 'pt' || params.get('lang') === 'en') idioma = params.get('lang');
const textos = () => TEXTOS[idioma];

// Links e contato
document.querySelectorAll('[data-email]').forEach((a) => { a.href = `mailto:${SITE.email}`; a.textContent = SITE.email; });
document.querySelectorAll('[data-link]').forEach((a) => { a.href = SITE.links[a.dataset.link]; });
document.querySelectorAll('[data-cv]').forEach((a) => { a.href = BASE + SITE.cv; });

// Rota: /trabalhos/<slug>/ abre direto o painel
function slugDaRota() {
  const resto = location.pathname.slice(BASE.length - 1);
  const m = resto.match(/^\/trabalhos\/([^/]+)\/?$/);
  return m && PROJETOS.some((p) => p.slug === m[1]) ? m[1] : null;
}
function mudarRota(slug) {
  const destino = slug ? `${BASE}trabalhos/${slug}/` : BASE;
  if (location.pathname !== destino) history.pushState({ slug }, '', destino + location.search);
  const p = PROJETOS.find((x) => x.slug === slug);
  document.title = p ? `${p[idioma].titulo} · ${SITE.nome}` : textos().titulo;
}

const projetos = iniciarProjetos({
  lista: document.querySelector('.pastas'),
  painel: document.querySelector('.painel'),
  textos,
  idioma: () => idioma,
  reduzir,
  aoMudarRota: mudarRota,
});

// Textos no idioma escolhido
function aplicarIdioma() {
  const t = textos();
  raiz.lang = idioma;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t[el.dataset.t]; });
  document.querySelectorAll('[data-t-menu]').forEach((el) => { el.textContent = t.menuItens[el.dataset.tMenu]; });
  document.querySelector('.curiosidades').innerHTML = t.listaCuriosidades.map((c) => `<li>${c}</li>`).join('');
  document.querySelector('.contador').setAttribute('aria-label', `${t.naTerra} ${t.desde} ${SITE.nascimento}`);
  const botaoIdioma = document.querySelector('[data-trocar-idioma]');
  botaoIdioma.textContent = t.idioma;
  botaoIdioma.lang = idioma === 'en' ? 'pt' : 'en';
  botaoIdioma.setAttribute('aria-label', t.idiomaNome);
  if (!projetos.estaAberto()) document.title = t.titulo;
  document.querySelector('meta[name="description"]').content = t.descricao;
  atualizarBotaoTema();
  projetos.atualizarIdioma();
}
function trocarIdioma() {
  idioma = idioma === 'en' ? 'pt' : 'en';
  gravarPref('idioma', idioma);
  aplicarIdioma();
}
document.querySelector('[data-trocar-idioma]').addEventListener('click', trocarIdioma);
document.querySelector('[data-trocar-idioma-menu]').addEventListener('click', trocarIdioma);

// Tema claro e escuro
let cena = null;
function atualizarBotaoTema() {
  const b = document.querySelector('[data-trocar-tema]');
  b.setAttribute('aria-label', raiz.dataset.tema === 'escuro' ? textos().temaClaro : textos().temaEscuro);
}
document.querySelector('[data-trocar-tema]').addEventListener('click', () => {
  raiz.dataset.tema = raiz.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  gravarPref('tema', raiz.dataset.tema);
  cena?.definirTema(raiz.dataset.tema);
  atualizarBotaoTema();
});

// Menu em tela cheia
const menu = document.querySelector('.menu');
const botaoMenu = document.querySelector('[data-abrir-menu]');
function abrirMenu() {
  menu.hidden = false;
  botaoMenu.setAttribute('aria-expanded', 'true');
  raiz.classList.add('travado');
  gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: reduzir() ? 0.15 : 0.45, ease: 'expo.out' });
  if (!reduzir()) gsap.fromTo('.menu-nav a', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 });
  menu.querySelector('[data-fechar-menu]').focus();
}
function fecharMenu(focar = true) {
  if (menu.hidden || botaoMenu.getAttribute('aria-expanded') === 'false') return;
  botaoMenu.setAttribute('aria-expanded', 'false');
  let feito = false;
  const concluir = () => {
    if (feito) return;
    feito = true;
    menu.hidden = true;
    raiz.classList.remove('travado');
    if (focar) botaoMenu.focus();
  };
  gsap.to(menu, { opacity: 0, duration: 0.2, onComplete: concluir });
  setTimeout(concluir, 280);
}
botaoMenu.addEventListener('click', abrirMenu);
menu.querySelector('[data-fechar-menu]').addEventListener('click', () => fecharMenu());
menu.querySelectorAll('.menu-nav a').forEach((a) => a.addEventListener('click', () => fecharMenu(false)));
menu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharMenu();
  prenderFoco(menu, e);
});

// Contador "on Earth since 2001": zeros cinza rolam até o ano
const contador = document.querySelector('.contador-numero');
function animarContador() {
  const zeros = contador.querySelector('.contador-zeros'), ano = contador.querySelector('.contador-ano');
  if (reduzir()) return;
  const estado = { n: 0 };
  gsap.to(estado, {
    n: SITE.nascimento, duration: 1.8, ease: 'expo.out',
    onUpdate: () => {
      const s = String(Math.round(estado.n));
      ano.textContent = s;
      zeros.textContent = '0'.repeat(10 - s.length);
    },
  });
}
new IntersectionObserver((entradas, obs) => {
  if (entradas.some((e) => e.isIntersecting)) { animarContador(); obs.disconnect(); }
}, { threshold: 0.6 }).observe(contador);

// Rolagem: a placa de vidro se parte e os cacos viram os cartões dos trabalhos
const entrada = document.querySelector('.entrada');
if (reduzir()) raiz.classList.add('sem-voo');
function aoRolar() {
  const altura = entrada.offsetHeight - innerHeight;
  const p = Math.min(1, Math.max(0, scrollY / Math.max(1, altura)));
  raiz.style.setProperty('--portal', p.toFixed(3));
  if (!cena) raiz.classList.toggle('placa-escondida', p > 0.2);
  const semVoo = raiz.classList.contains('sem3d') || raiz.classList.contains('sem-voo');
  if (semVoo || !cena) raiz.classList.toggle('trabalhos-visivel', p > 0.75);
  cena?.definirProgresso(p);
}
// A cena amortece a rolagem; a troca dos cacos pelos cartões em HTML segue esse ritmo
function aoVoo(v) {
  raiz.style.setProperty('--voo', v.toFixed(4));
  raiz.classList.toggle('placa-escondida', v > 0.2);
  raiz.classList.toggle('trabalhos-visivel', v > 0.97);
}
addEventListener('scroll', aoRolar, { passive: true });
addEventListener('resize', aoRolar);

// Onde cada cartão do carrossel fica no fim da rolagem da entrada (destino dos cacos)
function medirCartoes() {
  const fim = entrada.offsetTop + entrada.offsetHeight - innerHeight;
  return [...document.querySelectorAll('.pastas li')].map((li) => {
    const r = li.getBoundingClientRect();
    const escala = Number(li.style.getPropertyValue('--escala') || 1);
    return {
      x: r.left, y: r.top + scrollY - fim, w: r.width, h: r.height,
      d: Number(li.style.getPropertyValue('--d') || 0),
      raio: parseFloat(getComputedStyle(li.firstElementChild).borderTopLeftRadius) * escala,
      slug: li.querySelector('.pasta').dataset.slug,
    };
  });
}

// Cursor que cresce sobre botões e links (só com mouse)
if (matchMedia('(pointer: fine)').matches && !reduzir()) {
  const cursor = document.querySelector('.cursor');
  const pos = { x: -100, y: -100 };
  const mover = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const moverY = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
  addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    mover(pos.x); moverY(pos.y);
    const alvo = e.target.closest?.('a, button');
    cursor.classList.toggle('grande', Boolean(alvo));
  });
  raiz.classList.add('com-cursor');
}

// Voltar e avançar do navegador abrem e fecham o painel
addEventListener('popstate', () => {
  const slug = slugDaRota();
  if (slug) projetos.abrir(slug, null, { mudarRota: false });
  else projetos.fechar({ mudarRota: false });
});

aplicarIdioma();
aoRolar();

const slugInicial = slugDaRota();
if (slugInicial) {
  // Rolagem instantânea: a suave seria cortada quando o painel trava a página
  scrollTo({ top: document.querySelector('#trabalhos').getBoundingClientRect().top + scrollY, behavior: 'instant' });
  projetos.abrir(slugInicial, null, { mudarRota: false });
  document.title = `${PROJETOS.find((p) => p.slug === slugInicial)[idioma].titulo} · ${SITE.nome}`;
}

// 3D por último: depois do texto, e só se houver WebGL
function temWebGL() {
  try { return Boolean(document.createElement('canvas').getContext('webgl2')); } catch { return false; }
}
const captura = params.get('capa');
if (captura) raiz.classList.add('modo-captura');
if (!temWebGL() || params.has('sem3d')) {
  raiz.classList.add('sem3d');
} else {
  import('./cena.js').then(async ({ iniciarCena }) => {
    if (captura) raiz.dataset.tema = captura;
    cena = await iniciarCena({
      canvas: document.querySelector('#cena'),
      base: BASE,
      projetos: PROJETOS,
      tema: raiz.dataset.tema,
      reduzir: reduzir(),
      celular: captura ? false : celular,
      captura: captura ? { largura: 1600, altura: 840 } : null,
      // ?teste (só para conferir): começa com a placa montada, sem o voo de chegada
      semChegada: params.has('teste'),
      placaTexto: captura ? null : document.querySelector('.placa-texto'),
      alvos: medirCartoes,
      aoPronto: () => raiz.classList.add('cena-pronta'),
      aoVoo,
    });
    aoRolar();
    if (import.meta.env.DEV) window.__cena = cena;
    if (captura && import.meta.env.DEV) {
      // Só no desenvolvimento: grava a imagem de capa em public/
      setTimeout(async () => {
        const r = await fetch('/__capa', { method: 'POST', body: JSON.stringify({ nome: `capa-${captura}`, dados: cena.imagem() }) });
        raiz.dataset.capaSalva = r.ok ? 'sim' : 'nao';
      }, 2500);
    }
  }).catch((erro) => {
    console.warn('3D indisponível; a página segue só em HTML.', erro);
    raiz.classList.add('sem3d');
  });
}
