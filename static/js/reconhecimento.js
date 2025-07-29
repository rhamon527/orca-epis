const video = document.getElementById("video");
const statusEl = document.getElementById("status");

let faceMatcher = null;

// Carrega os modelos
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/static/models/tiny_face_detector"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/static/models/face_landmark_68"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/static/models/face_recognition")
]).then(async () => {
  statusEl.innerText = "🔄 Carregando fotos dos colaboradores...";
  faceMatcher = await carregarColaboradores();
  iniciarCamera();
}).catch(err => {
  console.error("Erro ao carregar modelos:", err);
  statusEl.innerText = "❌ Erro ao carregar modelos.";
});

// Carrega todos os rostos de static/faces/
async function carregarColaboradores() {
  const arquivos = [
    "12345678900.jpg",
    "98765432100.jpg"
    // coloque aqui os CPFs dos colaboradores com a extensão exata da imagem
  ];

  const descritores = [];

  for (const nomeArquivo of arquivos) {
    const cpf = nomeArquivo.split(".")[0];
    try {
      const img = await faceapi.fetchImage(`/static/faces/${nomeArquivo}`);
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detections) {
        console.warn(`❌ Rosto não detectado em: ${nomeArquivo}`);
        continue;
      }
      descritores.push(new faceapi.LabeledFaceDescriptors(cpf, [detections.descriptor]));
    } catch (err) {
      console.error(`Erro ao carregar imagem ${nomeArquivo}:`, err);
    }
  }

  return new faceapi.FaceMatcher(descritores);
}

async function iniciarCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 720, height: 560, facingMode: "user" }
    });
    video.srcObject = stream;
    statusEl.innerText = "📷 Câmera ligada, procurando rostos...";

    video.addEventListener("play", () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.appendChild(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const results = resized.map(d => faceMatcher.findBestMatch(d.descriptor));

        results.forEach((result, i) => {
          const box = resized[i].detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
          drawBox.draw(canvas);

          if (result.label.includes("unknown")) {
            statusEl.innerText = "❌ Pessoa não reconhecida";
          } else {
            statusEl.innerText = `✅ Pessoa reconhecida: CPF ${result.label}`;
            console.log("Reconhecido:", result.label);
          }
        });
      }, 1500);
    });
  } catch (err) {
    console.error("Erro ao acessar câmera:", err);
    statusEl.innerText = "❌ Erro ao acessar câmera.";
  }
}
