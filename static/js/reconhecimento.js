const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Carrega os modelos do face-api.js
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models')
]).then(iniciarCamera);

async function iniciarCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  video.srcObject = stream;
  statusEl.innerText = "📷 Câmera ligada, procurando rostos...";

  video.addEventListener("play", async () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    // Carregar imagem de referência
    const imagemReferencia = await faceapi.fetchImage("/static/images/referencia1.jpg");
    const referenciaDescricao = await faceapi.computeFaceDescriptor(imagemReferencia);
    const faceMatcher = new faceapi.FaceMatcher(referenciaDescricao);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      const resultados = resized.map(d =>
        faceMatcher.findBestMatch(d.descriptor)
      );

      resultados.forEach((result, i) => {
        const box = resized[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
        drawBox.draw(canvas);

        statusEl.innerText = result.label.includes("unknown")
          ? "❌ Pessoa não reconhecida"
          : "✅ Pessoa reconhecida: " + result.label;
      });
    }, 1500);
  });
}
