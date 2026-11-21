// Read named, public package documents from the installed Electron archive.
// This does not execute DSH or read its user profile/configuration.
const fs = require('node:fs');
const path = require('node:path');
const archive = 'D:/Deepseek Harnes/resources/app.asar';
const inputs = process.argv.slice(2);
const pattern = inputs[0]?.startsWith('--match=') ? new RegExp(inputs.shift().slice(8)) : null;
const fd = fs.openSync(archive, 'r');
try {
  const prefix = Buffer.alloc(16);
  fs.readSync(fd, prefix, 0, prefix.length, 0);
  const header = Buffer.alloc(prefix.readUInt32LE(12));
  fs.readSync(fd, header, 0, header.length, 16);
  const tree = JSON.parse(header.toString('utf8'));
  for (const relative of inputs) {
    if (!/^@deepseek-ai\/[\w-]+\/(?:README\.md|package\.json|lib\/[\w./-]+\.js)$/.test(relative)) {
      throw new Error('Only explicit public package docs/source paths are accepted');
    }
    const internal = 'dsh/node_modules/' + relative;
    let node = tree;
    for (const part of internal.split('/')) node = node.files?.[part];
    if (!node || node.files) throw new Error('Missing archive file: ' + internal);
    let content;
    if (node.unpacked) content = fs.readFileSync(path.join(archive + '.unpacked', internal), 'utf8');
    else {
      const buffer = Buffer.alloc(node.size);
      fs.readSync(fd, buffer, 0, buffer.length, 8 + prefix.readUInt32LE(4) + Number(node.offset));
      content = buffer.toString('utf8');
    }
    if (pattern) {
      const lines = content.split('\n');
      const keep = new Set();
      lines.forEach((line, index) => { if (pattern.test(line)) for (let i = Math.max(0,index-2); i <= Math.min(lines.length-1,index+4); i++) keep.add(i); });
      process.stdout.write(JSON.stringify({ source: internal, excerpts: [...keep].map(i => `${i+1}: ${lines[i]}`) }) + '\n');
    } else process.stdout.write(JSON.stringify({ source: internal, content }) + '\n');
  }
} finally { fs.closeSync(fd); }
