// ════════════════════════════════════════════════════════════════════════
//  market.js — MarkETec
//  Lógica del mercado: sesión (localStorage), compresión de imágenes a
//  base64, creación/edición/listado de anuncios en Firestore, moderación
//  de publicaciones por parte del admin, y manejo de la UI.
// ════════════════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ─────────────────────────── Configuración ─────────────────────────── */

const MAX_FOTOS = 5;
const EMAIL_ADMIN = 'v.dilello@alumno.etec.um.edu.ar';

// Devuelve true si el usuario actual es el administrador (por email).
export function esAdmin() {
  const user = getUsuario();
  return !!user && (user.email || '').toLowerCase() === EMAIL_ADMIN.toLowerCase();
}

/* ─────────────────────────── Sesión ─────────────────────────── */

// Devuelve el objeto user del localStorage, o null si no hay sesión.
export function getUsuario() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('No se pudo leer la sesión:', e);
    return null;
  }
}

// Si no hay sesión, redirige al login y devuelve null.
// Si hay sesión, devuelve el usuario.
export function requiereSesion() {
  const user = getUsuario();
  if (!user) {
    window.location.href = '../login.html';
    return null;
  }
  return user;
}

/* ─────────────────────────── Imágenes (base64) ─────────────────────────── */

// Convierte una imagen a base64 comprimida (para guardarla en Firestore).
// Redimensiona a maxDim px como máximo y comprime a JPEG para que el
// documento no supere el límite de 1 MB de Firestore.
function procesarImagen(file, maxDim = 800, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Escalar manteniendo proporción
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => reject(new Error('No se pudo leer una de las imágenes.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('No se pudo leer un archivo.'));
    reader.readAsDataURL(file);
  });
}

// Convierte una lista de archivos a base64, con un máximo de MAX_FOTOS.
async function procesarImagenes(files) {
  const resultado = [];
  const lista = Array.from(files || []);
  for (const file of lista) {
    if (resultado.length >= MAX_FOTOS) break;
    resultado.push(await procesarImagen(file));
  }
  return resultado;
}

/* ─────────────────────────── Anuncios ─────────────────────────── */

// Crea un anuncio: valida sesión, comprime las fotos y guarda el documento.
// Recibe un objeto con: { titulo, descripcion, categoria, precio, fotoFiles }
export async function crearAnuncio({ titulo, descripcion, categoria, precio, fotoFiles }) {
  const user = requiereSesion();          // si no hay sesión, redirige a login
  if (!user) return null;

  // Evitar anuncios duplicados: que el mismo vendedor no publique dos
  // veces un anuncio con el mismo título (ignorando mayúsculas/minúsculas).
  const dupQ = query(
    collection(db, 'anuncios'),
    where('vendedorId', '==', user.id)
  );
  const dupSnap = await getDocs(dupQ);
  const yaExiste = dupSnap.docs.some(
    d => (d.data().titulo || '').toLowerCase() === titulo.toLowerCase()
  );
  if (yaExiste) {
    throw new Error('Ya publicaste un anuncio con ese título.');
  }

  // Convertir las imágenes a base64 comprimidas (no se usa Storage)
  const fotos = await procesarImagenes(fotoFiles);

  const nuevoAnuncio = {
    titulo,
    descripcion,
    categoria,
    precio: Number(precio),
    vendedorId: user.id,
    vendedorNombre: user.nombre,
    vendedorApellido: user.apellido,
    vendedorEmail: user.email,
    fotos,
    fechaCreacion: Date.now(),
    estado: 'disponible',
    // Las publicaciones nuevas nacen SIN aprobar: el admin debe
    // aprobarlas para que sean visibles en el mercado.
    aprobado: false
  };

  const docRef = await addDoc(collection(db, 'anuncios'), nuevoAnuncio);
  return { id: docRef.id, ...nuevoAnuncio };
}

