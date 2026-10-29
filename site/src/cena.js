// Cena 3D da entrada: uma placa de vidro escuro partida em 5 cacos.
// Na rolagem, os cacos voam e viram os 5 cartões do carrossel de trabalhos.
// Carregada só depois do texto da página (import dinâmico em main.js).
// Unidades: 1 unidade do mundo = 1 px da tela no plano z = 0.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { desenhar } from './texturas.js';

const graus = (g) => (g * Math.PI) / 180;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const suavizar = (atual, alvo, taxa, dt) => atual + (alvo - atual) * (1 - Math.exp(-taxa * dt));
const degrau = (a, b, x) => { const t = limitar((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const comSobra = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

const TEMAS = {
  escuro: { fundo: 0x0f1113, ponto: 0xeef3ff, destaque: 0x5b7bff, mistura: THREE.AdditiveBlending, vidro: 0x1c1d22, ambiente: 0.8, aspereza: 0.3 },
  claro: { fundo: 0xfafaf8, ponto: 0x111111, destaque: 0x1f4bff, mistura: THREE.NormalBlending, vidro: 0xb4b6be, ambiente: 1.1, aspereza: 0.22 },
};

// Cortes da placa, em coordenadas da placa (x para a direita, y para baixo, de 0 a 1).
// [x, y, anda em x, anda em y]: os pontos das bordas só andam na horizontal.
const ANCORAS = {
  TL: [0, 0, 0, 0], TR: [1, 0, 0, 0], BR: [1, 1, 0, 0], BL: [0, 1, 0, 0],
  tAB: [0.46, 0, 1, 0], tBC: [0.64, 0, 1, 0], tCE: [0.86, 0, 1, 0],
  bAD: [0.52, 1, 1, 0], bDE: [0.8, 1, 1, 0],
  J0: [0.56, 0.7, 1, 1], J1: [0.62, 0.5, 1, 1], J2: [0.8, 0.46, 1, 1],
};
// Um caco por projeto. O primeiro é o principal: leva o texto
const CELULAS_5 = [
  ['TL', 'tAB', 'J0', 'bAD', 'BL'],
  ['tAB', 'tBC', 'J1', 'J0'],
  ['tBC', 'tCE', 'J2', 'J1'],
  ['J0', 'J1', 'J2', 'bDE', 'bAD'],
  ['tCE', 'TR', 'BR', 'bDE', 'J2'],
];
// Com 4 projetos, os dois cacos de cima do meio viram um só
const CELULAS_4 = [CELULAS_5[0], ['tAB', 'tCE', 'J2', 'J1', 'J0'], CELULAS_5[3], CELULAS_5[4]];
// Muitos pontos no contorno: cantos lisos, sem facetas
const PONTOS_CONTORNO = 180;
// Chanfro arredondado das bordas (em unidades de S)
const CHANFRO = 3.6;

// Recua um polígono para dentro (as frestas entre os cacos)
function recuar(pts, g) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  const lado = area > 0 ? 1 : -1;
  const linhas = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const d = new THREE.Vector2().subVectors(b, a).normalize();
    const n = new THREE.Vector2(-d.y, d.x).multiplyScalar(lado * g);
    return { p: a.clone().add(n), d };
  });
  return linhas.map((l, i) => {
    const k = linhas[(i - 1 + linhas.length) % linhas.length];
    const cruz = k.d.x * l.d.y - k.d.y * l.d.x;
    if (Math.abs(cruz) < 1e-6) return l.p.clone();
    const t = ((l.p.x - k.p.x) * l.d.y - (l.p.y - k.p.y) * l.d.x) / cruz;
    return k.p.clone().addScaledVector(k.d, t);
  });
}

// Cantos arredondados, já como lista de pontos
function arredondar(pts, r, passos = 12) {
  const saida = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], antes = pts[(i - 1 + pts.length) % pts.length], depois = pts[(i + 1) % pts.length];
    const la = p.distanceTo(antes), lb = p.distanceTo(depois);
    const rr = Math.min(r, la / 2, lb / 2);
    const a = p.clone().lerp(antes, rr / la), b = p.clone().lerp(depois, rr / lb);
    for (let k = 0; k <= passos; k++) {
      const t = k / passos, u = 1 - t;
      saida.push(new THREE.Vector2(u * u * a.x + 2 * u * t * p.x + t * t * b.x, u * u * a.y + 2 * u * t * p.y + t * t * b.y));
    }
  }
  return saida;
}

