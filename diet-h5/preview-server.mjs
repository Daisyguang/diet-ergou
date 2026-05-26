import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, 'frontend');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml' };

const server = http.createServer((req,res)=>{
  const url = req.url.split('?')[0];
  let file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.statusCode=403; return res.end('forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(root, 'index.html');
    fs.readFile(file, (e, buf)=>{
      if (e) { res.statusCode=500; return res.end('error'); }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(buf);
    });
  });
});

server.listen(3000, '0.0.0.0', () => console.log('Preview server: http://localhost:3000'));
