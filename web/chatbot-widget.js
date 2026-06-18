/* ── CHATBOT WIDGET ──
   Asistente virtual en español para pedidos de impresión 3D
   ============================================================ */

const CHATBOT_CONFIG = {
  // ─── URL del backend para registrar pedidos ───
  // Cambiá esta URL por la de tu servidor.
  apiUrl: '/api/pedidos',

  // ─── Nombre del asistente ───
  botName: 'Asistente Tecnicoop',

  // ─── Mensaje de bienvenida ───
  welcomeMessage: '¡Hola! Soy el asistente virtual de Tecnicoop. 🤖\n\nEstoy acá para ayudarte a **solicitar una impresión 3D** o responder tus consultas.',
};

/* ═══════════════════════════════════════════════
   ESTADOS DE LA CONVERSACIÓN
   ═══════════════════════════════════════════════ */
const State = {
  MENU:            'menu',
  PART_TYPE:       'part_type',
  HAS_FILE:        'has_file',
  MATERIAL:        'material',
  DIMENSIONS:      'dimensions',
  QUANTITY:        'quantity',
  CONTACT_NAME:    'contact_name',
  CONTACT_INFO:    'contact_info',
  CONFIRM:         'confirm',
  SUBMITTING:      'submitting',
  SUCCESS:         'success',
  STATUS:          'status',
  OPERATOR:        'operator',
};

/* ═══════════════════════════════════════════════
   DATOS DEL PEDIDO
   ═══════════════════════════════════════════════ */
const orderData = {};

/* ═══════════════════════════════════════════════
   DOM REFS
   ═══════════════════════════════════════════════ */
let fab, panel, messages, input, sendBtn;

function initDOM() {
  fab = document.getElementById('botFab');
  panel = document.getElementById('botPanel');
  messages = document.getElementById('botMessages');
  input = document.getElementById('botInput');
  sendBtn = document.getElementById('botSend');

  fab.addEventListener('click', togglePanel);
  document.getElementById('botClose').addEventListener('click', closePanel);
  sendBtn.addEventListener('click', handleUserInput);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  });
}

/* ═══════════════════════════════════════════════
   TOGGLE PANEL
   ═══════════════════════════════════════════════ */
let isOpen = false;

function togglePanel() {
  isOpen ? closePanel() : openPanel();
}

function openPanel() {
  isOpen = true;
  fab.classList.add('open');
  panel.classList.add('open');
  setTimeout(() => input.focus(), 400);
}

function closePanel() {
  isOpen = false;
  fab.classList.remove('open');
  panel.classList.remove('open');
}

/* ═══════════════════════════════════════════════
   MENSAJES
   ═══════════════════════════════════════════════ */

function addBotMessage(text) {
  const div = document.createElement('div');
  div.className = 'bot-msg bot';
  div.innerHTML = `
    <div class="bot-msg-avatar">TC</div>
    <div class="bot-msg-bubble">${formatMessage(text)}</div>
  `;
  messages.appendChild(div);
  scrollDown();
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'bot-msg user';
  const initial = text.charAt(0).toUpperCase();
  div.innerHTML = `
    <div class="bot-msg-avatar">${initial}</div>
    <div class="bot-msg-bubble">${escapeHtml(text)}</div>
  `;
  messages.appendChild(div);
  scrollDown();
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'bot-msg system';
  div.innerHTML = `<div class="bot-msg-bubble">${escapeHtml(text)}</div>`;
  messages.appendChild(div);
  scrollDown();
}

function addOptions(options) {
  const wrap = document.createElement('div');
  wrap.className = 'bot-options';
  options.forEach(({ label, value }) => {
    const btn = document.createElement('button');
    btn.className = 'bot-opt-btn';
    btn.textContent = label;
    btn.dataset.value = value;
    btn.addEventListener('click', () => {
      removeOptions();
      addUserMessage(label);
      advance(value);
    });
    wrap.appendChild(btn);
  });
  messages.appendChild(wrap);
  scrollDown();
}

function removeOptions() {
  const existing = messages.querySelector('.bot-options');
  if (existing) existing.remove();
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'bot-typing';
  div.id = 'botTyping';
  div.innerHTML = '<span></span><span></span><span></span>';
  messages.appendChild(div);
  scrollDown();
}

function hideTyping() {
  const el = document.getElementById('botTyping');
  if (el) el.remove();
}