// Mesmo número de pontos, no mesmo sentido e começando no canto de cima à esquerda:
// assim um contorno pode virar outro ponto a ponto
function reamostrar(pts, n) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  if (area < 0) pts = [...pts].reverse();
  let inicio = 0;
  pts.forEach((p, i) => { if (p.y - p.x > pts[inicio].y - pts[inicio].x) inicio = i; });
  pts = [...pts.slice(inicio), ...pts.slice(0, inicio)];
  const acum = [0];
  for (let i = 1; i <= pts.length; i++) acum.push(acum[i - 1] + pts[i - 1].distanceTo(pts[i % pts.length]));
  const total = acum[pts.length], saida = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const alvo = (k / n) * total;
    while (acum[j + 1] < alvo) j++;
    const t = (alvo - acum[j]) / Math.max(1e-6, acum[j + 1] - acum[j]);
    saida.push(pts[j].clone().lerp(pts[(j + 1) % pts.length], t));
  }
  return saida;
}

export async function iniciarCena({ canvas, base, projetos, tema, reduzir, celular, aoPronto, aoVoo, captura, placaTexto, alvos, semChegada }) {
  if (captura) semChegada = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: Boolean(captura) });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  const luz = new THREE.DirectionalLight(0xe4ecff, 1.1);
  luz.position.set(-1, 1.2, 1.4);
  cena.add(luz);

  // Tudo que inclina com o mouse fica neste grupo
  const palco = new THREE.Group();
  cena.add(palco);

  // Brilho lilás do cursor, injetado no vidro
  const brilhoCursor = { uPonteiro: { value: new THREE.Vector3() }, uGlow: { value: 0 }, uRaio: { value: 300 } };
  function criarMaterialVidro() {
    const m = new THREE.MeshPhysicalMaterial({
      roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.12, specularIntensity: 0.7,
      iridescence: 0.55, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 650],
    });
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, brilhoCursor);
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;\nuniform vec3 uPonteiro;\nuniform float uGlow;\nuniform float uRaio;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float dd = distance(vMundo.xy, uPonteiro.xy) / uRaio;
            totalEmissiveRadiance += vec3(0.42, 0.37, 0.62) * 0.16 * uGlow * exp(-1.6 * dd * dd); }`);
    };
    return m;
  }

  // Capas dos projetos: o mesmo desenho das capas dos cartões em HTML
  const capas = Object.fromEntries(projetos.map((p) => {
    const t = new THREE.CanvasTexture(desenhar(p.textura, 640, 3));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return [p.slug, t];
  }));

  const sorte = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const CELULAS = projetos.length >= 5 ? CELULAS_5 : CELULAS_4;
  const cacos = CELULAS.map(() => {
    const malha = new THREE.Mesh(new THREE.BufferGeometry(), criarMaterialVidro());
    const capa = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    capa.visible = false;
    malha.add(capa);
    palco.add(malha);
    const eixo = new THREE.Vector3(sorte() - 0.5, sorte() - 0.5, (sorte() - 0.5) * 0.4).normalize();
    return {
      malha, capa, eixo,
      centro: new THREE.Vector2(), topo: 0, contorno: null,
      mola: { z: 0, vz: 0, rx: 0, vrx: 0, ry: 0, vry: 0 }, hover: 0,
      giro: 2 + sorte() * 1.6, balanco: (0.08 + sorte() * 0.08) * (sorte() > 0.5 ? 1 : -1), camada: 0, elevar: 420 + sorte() * 380, lado: new THREE.Vector2(sorte() - 0.5, sorte() - 0.5),
      alvo: null,
    };
  });
  const principal = cacos[0];

  // Medidas da página e da placa
  const tela = { W: 1, H: 1, dist: 1, S: 1, retrato: false, placa: { x: 0, y: 0, w: 1, h: 1 } };
  const paraMundo = (px, py) => new THREE.Vector2(px - tela.W / 2, tela.H / 2 - py);
  function medir() {
    const W = captura ? captura.largura : innerWidth, H = captura ? captura.altura : innerHeight;
    const estreito = W < 760;
    const mx = estreito ? 16 : W * 0.055;
    const topo = estreito ? 72 : Math.max(H * 0.085, 84);
    const baixo = estreito ? 16 : H * 0.085;
    tela.W = W; tela.H = H;
    tela.retrato = W / H < 0.8;
    tela.placa = { x: mx, y: topo, w: W - 2 * mx, h: H - topo - baixo };
    tela.S = Math.max(tela.placa.w, tela.placa.h) / 1730;
    tela.dist = H / 2 / Math.tan(graus(15));
  }

  // Pontos dos cortes no instante t, com a deriva lenta e o empurrão do cursor
  const deriva = Object.fromEntries(Object.keys(ANCORAS).map((k) => [k, { fx: sorte() * 6.28, fy: sorte() * 6.28, px: 10 + sorte() * 10, py: 10 + sorte() * 10, ex: 0, ey: 0 }]));
  const ponteiroPlaca = new THREE.Vector2(-9, -9);
  function cortes(t, dt) {
    const pts = {};
    for (const [nome, [x0, y0, mx, my]] of Object.entries(ANCORAS)) {
      const d = deriva[nome];
      let x = x0 + Math.sin((t / d.px) * 6.28 + d.fx) * 0.03 * mx;
      let y = y0 + Math.sin((t / d.py) * 6.28 + d.fy) * 0.05 * my;
      // O caco sob o cursor cresce um pouco: os pontos perto dele se afastam
      const dx = x - ponteiroPlaca.x, dy = y - ponteiroPlaca.y, dd = Math.hypot(dx, dy);
      const forca = dd < 0.6 && dd > 1e-4 ? (1 - dd / 0.6) * 0.05 : 0;
      d.ex = suavizar(d.ex, forca ? (dx / dd) * forca * mx : 0, 6, dt);
      d.ey = suavizar(d.ey, forca ? (dy / dd) * forca * my : 0, 6, dt);
      x += d.ex; y += d.ey;
      // Tela em pé: o desenho é transposto e o caco principal fica em cima
      pts[nome] = tela.retrato ? [y, x] : [x, y];
    }
    return pts;
  }
  const placaParaMundo = ([nx, ny]) => paraMundo(tela.placa.x + nx * tela.placa.w, tela.placa.y + ny * tela.placa.h);

  function contornoDaCelula(pts, i) {
    const S = tela.S;
    const poligono = CELULAS[i].map((n) => placaParaMundo(pts[n]));
    return reamostrar(arredondar(recuar(poligono, 7 * S + CHANFRO * S), 26 * S), PONTOS_CONTORNO);
  }

  // Contorno do cartão de destino (retângulo de cantos redondos)
  function contornoDoCartao(a) {
    const c = paraMundo(a.x + a.w / 2, a.y + a.h / 2);
    // Cartões da frente ficam um pouco mais perto; o tamanho compensa a perspectiva
    const z = (2 - Math.abs(a.d)) * 12;
    const f = (tela.dist - z) / tela.dist;
    // O chanfro cresce para fora: o contorno encolhe o mesmo tanto para o cartão bater com o HTML
    const b = CHANFRO * tela.S;
    const w = (a.w / 2) * f - b, h = (a.h / 2) * f - b;
    const cantos = [new THREE.Vector2(c.x - w, c.y + h), new THREE.Vector2(c.x + w, c.y + h), new THREE.Vector2(c.x + w, c.y - h), new THREE.Vector2(c.x - w, c.y - h)];
    return { pontos: reamostrar(arredondar(cantos, Math.max(1, a.raio * f - b), 16), PONTOS_CONTORNO), z, d: a.d, slug: a.slug };
  }

  function construir(caco, contorno, espessura, comCapa) {
    const S = tela.S;
    const c = new THREE.Vector2();
    contorno.forEach((p) => c.add(p));
    c.divideScalar(contorno.length);
    const local = contorno.map((p) => new THREE.Vector2(p.x - c.x, p.y - c.y));
    const forma = new THREE.Shape(local);
    const geo = new THREE.ExtrudeGeometry(forma, {
      depth: espessura, bevelEnabled: true, bevelThickness: CHANFRO * S, bevelSize: CHANFRO * S, bevelSegments: 6, curveSegments: 1,
    });
    geo.translate(0, 0, -espessura / 2);
    caco.malha.geometry.dispose();
    caco.malha.geometry = geo;
    caco.centro.copy(c);
    caco.topo = espessura / 2 + CHANFRO * S;
    if (comCapa) {
      // Capa por cima, recortada como o "cover" do CSS (altura inteira, meio da largura)
      const g = new THREE.ShapeGeometry(forma);
      g.computeBoundingBox();
      const caixa = g.boundingBox, cx = (caixa.min.x + caixa.max.x) / 2, cy = (caixa.min.y + caixa.max.y) / 2;
      const alt = caixa.max.y - caixa.min.y;
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + (pos.getX(i) - cx) / alt, 0.5 + (pos.getY(i) - cy) / alt);
      caco.capa.geometry.dispose();
      caco.capa.geometry = g;
      caco.capa.position.z = caco.topo + 0.4;
    }
  }

  let pixelRatio = Math.min(devicePixelRatio, celular ? 1.5 : 2);
  function ajustar() {
    medir();
    renderer.setPixelRatio(captura ? 1 : pixelRatio);
    renderer.setSize(tela.W, tela.H, false);
    camera.aspect = tela.W / tela.H;
    camera.position.set(0, 0, tela.dist);
    camera.lookAt(0, 0, 0);
    camera.far = tela.dist * 4;
    camera.updateProjectionMatrix();
    brilhoCursor.uRaio.value = 300 * tela.S;
    recalcularAlvos();
    proximaConstrucao = 0;
  }

  let temaAtual = TEMAS[tema];
  function definirTema(nome) {
    temaAtual = TEMAS[nome];
    renderer.setClearColor(temaAtual.fundo, 1);
    cena.environmentIntensity = temaAtual.ambiente;
    for (const c of cacos) {
      c.malha.material.color.set(temaAtual.vidro);
      c.malha.material.roughness = temaAtual.aspereza;
    }
  }

  // Cursor: inclinação e caco levantado
  const mouse = new THREE.Vector2(0, 0);
  let mouseMexeu = false, mouseDentro = false;
  addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    mouseMexeu = true; mouseDentro = true;
    ponteiroPlaca.set((e.clientX - tela.placa.x) / tela.placa.w, (e.clientY - tela.placa.y) / tela.placa.h);
    if (tela.retrato) ponteiroPlaca.set(ponteiroPlaca.y, ponteiroPlaca.x);
    brilhoCursor.uPonteiro.value.set(e.clientX - tela.W / 2, tela.H / 2 - e.clientY, 0);
  });
  document.documentElement.addEventListener('pointerleave', () => { mouseDentro = false; ponteiroPlaca.set(-9, -9); });

  // Para onde cada caco vai: os cartões do carrossel, da esquerda para a direita
  function recalcularAlvos() {
    if (!alvos) return;
    const destinos = alvos().map(contornoDoCartao).sort((a, b) => a.pontos[0].x - b.pontos[0].x);
    // Ordem pelos cacos na placa (não pelo contorno em voo, que muda no caminho)
    const meio = (c) => (c.contornoPlaca ? c.contornoPlaca.reduce((s, q) => s + q.x, 0) / c.contornoPlaca.length : 0);
    const ordem = cacos.map((c, i) => i).sort((a, b) => meio(cacos[a]) - meio(cacos[b]));
    // Camada de voo: quem pousa mais à frente no carrossel voa mais alto
    cacos.map((c, i) => ({ c, d: Math.abs(destinos[ordem.indexOf(i)]?.d ?? 9) }))
      .sort((a, b) => b.d - a.d)
      .forEach(({ c }, n) => { c.camada = n; });
    ordem.forEach((i, k) => {
      const destino = destinos[k];
      if (!destino) return;
      const c = cacos[i];
      c.alvo = destino;
      c.capa.material.map = capas[destino.slug] || null;
      // O cartão do meio fica mais escuro, como o degradê do cartão em HTML
      c.capa.material.color.setScalar(destino.d === 0 ? 0.72 : 0.9);
      c.capa.material.needsUpdate = true;
    });
  }

  // Texto da placa: o HTML é encaixado sobre o caco principal (homografia em matrix3d)
  const v3 = new THREE.Vector3();
  function encaixarTexto() {
    if (!placaTexto) return;
    const { x, y, w, h } = tela.placa;
    const cantos = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => {
      const m = paraMundo(px, py);
      v3.set(m.x - principal.centro.x, m.y - principal.centro.y, principal.topo + 0.5);
      principal.malha.localToWorld(v3).project(camera);
      return [(v3.x + 1) / 2 * tela.W, (1 - v3.y) / 2 * tela.H];
    });
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = cantos;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    placaTexto.style.width = `${w}px`;
    placaTexto.style.height = `${h}px`;
    placaTexto.style.setProperty('--pw', `${w}px`);
    placaTexto.style.transform = `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
  }

  const raio = new THREE.Raycaster();
  // progresso: a rolagem como está; voo: a rolagem amortecida, que move os cacos.
  // Assim cada giro da roda vira um deslizar contínuo, sem trancos.
  let progresso = 0, voo = 0, primeiraRolagem = true;
  const relogio = new THREE.Clock();
  let ativo = true, chegada = reduzir || semChegada ? 1 : 0;
  let inclinX = 0, inclinY = 0, proximaConstrucao = 0;
  let quadros = 0, tempoQuadros = 0, pronto = false;
  const eixoTmp = new THREE.Quaternion();

  ajustar();
  definirTema(tema);
  if (placaTexto) placaTexto.classList.add('placa-3d');

  function quadro() {
    // Em computador lento o voo usa o tempo real (até 0,1 s), para não ficar para trás
    const dtReal = Math.min(relogio.getDelta(), 0.1);
    const dt = Math.min(dtReal, 0.05);
    const t = relogio.elapsedTime;
    voo = suavizar(voo, progresso, 4.5, dtReal);
    if (Math.abs(voo - progresso) < 0.0005) voo = progresso;
    aoVoo?.(voo);
    const p = voo;
    const S = tela.S;
    chegada = Math.min(1, chegada + dt / 1.1);

    // Inclinação da placa toda, como se o cursor apertasse aquele ponto
    const calmo = (reduzir ? 0 : 1) * (1 - degrau(0, 0.25, p));
    inclinY = suavizar(inclinY, mouseDentro ? mouse.x * graus(5) * calmo : 0, 3.3, dt);
    inclinX = suavizar(inclinX, mouseDentro ? -mouse.y * graus(4) * calmo : 0, 3.3, dt);
    palco.rotation.set(-inclinX, inclinY, 0);
    brilhoCursor.uGlow.value = suavizar(brilhoCursor.uGlow.value, mouseDentro && p < 0.1 ? 1 : 0, 5, dt);

    // Caco sob o cursor
    let sob = null;
    if (mouseMexeu && mouseDentro && p < 0.05 && chegada >= 1) {
      raio.setFromCamera(mouse, camera);
      const acerto = raio.intersectObjects(cacos.map((c) => c.malha), false)[0];
      sob = acerto ? cacos.find((c) => c.malha === acerto.object) : null;
    }

    // Contornos: cacos da placa respirando, ou a caminho dos cartões
    const reconstruir = t >= proximaConstrucao;
    if (reconstruir) proximaConstrucao = t + 1 / 45;
    const pts = reconstruir ? cortes(t * (reduzir ? 0.5 : 1), 1 / 45) : null;
    cacos.forEach((c, i) => {
      const k = reduzir ? 0 : degrau(0.04 + c.camada * 0.02, 0.84 + c.camada * 0.02, p);
      if (reconstruir || (k > 0 && k < 1)) {
        const daPlaca = pts ? contornoDaCelula(pts, i) : c.contornoPlaca;
        if (pts) c.contornoPlaca = daPlaca;
        let contorno = daPlaca;
        if (k > 0 && c.alvo) contorno = daPlaca.map((q, j) => q.clone().lerp(c.alvo.pontos[j], k));
        c.contorno = contorno;
        construir(c, contorno, 13 * S * (1 - k * 0.5), k > 0.3);
      }
      c.capa.visible = k > 0.3;
      c.capa.material.opacity = degrau(0.45, 0.9, k);

      // Mola do caco levantado: sobe para a câmera e a borda perto do cursor afunda
      const m = c.mola, h = c === sob ? 1 : 0;
      c.hover = suavizar(c.hover, h, 8, dt);
      let alvoZ = 0, alvoRx = 0, alvoRy = 0;
      if (h) {
        const centroTela = new THREE.Vector2(c.centro.x / (tela.W / 2), c.centro.y / (tela.H / 2));
        const dx = limitar((mouse.x - centroTela.x) * 2.2, -1, 1), dy = limitar((mouse.y - centroTela.y) * 2.2, -1, 1);
        alvoZ = 50 * S; alvoRy = dx * 0.24; alvoRx = -dy * 0.24;
      }
      m.vz += (170 * (alvoZ - m.z) - 19 * m.vz) * dt; m.z += m.vz * dt;
      m.vrx += (170 * (alvoRx - m.rx) - 19 * m.vrx) * dt; m.rx += m.vrx * dt;
      m.vry += (170 * (alvoRy - m.ry) - 19 * m.vry) * dt; m.ry += m.vry * dt;
      c.malha.material.iridescence = 0.55 + 0.45 * c.hover;
      c.malha.material.envMapIntensity = 1 + 0.9 * c.hover;

      // Voo: na chegada (entra com uma sobra) e na rolagem (sobe, inclina de leve e pousa)
      const atraso = i * 0.05;
      const e = 1 - comSobra(limitar((chegada * 1.1 - atraso) / 0.72, 0, 1));
      const arco = Math.sin(Math.PI * k);
      c.malha.position.set(
        c.centro.x + c.lado.x * 900 * S * e,
        c.centro.y + (c.lado.y * 600 - 300) * S * e,
        // No ar, cada caco voa na sua camada (os da frente mais alto): nenhum atravessa outro
        m.z + c.elevar * S * e + arco * (90 + c.camada * 120) * S + (c.alvo ? c.alvo.z * k : 0),
      );
      c.malha.quaternion.setFromAxisAngle(c.eixo, c.giro * e + c.balanco * arco);
      eixoTmp.setFromEuler(new THREE.Euler(m.rx, m.ry, 0));
      c.malha.quaternion.multiply(eixoTmp);
    });

    palco.updateMatrixWorld(true);
    if (p < 0.3) encaixarTexto();
    renderer.render(cena, camera);

    // Desempenho: se cair abaixo de ~40 fps, reduz a resolução
    if (!captura) {
      quadros++; tempoQuadros += dt;
      if (quadros === 90) {
        // No computador nunca abaixo de 1: abaixo disso as bordas serrilham
        const minimo = celular ? 0.75 : 1;
        if (quadros / tempoQuadros < 40 && pixelRatio > minimo) { pixelRatio = Math.max(minimo, pixelRatio - 0.5); ajustar(); }
        quadros = 0; tempoQuadros = 0;
      }
    }
    if (!pronto) { pronto = true; aoPronto?.(); }
    if (!precisaDesenhar()) ligar(false);
  }

  // Desenha enquanto a entrada está à vista ou os cacos ainda estão a caminho
  const precisaDesenhar = () => !document.hidden && (progresso < 1 || voo < 1);
  function ligar(sim) {
    if (sim === ativo) return;
    ativo = sim;
    renderer.setAnimationLoop(sim ? quadro : null);
    if (sim) relogio.getDelta();
  }
  addEventListener('resize', ajustar);
  renderer.setAnimationLoop(quadro);
  document.addEventListener('visibilitychange', () => ligar(precisaDesenhar()));

  return {
    definirTema,
    definirProgresso(p) {
      progresso = p;
      // Quem chega direto num projeto (já no fim da rolagem) não vê o voo
      if (primeiraRolagem) { voo = p; primeiraRolagem = false; aoVoo?.(voo); }
      recalcularAlvos();
      ligar(precisaDesenhar());
    },
    recalcularAlvos,
    // Desenha um quadro na hora (não depende da aba estar visível) e devolve a imagem
    imagem: () => { quadro(); return canvas.toDataURL('image/jpeg', 0.86); },
  };
}
