const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const imagemBase64 = document.getElementById('imagem_base64');
const form = document.getElementById('formBiometria');

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 480,
  height: 360,
});

camera.start();

let capturado = false;

function onResults(results) {
  if (results.multiFaceLandmarks.length > 0 && !capturado) {
    capturado = true;

    // Captura imagem do vídeo e converte em base64
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imagem = canvas.toDataURL('image/jpeg');
    imagemBase64.value = imagem;

    camera.stop();
    form.submit();
  }
}
