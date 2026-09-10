const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { saveCode, getCode, deleteCode } = require('./verification-store');
const { sendVerificationCode } = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Servir archivos estáticos del frontend ──
const webDir = path.resolve(__dirname, '..', 'web');
app.use(express.static(webDir));

// ── Base de datos en archivo JSON ──
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'usuarios.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadUsers() {
  if (!fs.existsSync(dbFile)) return [];
  return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(dbFile, JSON.stringify(users, null, 2), 'utf-8');
}

// ── Dominios de email permitidos ──
const EMAIL_DOMAINS = ['@etec.um.edu.ar', '@alumno.etec.um.edu.ar'];

// ── Roles permitidos (cursos o no alumno) ──
const ROLES_PERMITIDOS = ['1A', '1B', '2A', '2B', '3I', '3E', '4I', '4E', '5I', '5E', '6I', '6E', 'no-alumno'];

// ── Validar dominio del email ──
function isValidEmail(email) {
  const lower = email.toLowerCase();
  return EMAIL_DOMAINS.some(d => lower.endsWith(d));
}

// ── Rutas de autenticación ──

// POST /api/auth/register - Registrar nuevo usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, motivo } = req.body;

    // Validar campos obligatorios
    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({
        error: 'Todos los campos obligatorios deben ser completados.',
        fields: {
          nombre: !nombre,
          apellido: !apellido,
          email: !email,
          password: !password,
          rol: !rol
        }
      });
    }

    // Validar nombre (mínimo 2 caracteres)
    if (nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }

    // Validar apellido (mínimo 2 caracteres)
    if (apellido.trim().length < 2) {
      return res.status(400).json({ error: 'El apellido debe tener al menos 2 caracteres.' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido.' });
    }

    // Validar dominio del email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'El email debe ser @etec.um.edu.ar o @alumno.etec.um.edu.ar',
        allowedDomains: EMAIL_DOMAINS
      });
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Validar rol (curso o no alumno)
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({
        error: 'El curso o rol seleccionado no es válido.',
        allowedRoles: ROLES_PERMITIDOS
      });
    }

    // Verificar si el email ya está registrado
    const users = loadUsers();
    const existing = users.find(u => u.email === email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'Este email ya está registrado. Si ya tenés cuenta, iniciá sesión.' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      rol,
      motivo: motivo ? motivo.trim() : '',
      estado: 'pendiente',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    res.status(201).json({
      message: 'Solicitud de membresía enviada exitosamente.',
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        rol: newUser.rol,
        estado: newUser.estado
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor. Intentá nuevamente.' });
  }
});

// POST /api/auth/send-code - Enviar código de verificación al registrarse
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    // Validar campos obligatorios
    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({
        error: 'Todos los campos obligatorios deben ser completados.'
      });
    }

    // Validar nombre (mínimo 2 caracteres)
    if (nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    }

    // Validar apellido (mínimo 2 caracteres)
    if (apellido.trim().length < 2) {
      return res.status(400).json({ error: 'El apellido debe tener al menos 2 caracteres.' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido.' });
    }

    // Validar dominio del email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'El email debe ser @etec.um.edu.ar o @alumno.etec.um.edu.ar'
      });
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // Validar rol
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({ error: 'El curso o rol seleccionado no es válido.' });
    }

    // Verificar si el email ya está registrado
    const users = loadUsers();
    const existing = users.find(u => u.email === email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'Este email ya está registrado. Si ya tenés cuenta, iniciá sesión.' });
    }

    // Hashear contraseña (se guarda temporalmente con el código)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Preparar datos del usuario
    const userData = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      rol,
      estado: 'activo'
    };

    // Generar código y guardarlo
    const code = saveCode(email, userData);

    // Enviar email
    await sendVerificationCode(email, code, nombre.trim());

    res.status(200).json({
      message: 'Código de verificación enviado a ' + email,
      email: email.toLowerCase().trim()
    });

  } catch (error) {
    console.error('Error al enviar código:', error);
    res.status(500).json({ error: 'Error al enviar el código de verificación. Intentá nuevamente.' });
  }
});

// POST /api/auth/verify-code - Verificar código y crear cuenta
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'El email y el código son obligatorios.' });
    }

    // Buscar el código
    const entry = getCode(email, code);

    if (!entry) {
      return res.status(400).json({ error: 'Código incorrecto o expirado. Solicitá uno nuevo.' });
    }

    // Crear el usuario
    const users = loadUsers();
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      ...entry.userData,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // Eliminar el código usado
    deleteCode(email);

    res.status(201).json({
      message: 'Cuenta creada exitosamente.',
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        rol: newUser.rol,
        estado: newUser.estado
      }
    });

  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ error: 'Error al verificar el código. Intentá nuevamente.' });
  }
});

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    // Buscar usuario
    const users = loadUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Respuesta (sin incluir la contraseña)
    res.json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        estado: user.estado
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor. Intentá nuevamente.' });
  }
});

// GET /api/roles - Obtener lista de cursos/roles permitidos
app.get('/api/roles', (req, res) => {
  res.json({ roles: ROLES_PERMITIDOS });
});

// GET /api/usuarios - Listar usuarios (solo para admin, sin contraseñas)
app.get('/api/usuarios', (req, res) => {
  const users = loadUsers();
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json({ usuarios: safeUsers });
});

// ── Iniciar servidor ──
app.listen(PORT, () => {
  console.log(`✅ Backend InnovaTec corriendo en http://localhost:${PORT}`);
  console.log(`   Base de datos: ${dbFile}`);
});