// Edita un anuncio existente (lo puede hacer el dueño o el admin).
// Recibe el id y un objeto con los campos a actualizar.
export async function editarAnuncio(id, { titulo, descripcion, categoria, precio, fotoFiles, fotosActuales }) {
  const user = requiereSesion();
  if (!user) return;

  // Si se subieron fotos nuevas, se agregan a las que ya estaban
  // (hasta MAX_FOTOS en total). Si no, se conservan las actuales.
  const fotosNuevas = await procesarImagenes(fotoFiles);
  const fotos = [...(fotosActuales || []), ...fotosNuevas].slice(0, MAX_FOTOS);

  await updateDoc(doc(db, 'anuncios', id), {
    titulo,
    descripcion,
    categoria,
    precio: Number(precio),
    fotos
  });
}

// Trae todos los anuncios aprobados (los visibles en el mercado),
// ordenados por fecha de creación (nuevos primero).
export async function obtenerAnuncios() {
  const q = query(collection(db, 'anuncios'), orderBy('fechaCreacion', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(a => a.aprobado === true);      // solo los aprobados
}

// Trae TODOS los anuncios (aprobados y pendientes). Solo para admin.
export async function obtenerTodosLosAnuncios() {
  const q = query(collection(db, 'anuncios'), orderBy('fechaCreacion', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Aprueba una publicación (la hace visible en el mercado). Solo admin.
export async function aprobarAnuncio(id) {
  await updateDoc(doc(db, 'anuncios', id), { aprobado: true });
  await refrescarTodo();
}

// Rechaza una publicación (la deja oculta). Solo admin.
export async function rechazarAnuncio(id) {
  await updateDoc(doc(db, 'anuncios', id), { aprobado: false });
  await refrescarTodo();
}

// Borra un anuncio (dueño o admin).
export async function borrarAnuncio(id) {
  const user = requiereSesion();          // si no hay sesión, redirige a login
  if (!user) return;

  if (!confirm('¿Seguro que querés borrar este anuncio?')) return;

  await deleteDoc(doc(db, 'anuncios', id));
  await refrescarTodo();
}

// Marca un anuncio propio como "vendido".
export async function marcarVendido(id) {
  const user = requiereSesion();          // si no hay sesión, redirige a login
  if (!user) return;

  await updateDoc(doc(db, 'anuncios', id), { estado: 'vendido' });
  await refrescarTodo();
}

/* ─────────────────────────── UI / DOM ─────────────────────────── */

// Referencias a elementos
const sesionArea = document.getElementById('sesionArea');
const btnCrear = document.getElementById('btnCrear');
const btnModerar = document.getElementById('btnModerar');
const grilla = document.getElementById('grilla');
const sinAnuncios = document.getElementById('sinAnuncios');
const modalCrear = document.getElementById('modalCrear');
const modalTitulo = document.getElementById('modalTitulo');
const formAnuncio = document.getElementById('formAnuncio');
const btnCancelar = document.getElementById('btnCancelar');
const btnSubmit = document.getElementById('btnSubmit');
const mensajeForm = document.getElementById('mensajeForm');
const fotoHint = document.getElementById('fotoHint');
const fotoInput = document.getElementById('foto');
const buscador = document.getElementById('buscador');
const filtroCategoria = document.getElementById('filtroCategoria');
const orderPor = document.getElementById('orderPor');

// Modal de detalle del producto
const modalDetalle = document.getElementById('modalDetalle');
const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
const detalleImg = document.getElementById('detalleImg');
const detalleCat = document.getElementById('detalleCat');
const detalleTitulo = document.getElementById('detalleTitulo');
const detallePrecio = document.getElementById('detallePrecio');
const detalleDesc = document.getElementById('detalleDesc');
const detalleVendedor = document.getElementById('detalleVendedor');
const detalleEmail = document.getElementById('detalleEmail');
const detalleContactar = document.getElementById('detalleContactar');

// Modal de moderación (admin)
const modalModerar = document.getElementById('modalModerar');
const btnCerrarModerar = document.getElementById('btnCerrarModerar');
const modLista = document.getElementById('modLista');

// Toast
const toast = document.getElementById('toast');
let toastTimer = null;

// Copia de los anuncios aprobados para poder filtrarlos sin volver a consultar
let todosLosAnuncios = [];

// Copia de TODOS los anuncios para el panel de moderación
let todosLosAnunciosMod = [];

// Id del anuncio que se está editando (null = modo creación)
let editandoId = null;

// Fotos actuales del anuncio en edición (para conservarlas si no se suben nuevas)
let fotosEnEdicion = [];

// Mostrar un toast temporal
function mostrarToast(texto) {
  toast.textContent = texto;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

// Refresca la grilla pública y, si es admin, también el panel de moderación.
async function refrescarTodo() {
  await cargarAnuncios();
  if (esAdmin()) await cargarModeracion();
}

// Renderiza el navbar según haya o no sesión.
function renderizarNavbar() {
  const user = getUsuario();

  if (user) {
    sesionArea.innerHTML = `
      <span class="nav-saludo">Hola, <strong>${escapeHtml(user.nombre)}</strong></span>
      <button id="btnCerrarSesion" class="btn btn-ghost">Cerrar sesión</button>
    `;
    btnCrear.style.display = 'inline-flex';
    btnModerar.hidden = !esAdmin();        // el botón de moderar solo para el admin

    document.getElementById('btnCerrarSesion')
      .addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.reload();
      });
  } else {
    sesionArea.innerHTML = `<a href="../login.html" class="btn btn-primary">Ingresar</a>`;
    btnCrear.style.display = 'none';
    btnModerar.hidden = true;
  }
}

// Dibuja la grilla de anuncios.
function renderizarGrilla(anuncios) {
  grilla.innerHTML = '';

  if (!anuncios.length) {
    sinAnuncios.hidden = false;
    return;
  }
  sinAnuncios.hidden = true;

  anuncios.forEach(a => {
    const foto = (a.fotos && a.fotos[0]) || '';
    const precio = Number(a.precio).toLocaleString('es-AR', {
      style: 'currency', currency: 'ARS'
    });
    const vendedor = `${a.vendedorNombre || ''} ${a.vendedorApellido || ''}`.trim();

    // Estado del anuncio
    const estado = a.estado || 'disponible';
    const esVendido = estado === 'vendido';

    // Solo el dueño ve los botones de marcar vendido; dueño y admin ven editar/borrar
    const user = getUsuario();
    const esMio = user && a.vendedorId === user.id;
    const admin = esAdmin();

    const card = document.createElement('article');
    card.className = 'anuncio-card' + (esVendido ? ' vendido' : '');
    card.innerHTML = `
      <div class="anuncio-img" style="background-image:url('${foto}')">
        <span class="estado-badge ${esVendido ? 'vendido' : ''}">${esVendido ? 'Vendido' : 'Disponible'}</span>
      </div>
      <div class="anuncio-body">
        <span class="anuncio-cat">${escapeHtml(a.categoria || '')}</span>
        <h3 class="anuncio-titulo">${escapeHtml(a.titulo)}</h3>
        <p class="anuncio-precio">${precio}</p>
        <p class="anuncio-vendedor">👤 ${escapeHtml(vendedor || 'Anónimo')}</p>
        ${esMio && !esVendido ? `<button class="btn btn-vender" type="button">✔ Marcar vendido</button>` : ''}
        ${(esMio || admin) ? `<button class="btn btn-editar" type="button">✏️ Editar</button>` : ''}
        ${(esMio || admin) ? `<button class="btn btn-borrar" type="button">🗑️ Borrar</button>` : ''}
      </div>
    `;
    grilla.appendChild(card);

    // Clic en la tarjeta → abre el detalle (los botones hacen stopPropagation)
    card.addEventListener('click', () => abrirDetalle(a));

    const btnBorrar = card.querySelector('.btn-borrar');
    if (btnBorrar) {
      btnBorrar.addEventListener('click', (e) => {
        e.stopPropagation();
        borrarAnuncio(a.id);
      });
    }

    const btnVender = card.querySelector('.btn-vender');
    if (btnVender) {
      btnVender.addEventListener('click', (e) => {
        e.stopPropagation();
        marcarVendido(a.id);
      });
    }

    const btnEditar = card.querySelector('.btn-editar');
    if (btnEditar) {
      btnEditar.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalCrear(a);
      });
    }
  });
}

// Abre el modal de creación (sin anuncio) o de edición (con anuncio).
function abrirModalCrear(anuncio) {
  if (!requiereSesion()) return;

  if (anuncio) {
    // Modo edición: precargamos los datos y conservamos las fotos actuales
    editandoId = anuncio.id;
    fotosEnEdicion = anuncio.fotos || [];
    modalTitulo.textContent = 'Editar anuncio';
    btnSubmit.textContent = 'Guardar cambios';
    document.getElementById('titulo').value = anuncio.titulo || '';
    document.getElementById('descripcion').value = anuncio.descripcion || '';
    document.getElementById('categoria').value = anuncio.categoria || '';
    document.getElementById('precio').value = anuncio.precio || '';
    fotoHint.textContent = `Tenés ${fotosEnEdicion.length}/${MAX_FOTOS} imágenes. Podés subir ${MAX_FOTOS - fotosEnEdicion.length} más.`;
  } else {
    // Modo creación: formulario limpio
    editandoId = null;
    fotosEnEdicion = [];
    modalTitulo.textContent = 'Publicar un anuncio';
    btnSubmit.textContent = 'Publicar';
    formAnuncio.reset();
    fotoHint.textContent = `Podés subir hasta ${MAX_FOTOS} imágenes.`;
  }

  mensajeForm.textContent = '';
  mensajeForm.className = 'form-msg';
  fotoInput.value = '';
  modalCrear.hidden = false;
}

function cerrarModal() {
  modalCrear.hidden = true;
}

// Abre el detalle de un producto.
function abrirDetalle(a) {
  const foto = (a.fotos && a.fotos[0]) || '';
  const vendedor = `${a.vendedorNombre || ''} ${a.vendedorApellido || ''}`.trim();
  const precio = Number(a.precio).toLocaleString('es-AR', {
    style: 'currency', currency: 'ARS'
  });
  const email = a.vendedorEmail || '';
  const cantidadFotos = (a.fotos && a.fotos.length) || 0;

  detalleImg.style.backgroundImage = foto ? `url('${foto}')` : 'none';
  detalleCat.textContent = a.categoria || '';
  detalleTitulo.textContent = a.titulo || '';
  detallePrecio.textContent = precio;
  detalleDesc.textContent = a.descripcion || '';
  detalleVendedor.textContent = vendedor || 'Anónimo';
  detalleEmail.textContent = email || 'Sin contacto';
  detalleEmail.href = email ? `mailto:${email}` : '#';
  detalleContactar.href = email
    ? `mailto:${email}?subject=${encodeURIComponent('Hola, vi tu anuncio en MarkETec: ' + (a.titulo || ''))}`
    : '#';

  // Indicar cuántas fotos tiene el anuncio
  const img = modalDetalle.querySelector('.detalle-img');
  const numBadge = img.querySelector('.detalle-num');
  if (numBadge) numBadge.remove();
  if (cantidadFotos > 1) {
    const span = document.createElement('span');
    span.className = 'detalle-num';
    span.textContent = `📷 ${cantidadFotos} fotos`;
    img.appendChild(span);
  }

  modalDetalle.hidden = false;
}

function cerrarDetalle() {
  modalDetalle.hidden = true;
}

// ── Panel de moderación (solo admin) ──

function abrirModeracion() {
  if (!esAdmin()) return;
  modalModerar.hidden = false;
  cargarModeracion();
}

function cerrarModeracion() {
  modalModerar.hidden = true;
}

// Carga y dibuja TODAS las publicaciones para moderar.
async function cargarModeracion() {
  if (!esAdmin()) return;
  try {
    todosLosAnunciosMod = await obtenerTodosLosAnuncios();
    renderizarModeracion(todosLosAnunciosMod);
  } catch (err) {
    console.error('Error al cargar la moderación:', err);
    modLista.innerHTML = '<p class="empty">No se pudieron cargar las publicaciones.</p>';
  }
}

// Dibuja la lista de publicaciones en el panel de moderación.
function renderizarModeracion(lista) {
  modLista.innerHTML = '';

  if (!lista.length) {
    modLista.innerHTML = '<p class="empty">No hay publicaciones todavía.</p>';
    return;
  }

  lista.forEach(a => {
    const foto = (a.fotos && a.fotos[0]) || '';
    const vendedor = `${a.vendedorNombre || ''} ${a.vendedorApellido || ''}`.trim();
    const precio = Number(a.precio || 0).toLocaleString('es-AR', {
      style: 'currency', currency: 'ARS'
    });

    // Badge de estado de moderación + venta
    const vendido = (a.estado || '') === 'vendido';
    let badge = 'pendiente';
    let badgeTexto = 'Pendiente';
    if (vendido) { badge = 'vendido'; badgeTexto = 'Vendido'; }
    else if (a.aprobado === true) { badge = 'aprobado'; badgeTexto = 'Aprobado'; }
    else if (a.aprobado === false) { badge = 'rechazado'; badgeTexto = 'Rechazado'; }

    const item = document.createElement('div');
    item.className = 'mod-item';
    item.innerHTML = `
      <div class="mod-img" style="background-image:url('${foto}')"></div>
      <div class="mod-info">
        <h4>${escapeHtml(a.titulo)}</h4>
        <span class="mod-precio">${precio}</span>
        <div class="mod-meta">👤 ${escapeHtml(vendedor || 'Anónimo')} · ${escapeHtml(a.categoria || '')}</div>
        <span class="mod-badge ${badge}">${badgeTexto}</span>
      </div>
      <div class="mod-acciones">
        ${!vendido && a.aprobado !== true ? `<button class="btn btn-ghost btn-aprobar" data-accion="aprobar" data-id="${a.id}">✔ Aprobar</button>` : ''}
        ${!vendido ? `<button class="btn btn-ghost btn-rechazar" data-accion="rechazar" data-id="${a.id}">✖ Rechazar</button>` : ''}
        <button class="btn btn-ghost" data-accion="editar" data-id="${a.id}">✏️ Editar</button>
        <button class="btn btn-ghost btn-borrar" data-accion="borrar" data-id="${a.id}">🗑️ Borrar</button>
      </div>
    `;
    modLista.appendChild(item);
  });
}

// Delegación de eventos en la lista de moderación
modLista.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-accion]');
  if (!btn) return;
  const accion = btn.dataset.accion;
  const id = btn.dataset.id;
  const anuncio = todosLosAnunciosMod.find(a => a.id === id);

  if (accion === 'aprobar') {
    aprobarAnuncio(id);
    mostrarToast('Publicación aprobada y visible en el mercado.');
  } else if (accion === 'rechazar') {
    rechazarAnuncio(id);
    mostrarToast('Publicación rechazada.');
  } else if (accion === 'editar') {
    cerrarModeracion();
    abrirModalCrear(anuncio);
  } else if (accion === 'borrar') {
    borrarAnuncio(id);
    mostrarToast('Anuncio borrado.');
  }
});