function scrollDown() {
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

/* ═══════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════ */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════════════
   LÓGICA DE CONVERSACIÓN
   ═══════════════════════════════════════════════ */

let currentState = null;

function startConversation() {
  // Cleanup
  messages.innerHTML = '';
  Object.keys(orderData).forEach(k => delete orderData[k]);
  currentState = null;

  addBotMessage(CHATBOT_CONFIG.welcomeMessage);

  setTimeout(() => {
    showMenu();
  }, 500);
}

function showMenu() {
  currentState = State.MENU;
  addBotMessage('¿En qué puedo ayudarte?');
  addOptions([
    { label: '🖨️  Solicitar impresión 3D', value: 'order' },
    { label: '❓  Consultar estado de pedido', value: 'status' },
    { label: '💬  Hablar con un operador', value: 'operator' },
  ]);
}

/* ─── FLUJO DE PEDIDO ─── */

function startOrder() {
  currentState = State.PART_TYPE;
  addBotMessage('¡Perfecto! Vamos a registrar tu pedido de impresión 3D.\n\nPrimero, ¿**qué tipo de pieza** querés imprimir?\n\n*Ejemplos: prototipo, figura decorativa, pieza mecánica, soporte, llavero, etc.*');
}

function askFile() {
  currentState = State.HAS_FILE;
  addBotMessage('¿**Tenés el archivo STL/OBJ** listo o necesitás que te ayudemos con el diseño?');
  addOptions([
    { label: '✅  Tengo el archivo listo', value: 'yes' },
    { label: '🔧  Necesito ayuda con el diseño', value: 'no' },
  ]);
}

function askMaterial() {
  currentState = State.MATERIAL;
  addBotMessage('¿**Qué material** preferís para la impresión?');
  addOptions([
    { label: 'PLA — ideal para prototipos', value: 'PLA' },
    { label: 'ABS — mayor resistencia', value: 'ABS' },
    { label: 'PETG — resistente y flexible', value: 'PETG' },
    { label: 'Resina — alta precisión', value: 'Resina' },
    { label: 'No estoy seguro', value: 'no_se' },
  ]);
}

function askDimensions() {
  currentState = State.DIMENSIONS;
  addBotMessage('¿**Cuáles son las dimensiones aproximadas** de la pieza?\n\nDecime **largo × ancho × alto** en milímetros.\n\n*Ej: 50 × 30 × 20 mm*');
}

function askQuantity() {
  currentState = State.QUANTITY;
  addBotMessage('¿**Qué cantidad** necesitás imprimir?');
}

function askContactName() {
  currentState = State.CONTACT_NAME;
  addBotMessage('Ya casi terminamos 😊\n\nDecime tu **nombre y apellido** para registrar el pedido.');
}

function askContactInfo() {
  currentState = State.CONTACT_INFO;
  addBotMessage('Por último, dejame un **medio de contacto** (teléfono o email) para confirmarte el presupuesto.');
}

function showConfirm() {
  currentState = State.CONFIRM;

  const fileStatus = orderData.hasFile === 'yes' ? '✅ Tengo archivo' : '🔧 Necesito diseño';
  const material = orderData.material === 'no_se' ? 'A definir' : orderData.material;

  const summary = `
**Resumen de tu pedido**
━━━━━━━━━━━━━━━━━━
🔹 **Pieza:** ${escapeHtml(orderData.partType || '—')}
🔹 **Archivo:** ${fileStatus}
🔹 **Material:** ${material}
🔹 **Dimensiones:** ${escapeHtml(orderData.dimensions || '—')}
🔹 **Cantidad:** ${escapeHtml(orderData.quantity || '—')}
🔹 **Nombre:** ${escapeHtml(orderData.contactName || '—')}
🔹 **Contacto:** ${escapeHtml(orderData.contactInfo || '—')}
━━━━━━━━━━━━━━━━━━
`;

  addBotMessage(summary + '\n¿**Confirmás** el envío del pedido?');
  addOptions([
    { label: '✅  Confirmar pedido', value: 'confirm' },
    { label: '✏️  Corregir datos', value: 'fix' },
    { label: '❌  Cancelar', value: 'cancel' },
  ]);
}

async function submitOrder() {
  currentState = State.SUBMITTING;
  addBotMessage('⏳ Estamos registrando tu pedido...');

  const payload = {
    tipo_pieza:  orderData.partType,
    tiene_archivo: orderData.hasFile === 'yes',
    material:    orderData.material === 'no_se' ? null : orderData.material,
    dimensiones: orderData.dimensions,
    cantidad:    parseInt(orderData.quantity, 10) || 1,
    nombre:      orderData.contactName,
    contacto:    orderData.contactInfo,
    fecha:       new Date().toISOString(),
  };

  try {
    const res = await fetch(CHATBOT_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    currentState = State.SUCCESS;
    addBotMessage(`✅ **¡Pedido registrado con éxito!**\n\nTu número de pedido es: **${data.numero || data.id || '—'}**\n\nTe vamos a contactar pronto con el presupuesto. ¿Necesitás algo más?`);
    addOptions([
      { label: '🔄  Nuevo pedido', value: 'order' },
      { label: '❓  Consultar estado', value: 'status' },
      { label: '💬  Hablar con operador', value: 'operator' },
      { label: '🚪  Salir', value: 'exit' },
    ]);

  } catch (err) {
    console.error('Error al enviar pedido:', err);
    // ─── Fallback: mostrar datos que se enviarían ───
    addSystemMessage('⚠️ No se pudo conectar con el servidor. Pero no te preocupes, estos son los datos que se enviarían:');
    addBotMessage(`
**Datos del pedido** (simulados):
${Object.entries(payload).map(([k, v]) => `• **${k}:** ${v ?? '—'}`).join('\n')}

💡 *Configurá la URL del backend en la variable \`CHATBOT_CONFIG.apiUrl\`.*
    `);
    addBotMessage('¿Querés intentar de nuevo más tarde o preferís hablar con un operador?');
    addOptions([
      { label: '💬  Hablar con operador', value: 'operator' },
      { label: '🔄  Reintentar', value: 'order' },
      { label: '🚪  Salir', value: 'exit' },
    ]);
  }
}

/* ─── OTROS FLUJOS ─── */

function askStatus() {
  currentState = State.STATUS;
  addBotMessage('Para consultar el estado de tu pedido, necesito el **número de pedido**.\n\nEscribilo acá o decime si no lo tenés.');
}

function talkToOperator() {
  currentState = State.OPERATOR;
  addBotMessage('📞 **Derivando a un operador...**\n\nEn breve un miembro de nuestro equipo se va a comunicar con vos al contacto que nos dejaste.\n\nMientras tanto, si querés dejarnos un mensaje o consulta, escribilo y lo vamos a recibir.');
}

/* ═══════════════════════════════════════════════
   PROCESAR INPUT DEL USUARIO
   ═══════════════════════════════════════════════ */

function handleUserInput() {
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  addUserMessage(text);
  advance(text);
}

function advance(input) {
  removeOptions();

  switch (currentState) {

    /* ─── MENÚ PRINCIPAL ─── */
    case State.MENU: {
      const val = typeof input === 'string' ? input.toLowerCase() : '';
      if (val === 'order' || val === '1' || val.includes('imprimir') || val.includes('pedido') || val.includes('solicitar') || val.includes('🖨')) {
        startOrder();
      } else if (val === 'status' || val === '2' || val.includes('estado') || val.includes('consulta')) {
        askStatus();
      } else if (val === 'operator' || val === '3' || val.includes('operador') || val.includes('humano') || val.includes('persona') || val.includes('💬')) {
        talkToOperator();
      } else {
        addBotMessage('No entendí esa opción. Por favor elegí una de las siguientes:');
        showMenu();
      }
      break;
    }

    /* ─── TIPO DE PIEZA ─── */
    case State.PART_TYPE: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val) {
        orderData.partType = val;
        askFile();
      } else {
        addBotMessage('Por favor decime qué tipo de pieza querés imprimir.');
        currentState = State.PART_TYPE;
      }
      break;
    }

    /* ─── TIENE ARCHIVO ─── */
    case State.HAS_FILE: {
      const val = typeof input === 'string' ? input.toLowerCase() : '';
      if (val === 'yes' || val === '1' || val.includes('tengo') || val.includes('sí') || val.includes('si') || val.includes('✅')) {
        orderData.hasFile = 'yes';
      } else {
        orderData.hasFile = 'no';
      }
      askMaterial();
      break;
    }

    /* ─── MATERIAL ─── */
    case State.MATERIAL: {
      const val = typeof input === 'string' ? input.toLowerCase() : '';
      if (val === 'pla' || val === '1' || val.includes('pla')) {
        orderData.material = 'PLA';
      } else if (val === 'abs' || val === '2' || val.includes('abs')) {
        orderData.material = 'ABS';
      } else if (val === 'petg' || val === '3' || val.includes('petg')) {
        orderData.material = 'PETG';
      } else if (val === 'resina' || val === '4' || val.includes('resina')) {
        orderData.material = 'Resina';
      } else {
        orderData.material = 'no_se';
      }
      askDimensions();
      break;
    }

    /* ─── DIMENSIONES ─── */
    case State.DIMENSIONS: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val) {
        orderData.dimensions = val;
        askQuantity();
      } else {
        addBotMessage('Por favor indicá las dimensiones aproximadas de la pieza (ej: 50 × 30 × 20 mm).');
        currentState = State.DIMENSIONS;
      }
      break;
    }

    /* ─── CANTIDAD ─── */
    case State.QUANTITY: {
      const val = typeof input === 'string' ? input.trim() : '';
      const num = parseInt(val, 10);
      if (val && !isNaN(num) && num > 0) {
        orderData.quantity = val;
        askContactName();
      } else {
        addBotMessage('Por decime un número válido de piezas que necesitás (ej: 1, 5, 10).');
        currentState = State.QUANTITY;
      }
      break;
    }

    /* ─── NOMBRE DE CONTACTO ─── */
    case State.CONTACT_NAME: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val && val.length >= 3) {
        orderData.contactName = val;
        askContactInfo();
      } else {
        addBotMessage('Por favor decime tu nombre completo para poder registrar el pedido.');
        currentState = State.CONTACT_NAME;
      }
      break;
    }

    /* ─── INFO DE CONTACTO ─── */
    case State.CONTACT_INFO: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val && (val.includes('@') || /\d{6,}/.test(val))) {
        orderData.contactInfo = val;
        showConfirm();
      } else {
        addBotMessage('Por favor dejame un email válido o un número de teléfono para contactarte.');
        currentState = State.CONTACT_INFO;
      }
      break;
    }

    /* ─── CONFIRMACIÓN ─── */
    case State.CONFIRM: {
      const val = typeof input === 'string' ? input.toLowerCase() : '';
      if (val === 'confirm' || val === '1' || val.includes('confirm') || val.includes('✅')) {
        submitOrder();
      } else if (val === 'fix' || val === '2' || val.includes('correg') || val.includes('✏')) {
        Object.keys(orderData).forEach(k => delete orderData[k]);
        startOrder();
      } else if (val === 'cancel' || val === '3' || val.includes('cancel') || val.includes('❌')) {
        addBotMessage('No hay problema. Tu pedido fue cancelado.\n\nSi necesitás algo más, acá estoy.');
        showMenu();
      } else {
        addBotMessage('Por favor elegí una opción válida.');
        showConfirm();
      }
      break;
    }

    /* ─── ESTADO ─── */
    case State.STATUS: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val && !val.toLowerCase().includes('no tengo') && !val.toLowerCase().includes('no sé')) {
        addBotMessage(`📋 Consultando el estado del pedido **${escapeHtml(val)}**...\n\nEsta funcionalidad estará disponible pronto cuando conectemos el backend. Por ahora, contactanos directamente para saber el estado.`);
      } else {
        addBotMessage('No te preocupes. Comunicate con nosotros directamente y te ayudamos a localizar tu pedido.');
      }
      addOptions([
        { label: '🖨️  Nuevo pedido', value: 'order' },
        { label: '💬  Hablar con operador', value: 'operator' },
        { label: '🚪  Salir', value: 'exit' },
      ]);
      break;
    }

    /* ─── OPERADOR ─── */
    case State.OPERATOR: {
      const val = typeof input === 'string' ? input.trim() : '';
      if (val && val.length > 2) {
        addBotMessage(`📝 **Mensaje recibido:** "${escapeHtml(val)}"\n\nGracias, tu consulta fue registrada. Un operador se va a comunicar con vos pronto.`);
      }
      addOptions([
        { label: '🖨️  Nuevo pedido', value: 'order' },
        { label: '🚪  Salir', value: 'exit' },
      ]);
      break;
    }

    /* ─── POST-ÉXITO / SALIR ─── */
    case State.SUCCESS:
    case State.SUBMITTING: {
      const val = typeof input === 'string' ? input.toLowerCase() : '';
      if (val === 'exit' || val.includes('salir') || val.includes('🚪')) {
        addBotMessage('¡Gracias por contactarte con Tecnicoop! 🙌\n\nSi necesitás algo más, ya sabés dónde encontrarme. ¡Hasta luego!');
        closePanel();
      } else if (val === 'order' || val.includes('nuevo') || val.includes('🔄')) {
        startConversation();
      } else if (val === 'status' || val.includes('estado') || val.includes('❓')) {
        askStatus();
      } else if (val === 'operator' || val.includes('operador') || val.includes('💬')) {
        talkToOperator();
      } else {
        showMenu();
      }
      break;
    }

    default:
      showMenu();
  }
}

/* ═══════════════════════════════════════════════
   AUTO-RESIZE TEXTAREA
   ═══════════════════════════════════════════════ */

function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 100) + 'px';
}

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */

let hasStarted = false;

document.addEventListener('DOMContentLoaded', () => {
  initDOM();
  input.addEventListener('input', autoResize);

  // Iniciar conversación al abrir el panel por primera vez
  const origOpen = openPanel;
  openPanel = function() {
    origOpen.call(this);
    if (!hasStarted) {
      hasStarted = true;
      setTimeout(startConversation, 400);
    }
  };

  // Abrir automáticamente al cargar la página (opcional)
  // togglePanel();
});
