# 🚀 Tecnicoop Frontend - Integración Gemini AI

Página de Registro (Sign Up) integrada con **Google Gemini AI** para validación inteligente de usuarios.

---

## 📋 Tabla de Contenidos

1. [Instalación](#instalación)
2. [Configuración de API Gemini](#configuración-de-api-gemini)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Archivos Modificados](#archivos-modificados)
5. [Funcionamiento](#funcionamiento)
6. [Consideraciones de Seguridad](#consideraciones-de-seguridad)

---

## 🔧 Instalación

### Requisitos
- Node.js >= 18.0.0
- npm o yarn

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tecnicoop/frontend-tecnicoop.git
   cd frontend-tecnicoop
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Copiar archivo de configuración**
   ```bash
   cp .env.example .env
   ```

4. **Configurar API Key de Gemini** (ver sección siguiente)

5. **Ejecutar servidor de desarrollo**
   ```bash
   npm run dev
   # Accede a http://localhost:8000
   ```

---

## 🔐 Configuración de API Gemini

### Obtener tu API Key

1. Ve a [Google AI Studio](https://ai.google.dev/)
2. Haz clic en **"Get API Key"**
3. Selecciona o crea un proyecto
4. Copia tu **API Key**

### Configurar en tu `.env`

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
VITE_APP_NAME=Tecnicoop
VITE_API_BASE_URL=http://localhost:3000/api
```

⚠️ **IMPORTANTE**: 
- **NUNCA** hagas commit de `.env` con tu API Key real
- El archivo `.env` está en `.gitignore` por seguridad
- En producción, configura las variables en tu plataforma de hosting

---

## 📁 Estructura del Proyecto

```
frontend-tecnicoop/
├── web/
│   ├── index.html              # Página principal
│   ├── login.html              # Página de login
│   ├── signup.html             # ✨ Página de registro con Gemini
│   ├── signup.css              # Estilos del registro
│   ├── gemini-service.js       # 🆕 Servicio de Gemini
│   ├── login.css               # Estilos del login
│   ├── templatemo-622-clearwave.css
│   ├── templatemo-622-clearwave.js
│   ├── chatbot-widget.css
│   ├── chatbot-widget.js
│   ├── timer.html
│   └── images/
├── package.json                # 🆕 Dependencias
├── .env                        # 🆕 Variables de entorno (local)
├── .env.example                # 🆕 Template de configuración
├── .gitignore                  # 🆕 Archivos ignorados por git
└── README.md
```

---

## 📝 Archivos Modificados

### 1. **`web/signup.html`** ✨ CREADO
Página de Registro con integración de Gemini.

**Cambios principales:**
- ✅ Formulario con campos: nombre, email, password, confirmación
- ✅ Validación en tiempo real con Gemini AI
- ✅ Mensajes dinámicos de feedback
- ✅ Integración con `gemini-service.js`
- ✅ Genera mensaje de bienvenida personalizado

**Ejemplo de uso:**
```html
<script src="gemini-service.js"></script>
<script>
  const geminiService = new GeminiService(apiKey);
  validationResult = await geminiService.validateSignupData(userData);
</script>
```

---

### 2. **`web/signup.css`** ✨ CREADO
Estilos consistentes con `login.css`.

**Mejoras agregadas:**
- ✅ Estilos de validación (success/error)
- ✅ Mensajes de feedback con animaciones
- ✅ Indicadores visuales de campos
- ✅ Responsive design (mobile + desktop)

---

### 3. **`web/gemini-service.js`** 🆕 CREADO
Servicio JavaScript para conectar con Google Gemini API.

**Funciones principales:**
```javascript
// Validar datos del usuario
validateSignupData(userData) → Promise

// Generar mensaje de bienvenida
generateWelcomeMessage(userName) → Promise
```

**Ejemplo:**
```javascript
const gemini = new GeminiService('tu-api-key');
const result = await gemini.validateSignupData({
  name: 'Juan Pérez',
  email: 'juan@ejemplo.com'
});
// result = { isValid: true, suggestions: [...], issues: [...] }
```

---

### 4. **`web/login.html`** 🔗 VINCULADO
```html
<!-- Línea 40: Link a Signup -->
<div class="login-footer">
  ¿No tienes cuenta? <a href="signup.html">Crear una</a>
</div>
```

---

### 5. **`web/index.html`** 🔗 VINCULADO
```html
<!-- Línea 23: Menú móvil -->
<a href="signup.html" class="mobile-cta btn-primary">Comenzar gratis</a>

<!-- Línea 38-39: Navbar -->
<a href="login.html" class="btn-ghost">Ingresar</a>
<a href="signup.html" class="btn-primary">Comenzar gratis</a>

<!-- Línea 63: Hero section -->
<a href="signup.html" class="btn-primary-lg">Empezar gratis</a>

<!-- Líneas 444, 465, 657: CTAs de Pricing y Final -->
<a href="signup.html" class="pricing-cta">Comenzar gratis</a>
```

---

### 6. **`package.json`** 🆕 CREADO
Configuración de dependencias.

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.11.0"
  }
}
```

---

### 7. **`.env` y `.env.example`** 🆕 CREADOS
Variables de entorno para configuración segura.

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
VITE_APP_NAME=Tecnicoop
VITE_API_BASE_URL=http://localhost:3000/api
```

---

### 8. **`.gitignore`** 🆕 CREADO
Previene hacer commit de archivos sensibles.

```
node_modules/
.env
.env.local
.DS_Store
```

---

## 🎯 Funcionamiento

### Flujo de Registro

```
┌─────────────────────────────────────────┐
│  Usuario ingresa en Signup              │
├─────────────────────────────────────────┤
│  1. Completa nombre y email             │
│     ↓                                   │
│  2. Sistema valida con Gemini AI        │
│     (1.5s después de dejar el campo)    │
│     ↓                                   │
│  3. Muestra feedback inteligente        │
│     • Sugerencias ✓                     │
│     • Errores ⚠                         │
│     ↓                                   │
│  4. Usuario completa password           │
│     ↓                                   │
│  5. Envía formulario                    │
│     ↓                                   │
│  6. Gemini genera mensaje personalizado │
│     "¡Bienvenido Juan! Tu cuenta..."    │
│     ↓                                   │
│  7. Redirige a Login después de 3s      │
└─────────────────────────────────────────┘
```

### Validación Inteligente

Gemini valida:
- ✅ Nombre válido (3+ caracteres)
- ✅ Email en formato correcto
- ✅ Ausencia de patrones sospechosos
- ✅ Proporciona sugerencias personalizadas

### Fallback (sin API Key)

Si la API Key no está configurada:
- ✅ Usa validación local (regex, longitud)
- ✅ Funciona sin Gemini
- ✅ Usuario puede registrarse normalmente

---

## 🔒 Consideraciones de Seguridad

### ⚠️ Estado Actual (DESARROLLO)
- La API Key está en `gemini-service.js` (solo para demostración)
- Aceptable **SOLO** para desarrollo local

### ✅ Para PRODUCCIÓN

**Opción 1: Backend Node.js (RECOMENDADO)**
```javascript
// backend/routes/validate.js
app.post('/api/validate-signup', async (req, res) => {
  const gemini = new GeminiService(process.env.GEMINI_API_KEY);
  const result = await gemini.validateSignupData(req.body);
  res.json(result);
});
```

**Opción 2: Netlify Functions o Vercel Serverless**
```javascript
// functions/validate-signup.js
const GeminiService = require('./gemini-service');

exports.handler = async (event) => {
  const gemini = new GeminiService(process.env.GEMINI_API_KEY);
  const result = await gemini.validateSignupData(JSON.parse(event.body));
  return { statusCode: 200, body: JSON.stringify(result) };
};
```

**Opción 3: Variables de Entorno en Hosting**
- Netlify: `Settings → Build & Deploy → Environment`
- Vercel: `Settings → Environment Variables`
- GitHub Pages: No soporta variables (usar Opción 1 o 2)

---

## 🚀 Deploy

### Netlify
```bash
# Conectar repositorio
# Variables de entorno: Settings → Environment → Add
VITE_GEMINI_API_KEY=tu_api_key_real

# Build command: npm run build (si tienes bundler)
# Publish directory: web/
```

### Vercel
```bash
# Conectar repositorio
# Agregar variable: Settings → Environment Variables
VITE_GEMINI_API_KEY=tu_api_key_real
```

### GitHub Pages
```bash
# Solo archivos estáticos (sin procesamiento de env vars)
# Opción: Usar Netlify Functions para validación con Gemini
```

---

## 📚 Referencias

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [SDK Generative AI](https://github.com/google/generative-ai-js)
- [Variables de Entorno](https://www.freecodecamp.org/news/how-to-use-environment-variables-to-keep-your-api-keys-secret/)

---

## ✨ Características Agregadas

| Característica | Estado | Detalles |
|---|---|---|
| Página Sign Up | ✅ | Totalmente funcional con Gemini |
| Validación Real-time | ✅ | Con debounce de 1.5s |
| Mensajes Personalizados | ✅ | Generados por Gemini |
| Fallback Local | ✅ | Si falla API o no está configurada |
| Estilos Responsivos | ✅ | Mobile + Desktop |
| Seguridad | ⚠️ | Config para producción incluida |
| Documentación | ✅ | Instrucciones completas |

---

## 🤝 Contribuir

Para contribuir:
1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-caracteristica`
3. Commit: `git commit -m 'Agrega nueva característica'`
4. Push: `git push origin feature/nueva-caracteristica`
5. Pull Request

---

## 📄 Licencia

MIT © 2026 Tecnicoop

---

**¿Preguntas?** Revisa el código comentado en `gemini-service.js` y `web/signup.html`
