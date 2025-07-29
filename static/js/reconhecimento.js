const video = document.getElementById("video");
const statusEl = document.getElementById("status");

// Carrega os modelos do face-api.js
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models/tiny_face_detector'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models/face_landmark_68'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models/face_recognition')
])
.then(iniciarCamera)
.catch(err => {
  console.error("Erro ao carregar modelos:", err);
  statusEl.innerText = "❌ Erro ao carregar modelos.";
});

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 720, height: 560, facingMode: "user" }
    });
    video.srcObject = stream;
    statusEl.innerText = "📷 Câmera ligada, procurando rostos...";
    console.log("📷 Câmera ativada");

    video.addEventListener("play", async () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.appendChild(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      // Carregar imagem de referência
      const imagemReferencia = await faceapi.fetchImage("/static/images/referencia1.jpg");
      const descriptors = [await faceapi.computeFaceDescriptor(imagemReferencia)];
      const faceMatcher = new faceapi.FaceMatcher(descriptors);
      console.log("🧠 Reconhecimento iniciado...");

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const results = resized.map(d =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        results.forEach((result, i) => {
          const box = resized[i].detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
          drawBox.draw(canvas);

          statusEl.innerText = result.label.includes("unknown")
            ? "❌ Pessoa não reconhecida"
            : "✅ Pessoa reconhecida: " + result.label;
        });
      }, 1500);
    });
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
    statusEl.innerText = "❌ Erro ao acessar a câmera.";
  }
}
