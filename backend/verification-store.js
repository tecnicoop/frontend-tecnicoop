// ════════════════════════════════════════════════════════════════════════
//  verification-store.js
//  Almacén temporal de códigos de verificación para el registro.
//  Los códigos se guardan en un archivo JSON y expiran a los 10 minutos.
// ════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CODE_EXPIRY_MINUTES = 10;
const codesFile = path.join(__dirname, 'data', 'verification-codes.json');

// ── Leer códigos del archivo ──
function loadCodes() {
  if (!fs.existsSync(codesFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(codesFile, 'utf-8'));
  } catch {
    return [];
  }
}

// ── Guardar códigos en el archivo ──
function saveCodes(codes) {
  const dir = path.dirname(codesFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2), 'utf-8');
}

// ── Limpiar códigos expirados ──
function cleanExpired(codes) {
  const now = Date.now();
  return codes.filter(c => new Date(c.expiresAt).getTime() > now);
}

// ── Generar código de 6 dígitos ──
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Guardar un código de verificación para un email ──
function saveCode(email, userData) {
  let codes = loadCodes();
  codes = cleanExpired(codes);

  // Eliminar código anterior del mismo email
  codes = codes.filter(c => c.email !== email.toLowerCase().trim());

  const code = generateCode();
  const entry = {
    email: email.toLowerCase().trim(),
    code,
    userData,
    expiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  codes.push(entry);
  saveCodes(codes);

  return code;
}

// ── Obtener y verificar un código ──
function getCode(email, code) {
  let codes = loadCodes();
  codes = cleanExpired(codes);
  saveCodes(codes); // guardamos limpiando expirados

  const entry = codes.find(
    c => c.email === email.toLowerCase().trim() && c.code === code
  );

  return entry || null;
}

// ── Eliminar un código (tras usarlo o reenviarlo) ──
function deleteCode(email) {
  let codes = loadCodes();
  codes = codes.filter(c => c.email !== email.toLowerCase().trim());
  saveCodes(codes);
}

module.exports = { saveCode, getCode, deleteCode };
