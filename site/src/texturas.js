// Desenhos gerados em código para os discos e as capas das pastas.
// Nenhum texto dentro das imagens: todo texto do site é HTML.

function sorteio(semente) {
  let s = semente;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const cache = new Map();

// Camadas São Paulo: quarteirões coloridos por "ano"
function mapa(c, t, r) {
  c.fillStyle = '#1b1f24';
  c.fillRect(0, 0, t, t);
  const rampa = ['#2e4a6b', '#4f7ca8', '#9cc3d5', '#f2d6a2', '#f19a5b', '#d9583b'];
  c.save();
  c.translate(t / 2, t / 2);
  c.rotate(-0.38);
  const passo = t / 15;
  for (let x = -t; x < t; x += passo) {
    for (let y = -t; y < t; y += passo * 0.7) {
      const w = passo * (0.55 + r() * 0.35), h = passo * 0.7 * (0.5 + r() * 0.35);
      const n = Math.min(rampa.length - 1, Math.floor((Math.sin(x * 0.012) + Math.cos(y * 0.015) + 2) / 4 * rampa.length + r() * 1.2));
      c.fillStyle = rampa[n];
      c.globalAlpha = 0.75 + r() * 0.25;
      c.fillRect(x, y, w, h);
    }
  }
  c.restore();
}

// Duas Margens: curvas de nível, rio e mancha de cheia
function cheia(c, t, r) {
  const relevo = c.createLinearGradient(0, 0, t, t);
  relevo.addColorStop(0, '#6f7d5c');
  relevo.addColorStop(1, '#3f4a37');
  c.fillStyle = relevo;
  c.fillRect(0, 0, t, t);
  c.strokeStyle = 'rgba(230, 236, 214, 0.35)';
  c.lineWidth = t / 420;
  for (let k = 1; k < 16; k++) {
    c.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
      const raio = k * t * 0.045 * (1 + 0.12 * Math.sin(a * 3 + k));
      const x = t * 0.7 + Math.cos(a) * raio, y = t * 0.25 + Math.sin(a) * raio;
      a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
  }
  const rio = (largura) => {
    c.beginPath();
    c.moveTo(-10, t * 0.82);
    c.bezierCurveTo(t * 0.3, t * 0.5, t * 0.45, t * 1.0, t * 0.7, t * 0.62);
    c.bezierCurveTo(t * 0.85, t * 0.4, t * 0.95, t * 0.55, t + 10, t * 0.35);
    c.lineWidth = largura;
    c.stroke();
  };
  c.strokeStyle = 'rgba(90, 150, 255, 0.35)';
  rio(t * 0.22);
  c.strokeStyle = 'rgba(90, 150, 255, 0.5)';
  rio(t * 0.12);
  c.strokeStyle = '#2a5fe0';
  rio(t * 0.035);
  c.fillStyle = '#e9e4d6';
  for (let i = 0; i < 260; i++) {
    const x = r() * t, y = r() * t;
    c.fillRect(x, y, t * 0.012, t * 0.009);
  }
}

// Portal de governança: linhagem (colunas de nós ligadas da esquerda para a direita)
function dados(c, t, r) {
  c.fillStyle = '#15181c';
  c.fillRect(0, 0, t, t);
  const colunas = [];
  for (let i = 0; i < 6; i++) {
    const n = 3 + Math.floor(r() * 4);
    colunas.push(Array.from({ length: n }, (_, j) => ({ x: t * (0.1 + i * 0.16), y: t * (0.12 + (j + 0.5) * (0.76 / n)) })));
  }
  c.lineWidth = t / 360;
  c.strokeStyle = 'rgba(200, 214, 235, 0.45)';
  for (let i = 0; i < colunas.length - 1; i++) {
    for (const a of colunas[i]) {
      for (const b of colunas[i + 1]) {
        if (r() > 0.55) continue;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y);
        c.stroke();
      }
    }
  }
  for (const col of colunas) {
    for (const p of col) {
      c.fillStyle = r() > 0.8 ? '#f2f4f7' : '#2b3038';
      c.strokeStyle = '#c8d0db';
      c.beginPath();
      c.roundRect(p.x - t * 0.035, p.y - t * 0.018, t * 0.07, t * 0.036, t * 0.01);
      c.fill();
      c.stroke();
    }
  }
}

// Colink: folhas e pastas empilhadas
function arquivo(c, t, r) {
  c.fillStyle = '#3a4a5e';
  c.fillRect(0, 0, t, t);
  const tons = ['#f2f0ea', '#c9d3df', '#8fa3ba', '#e4e7eb', '#b9764a'];
  for (let i = 0; i < 18; i++) {
    c.save();
    c.translate(t * (0.15 + r() * 0.7), t * (0.15 + r() * 0.7));
    c.rotate((r() - 0.5) * 0.9);
    c.shadowColor = 'rgba(0,0,0,0.18)';
    c.shadowBlur = t * 0.02;
    c.fillStyle = tons[i % tons.length];
    c.fillRect(-t * 0.16, -t * 0.21, t * 0.32, t * 0.42);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(40, 50, 62, 0.22)';
    for (let l = 0; l < 7; l++) c.fillRect(-t * 0.12, -t * 0.15 + l * t * 0.045, t * (0.12 + r() * 0.12), t * 0.012);
    c.restore();
  }
}

// TCC: perspectiva de um corredor de arquitetura
function render(c, t) {
  const ceu = c.createLinearGradient(0, 0, 0, t);
  ceu.addColorStop(0, '#7f93ad');
  ceu.addColorStop(0.5, '#e8d9c4');
  ceu.addColorStop(1, '#4b4f55');
  c.fillStyle = ceu;
  c.fillRect(0, 0, t, t);
  const fx = t * 0.56, fy = t * 0.5;
  c.strokeStyle = 'rgba(30, 36, 44, 0.55)';
  c.lineWidth = t / 300;
  for (let i = -8; i <= 8; i++) {
    c.beginPath();
    c.moveTo(fx, fy);
    c.lineTo(fx + i * t * 0.16, t);
    c.stroke();
  }
  for (let k = 1; k < 9; k++) {
    const d = Math.pow(k / 9, 1.8);
    const y = fy + d * t * 0.5;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(t, y);
    c.stroke();
    const alt = d * t * 0.9, larg = d * t * 0.05;
    c.fillStyle = `rgba(245, 246, 247, ${0.6 + d * 0.4})`;
    c.fillRect(fx - d * t * 0.6 - larg, y - alt, larg, alt);
    c.fillRect(fx + d * t * 0.6, y - alt, larg, alt);
  }
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(fx - t * 0.04, fy - t * 0.2, t * 0.08, t * 0.2);
}

const DESENHOS = { mapa, cheia, dados, arquivo, render };

export function desenhar(tipo, tamanho = 512, semente = 7) {
  const chave = `${tipo}-${tamanho}-${semente}`;
  if (cache.has(chave)) return cache.get(chave);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = tamanho;
  DESENHOS[tipo](canvas.getContext('2d'), tamanho, sorteio(semente * 9301 + tamanho));
  cache.set(chave, canvas);
  return canvas;
}

export function urlDaCapa(tipo, tamanho = 640) {
  return desenhar(tipo, tamanho, 3).toDataURL('image/jpeg', 0.86);
}
