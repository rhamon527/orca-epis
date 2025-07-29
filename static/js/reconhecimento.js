<script>
const video = document.getElementById("video");
const statusEl = document.getElementById("status");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/static/models/tiny_face_detector'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/static/models/face_landmark_68'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/static/models/face_recognition')
])
.then(carregarFaces)
.catch(err => {
  console.error("Erro ao carregar modelos:", err);
  statusEl.innerText = "❌ Erro ao carregar modelos.";
});

async function carregarFaces() {
  const response = await fetch('/faces-list');
  const arquivos = await response.json();

  const descritoresRotulados = [];

  for (const nomeArquivo of arquivos) {
    const label = nomeArquivo.replace(".jpg", ""); // CPF
    const img = await faceapi.fetchImage(`/static/faces/${nomeArquivo}`);
    const descritor = await faceapi.computeFaceDescriptor(img);
    descritoresRotulados.push(new faceapi.LabeledFaceDescriptors(label, [descritor]));
  }

  iniciarCamera(descritoresRotulados);
}

async function iniciarCamera(labeledDescriptors) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 720, height: 560 }
    });
    video.srcObject = stream;
    statusEl.innerText = "📷 Câmera ligada, procurando rostos...";
    console.log("📷 Câmera ativada");

    video.addEventListener("play", async () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.appendChild(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

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
            : "✅ Reconhecido CPF: " + result.label;
        });
      }, 1500);
    });

  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
    statusEl.innerText = "❌ Erro ao acessar a câmera.";
  }
}
</script>