// Maneja el envío del formulario de creación o edición.
async function manejarEnvio(e) {
  e.preventDefault();

  const fotoFiles = fotoInput.files;

  // En creación se exige al menos una foto; en edición no (se conservan las actuales)
  const esCreacion = editandoId === null;
  if (esCreacion && (!fotoFiles || fotoFiles.length === 0)) {
    mostrarMensaje('Seleccioná al menos una imagen.', 'error');
    return;
  }

  // Validar que no se supere el máximo de fotos
  const totalFotos = (fotoFiles ? fotoFiles.length : 0) + fotosEnEdicion.length;
  if (totalFotos > MAX_FOTOS) {
    mostrarMensaje(`Máximo ${MAX_FOTOS} imágenes por anuncio.`, 'error');
    return;
  }

  const datos = {
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    categoria: document.getElementById('categoria').value,
    precio: document.getElementById('precio').value
  };

  if (!datos.titulo || !datos.descripcion || !datos.categoria || !datos.precio) {
    mostrarMensaje('Completá todos los campos.', 'error');
    return;
  }

  // Mostrar estado de carga
  const textoOriginal = btnSubmit.textContent;
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando…';

  try {
    if (esCreacion) {
      await crearAnuncio({ ...datos, fotoFiles });
      mostrarToast('Anuncio enviado ✅. El admin debe aprobarlo para que se vea.');
    } else {
      await editarAnuncio(editandoId, { ...datos, fotoFiles, fotosActuales: fotosEnEdicion });
      mostrarToast('Anuncio actualizado.');
    }
    cerrarModal();
    await refrescarTodo();
  } catch (err) {
    console.error('Error al guardar el anuncio:', err);
    mostrarMensaje(err.message || 'Hubo un error al guardar. Revisá la consola.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoOriginal;
  }
}

function mostrarMensaje(texto, tipo) {
  mensajeForm.textContent = texto;
  mensajeForm.className = 'form-msg ' + (tipo || '');
}

// Aplica buscador, filtro de categoría y orden sobre todos los anuncios.
function aplicarFiltros() {
  const texto = (buscador.value || '').toLowerCase().trim();
  const cat = filtroCategoria.value;
  const orden = orderPor.value;

  const filtrados = todosLosAnuncios.filter(a => {
    const coincideTexto = !texto || (a.titulo || '').toLowerCase().includes(texto);
    const coincideCat = !cat || a.categoria === cat;
    return coincideTexto && coincideCat;
  });

  // Ordenar según la opción elegida
  filtrados.sort((a, b) => {
    if (orden === 'menor') return (a.precio || 0) - (b.precio || 0);
    if (orden === 'mayor') return (b.precio || 0) - (a.precio || 0);
    return (b.fechaCreacion || 0) - (a.fechaCreacion || 0); // más nuevos
  });

  renderizarGrilla(filtrados);
}

// Carga y dibuja los anuncios aprobados de Firestore.
async function cargarAnuncios() {
  try {
    todosLosAnuncios = await obtenerAnuncios();
    aplicarFiltros();
  } catch (err) {
    console.error('Error al cargar anuncios:', err);
    sinAnuncios.hidden = false;
    sinAnuncios.textContent = 'No se pudieron cargar los anuncios. Verificá la conexión con Firebase.';
  }
}

// Utilidad para escapar texto y evitar inyección de HTML.
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/* ─────────────────────────── Inicialización ─────────────────────────── */

renderizarNavbar();
cargarAnuncios();

btnCrear.addEventListener('click', () => abrirModalCrear(null));
btnCancelar.addEventListener('click', cerrarModal);
formAnuncio.addEventListener('submit', manejarEnvio);

btnModerar.addEventListener('click', abrirModeracion);
btnCerrarModerar.addEventListener('click', cerrarModeracion);
modalModerar.addEventListener('click', (e) => {
  if (e.target === modalModerar) cerrarModeracion();
});

buscador.addEventListener('input', aplicarFiltros);
filtroCategoria.addEventListener('change', aplicarFiltros);
orderPor.addEventListener('change', aplicarFiltros);

btnCerrarDetalle.addEventListener('click', cerrarDetalle);
modalDetalle.addEventListener('click', (e) => {
  if (e.target === modalDetalle) cerrarDetalle();
});

// Cerrar modales con la tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModal();
    cerrarDetalle();
    cerrarModeracion();
  }
});

// Cerrar el modal al hacer clic fuera de la tarjeta
modalCrear.addEventListener('click', (e) => {
  if (e.target === modalCrear) cerrarModal();
});
