import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { SITE, PROJETOS } from './src/dados.js';

// Sem domínio próprio o site fica em /portfolio/ (Fase 6). Para testar na raiz: BASE=/ npm run build
const base = process.env.BASE ?? '/portfolio/';
const urlSite = SITE.url;

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Gera trabalhos/<slug>/index.html com título e prévia próprios de cada projeto
function paginasDosProjetos() {
  let saida = 'dist';
  return {
    name: 'paginas-dos-projetos',
    apply: 'build',
    configResolved(c) { saida = c.build.outDir; },
    closeBundle() {
      const modelo = fs.readFileSync(path.join(saida, 'index.html'), 'utf8');
      for (const p of PROJETOS) {
        const c = p.en;
        const titulo = escapar(`${c.titulo} · ${SITE.nome}`);
        const descricao = escapar(c.resumo);
        const url = `${urlSite}trabalhos/${p.slug}/`;
        const html = modelo
          .replace(/<title>.*?<\/title>/, `<title>${titulo}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${descricao}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${titulo}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${descricao}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
          .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`);
        const pasta = path.join(saida, 'trabalhos', p.slug);
        fs.mkdirSync(pasta, { recursive: true });
        fs.writeFileSync(path.join(pasta, 'index.html'), html);
      }
      // Página 404 do GitHub Pages: mesma página inicial
      fs.copyFileSync(path.join(saida, 'index.html'), path.join(saida, '404.html'));
    },
  };
}

// Só no desenvolvimento: recebe a imagem de capa tirada da cena e grava em public/
function gravarCapa() {
  return {
    name: 'gravar-capa',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capa', (req, res) => {
        let corpo = '';
        req.on('data', (d) => { corpo += d; });
        req.on('end', () => {
          const { nome, dados } = JSON.parse(corpo);
          // capa-*: imagens de capa do site; teste-*: quadros para conferência, fora do build
          if (!/^(capa-(claro|escuro)|teste-[a-z0-9-]+)$/.test(nome)) { res.statusCode = 400; res.end(); return; }
          const pasta = nome.startsWith('teste-') ? path.resolve('.prints') : path.resolve('public');
          fs.mkdirSync(pasta, { recursive: true });
          fs.writeFileSync(path.join(pasta, `${nome}.jpg`), Buffer.from(dados.split(',')[1], 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [paginasDosProjetos(), gravarCapa()],
  server: { port: 5173 },
  preview: { port: 4173 },
});
