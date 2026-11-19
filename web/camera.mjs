// Solicita acceso a la cámara únicamente al pulsar «Tomar foto».
export function createCamera(onCapture) {
  const dialog = document.createElement('dialog');
  dialog.className = 'camera-dialog';
  dialog.setAttribute('aria-labelledby', 'camera-title');
  dialog.innerHTML = `<div class="dialog-head"><h2 id="camera-title">Tomar foto</h2><button class="button secondary" type="button" id="camera-close">Cerrar</button></div>
    <p id="camera-help">Coloca la persona o el documento dentro de la imagen y pulsa «Tomar foto».</p>
    <p id="camera-status" role="status" aria-live="polite"></p>
    <video id="camera-video" autoplay playsinline muted aria-label="Vista de la cámara"></video>
    <img id="camera-preview" alt="Foto tomada para revisar" hidden>
    <div class="camera-actions"><button class="button primary" type="button" id="camera-shoot" disabled>Tomar foto</button><button class="button primary" type="button" id="camera-use" hidden>Usar esta foto</button><button class="button secondary" type="button" id="camera-retake" hidden>Volver a tomar</button><button class="button secondary" type="button" id="camera-device">Elegir foto del dispositivo</button></div>`;
  document.body.append(dialog);
  const video = dialog.querySelector('video');
  const image = dialog.querySelector('#camera-preview');
  const status = dialog.querySelector('#camera-status');
  const shoot = dialog.querySelector('#camera-shoot');
  const use = dialog.querySelector('#camera-use');
  const retake = dialog.querySelector('#camera-retake');
  const native = document.createElement('input');
  native.type = 'file'; native.accept = 'image/jpeg,image/png'; native.hidden = true;
  native.setAttribute('aria-label', 'Tomar o elegir una foto');
  document.body.append(native);
  let stream = null;
  let snapshot = null;
  let previewUrl = null;
  let target = '';
  let generation = 0;
  let nativeTarget = '';

  function releaseStream() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; video.srcObject = null;
  }
  function clearSnapshot() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; snapshot = null; image.removeAttribute('src');
  }
  function stop() {
    generation++; releaseStream(); clearSnapshot();
  }
  function deviceCapture(type) {
    nativeTarget = type;
    native.setAttribute('capture', type === 'foto' ? 'user' : 'environment');
    native.value = ''; native.click();
  }
  native.onchange = () => {
    const file = native.files?.[0];
    if (file) onCapture(nativeTarget, file);
    native.value = '';
  };
  async function start() {
    const token = ++generation;
    releaseStream(); clearSnapshot();
    video.hidden = false; image.hidden = true; use.hidden = true; retake.hidden = true;
    shoot.hidden = false; shoot.disabled = true;
    status.textContent = 'Permite el acceso a la cámara si tu navegador lo solicita.';
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'Este navegador no permite abrir la cámara aquí. Puedes elegir una foto del dispositivo.';
      video.hidden = true; return;
    }
    try {
      const result = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: target === 'foto' ? 'user' : 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false });
      if (token !== generation || !dialog.open) { result.getTracks().forEach(track => track.stop()); return; }
      stream = result; video.srcObject = stream;
      await video.play();
      if (token !== generation || !dialog.open) return;
      shoot.disabled = false; status.textContent = 'Cámara lista. Revisa el encuadre antes de tomar la foto.';
    } catch (error) {
      if (token !== generation || !dialog.open) return;
      releaseStream(); video.hidden = true;
      status.textContent = error.name === 'NotAllowedError' ? 'No se dio permiso para usar la cámara. Puedes elegir una foto del dispositivo o habilitar el permiso en tu navegador.' : 'No pudimos abrir la cámara. Comprueba que esté disponible o elige una foto del dispositivo.';
    }
  }
  shoot.onclick = async () => {
    if (!video.videoWidth || !stream) return;
    shoot.disabled = true;
    const token = generation;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
    if (token !== generation || !dialog.open) return;
    if (!blob) { status.textContent = 'No pudimos tomar la foto. Intenta nuevamente.'; shoot.disabled = false; return; }
    releaseStream();
    snapshot = new File([blob], 'foto-camara.jpg', { type: 'image/jpeg' });
    previewUrl = URL.createObjectURL(blob); image.src = previewUrl;
    video.hidden = true; image.hidden = false; shoot.hidden = true;
    use.hidden = false; retake.hidden = false;
    status.textContent = 'Revisa que la foto sea clara. Puedes usarla o volver a tomarla.';
    use.focus();
  };
  use.onclick = () => {
    if (!snapshot) return;
    const file = snapshot;
    const type = target;
    dialog.close(); stop();
    onCapture(type, file);
  };
  retake.onclick = start;
  dialog.querySelector('#camera-close').onclick = () => dialog.close();
  dialog.querySelector('#camera-device').onclick = () => {
    const type = target;
    dialog.close(); stop(); deviceCapture(type);
  };
  dialog.addEventListener('close', stop);
  dialog.addEventListener('cancel', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.open) { dialog.close(); stop(); } });
  window.addEventListener('beforeunload', stop);
  return {
    open(type, title) {
      target = type;
      // En teléfono se abre la cámara nativa, sin permisos de micrófono.
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { deviceCapture(type); return; }
      dialog.querySelector('#camera-title').textContent = 'Tomar foto · ' + title;
      dialog.showModal(); start();
    },
    close() { if (dialog.open) dialog.close(); stop(); }
  };
}
