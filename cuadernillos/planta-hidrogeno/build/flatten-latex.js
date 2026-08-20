const fs = require('fs');
const path = require('path');

const sourceArg = process.argv[2] || 'planta-hidrogeno.tex';
const outputArg = process.argv[3] || 'build/planta-hidrogeno-flat.tex';

const source = path.resolve(process.cwd(), sourceArg);
const output = path.resolve(process.cwd(), outputArg);

function resolveInputPath(baseFile, relPath) {
  const candidates = [
    relPath,
    `${relPath}.tex`,
    path.join(path.dirname(baseFile), relPath),
    path.join(path.dirname(baseFile), `${relPath}.tex`),
    path.resolve(path.dirname(baseFile), relPath),
    path.resolve(path.dirname(baseFile), `${relPath}.tex`)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }

  return null;
}

function expandInputs(filePath, stack = []) {
  const resolved = path.resolve(filePath);
  if (stack.includes(resolved)) {
    throw new Error(`Ciclo de inclusiones detectado: ${stack.concat(resolved).join(' -> ')}`);
  }

  const content = fs.readFileSync(resolved, 'utf8');
  const expanded = content.replace(/\\input\s*\{([^}]+)\}/g, (match, rel) => {
    const includePath = resolveInputPath(resolved, rel.trim());
    if (!includePath) {
      throw new Error(`No se encontró el archivo incluido: ${rel} (desde ${resolved})`);
    }
    return expandInputs(includePath, stack.concat(resolved));
  });

  return expanded;
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const flattened = expandInputs(source);
fs.writeFileSync(output, flattened, 'utf8');
console.log(`Archivo aplanado generado en: ${output}`);
