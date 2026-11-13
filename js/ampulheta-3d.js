/* Ampulheta 3D da seção da galeria (index.html), modelada direto no código
   com three.js. Gira conforme a página rola; a areia escoa de acordo com
   window.chronoGaleria.progresso, atualizado por js/landing-scroll.js.

   Otimização: o three.js (~1 MB) só é baixado quando a seção se aproxima da
   tela, e a cena só é redesenhada enquanto algo está mudando (rolagem ou
   areia) — parada, a ampulheta não gasta GPU. */
const palco = document.querySelector(".hourglass-stage");
const canvas = palco && palco.querySelector(".hourglass-canvas");

function suportaWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (_) {
    return false;
  }
}

if (canvas && suportaWebGL()) {
  const aproximou = new IntersectionObserver((entradas) => {
    if (!entradas[0].isIntersecting) return;
    aproximou.disconnect();
    import("three")
      .then(iniciar)
      .catch((erro) => console.error("Ampulheta 3D indisponível:", erro)); // o SVG de reserva continua no lugar
  }, { rootMargin: "800px 0px" });
  aproximou.observe(palco);
}

function iniciar(THREE) {
  const maquinaModesta = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maquinaModesta ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // Iluminação sem mapa de ambiente (mais barato para GPUs integradas)
  cena.add(new THREE.HemisphereLight(0xfff1d6, 0x2a1f3a, 1.1));
  const luzChave = new THREE.DirectionalLight(0xffe2a8, 2.6);
  luzChave.position.set(3, 4, 5);
  cena.add(luzChave);
  const luzContra = new THREE.DirectionalLight(0x6f86ff, 2);
  luzContra.position.set(-4, 1.5, -3);
  cena.add(luzContra);
  const luzAreia = new THREE.PointLight(0xe8c84a, 5, 6, 2);
  luzAreia.position.set(0, -0.6, 1.2);
  cena.add(luzAreia);

  const ouro = new THREE.MeshStandardMaterial({ color: 0xd4ab35, metalness: 0.6, roughness: 0.3 });
  const madeira = new THREE.MeshStandardMaterial({ color: 0x4a2c17, metalness: 0.05, roughness: 0.55 });
  const vidro = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.08,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const areia = new THREE.MeshStandardMaterial({
    color: 0xe8c066,
    roughness: 0.9,
    emissive: 0x4a3208,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  });

  const ampulheta = new THREE.Group();
  ampulheta.rotation.x = 0.08;
  cena.add(ampulheta);

  // Perfil do bulbo (metade de cima; a de baixo é o espelho): estreito no
  // gargalo, largo no meio e fechando um pouco perto das bases.
  const ALTURA = 1.45;
  const GARGALO = 0.07;
  const SEG = maquinaModesta ? 40 : 56;
  function raio(y) {
    const t = Math.min(1, Math.abs(y) / ALTURA);
    const bulbo = Math.sin(t * Math.PI * 0.82);
    return GARGALO + (0.88 - GARGALO) * Math.pow(Math.max(0, bulbo), 0.85);
  }

  const perfilVidro = [];
  for (let i = 0; i <= 48; i++) {
    const y = -ALTURA + (2 * ALTURA * i) / 48;
    perfilVidro.push(new THREE.Vector2(raio(y), y));
  }
  const malhaVidro = new THREE.Mesh(new THREE.LatheGeometry(perfilVidro, SEG), vidro);
  malhaVidro.renderOrder = 2;
  ampulheta.add(malhaVidro);

  // Bases de madeira com aros dourados
  [1, -1].forEach((lado) => {
    const yBase = lado * (ALTURA + 0.11);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.22, SEG), madeira);
    base.position.y = yBase;
    ampulheta.add(base);
    [0.1, -0.1].forEach((d) => {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.035, 8, SEG), ouro);
      aro.rotation.x = Math.PI / 2;
      aro.position.y = yBase + d;
      ampulheta.add(aro);
    });
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.08, 32), ouro);
    tampa.position.y = yBase + lado * 0.15;
    ampulheta.add(tampa);
  });

  // Três colunas douradas torneadas
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const coluna = new THREE.Group();
    coluna.position.set(Math.cos(ang) * 0.98, 0, Math.sin(ang) * 0.98);
    coluna.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, ALTURA * 2, 12), ouro));
    [-0.9, 0, 0.9].forEach((y) => {
      const anel = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), ouro);
      anel.scale.y = 0.6;
      anel.position.y = y;
      coluna.add(anel);
    });
    ampulheta.add(coluna);
  }

  // Areia: as malhas são refeitas a partir do perfil do bulbo conforme o nível
  const areiaTopo = new THREE.Mesh(new THREE.BufferGeometry(), areia);
  const areiaBase = new THREE.Mesh(new THREE.BufferGeometry(), areia);
  const filete = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 6), areia);
  ampulheta.add(areiaTopo, areiaBase, filete);

  const FOLGA = 0.93;
  const FUNDO = -ALTURA + 0.03;

  function geometriaTopo(nivel) {
    const pts = [new THREE.Vector2(0, 0.03)];
    for (let i = 0; i <= 18; i++) {
      const y = 0.03 + ((nivel - 0.03) * i) / 18;
      pts.push(new THREE.Vector2(raio(y) * FOLGA, y));
    }
    // leve funil no centro, como a areia descendo pelo gargalo
    pts.push(new THREE.Vector2(0, Math.max(0.03, nivel - 0.06)));
    return new THREE.LatheGeometry(pts, SEG);
  }

  function geometriaBase(nivel, monte) {
    const pts = [new THREE.Vector2(0, FUNDO)];
    for (let i = 0; i <= 18; i++) {
      const y = FUNDO + ((nivel - FUNDO) * i) / 18;
      pts.push(new THREE.Vector2(raio(y) * FOLGA, y));
    }
    pts.push(new THREE.Vector2(0, nivel + monte));
    return new THREE.LatheGeometry(pts, SEG);
  }

  let progressoDesenhado = -1;
  function atualizarAreia(p) {
    if (Math.abs(p - progressoDesenhado) < 0.004) return;
    progressoDesenhado = p;

    const nivelTopo = THREE.MathUtils.lerp(1.02, 0.03, p);
    const nivelBase = THREE.MathUtils.lerp(FUNDO, -0.5, p);
    const monte = 0.24 * Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5);

    areiaTopo.geometry.dispose();
    areiaBase.geometry.dispose();
    areiaTopo.visible = nivelTopo > 0.07;
    areiaBase.visible = p > 0.01;
    if (areiaTopo.visible) areiaTopo.geometry = geometriaTopo(nivelTopo);
    if (areiaBase.visible) areiaBase.geometry = geometriaBase(nivelBase, monte);

    const topoMonte = areiaBase.visible ? nivelBase + monte : FUNDO;
    const alturaFilete = Math.max(0.001, 0.02 - topoMonte);
    filete.visible = p > 0.005 && p < 0.985;
    filete.scale.y = alturaFilete;
    filete.position.y = 0.02 - alturaFilete / 2;
  }

  // ── Desenho sob demanda ────────────────────────────────────
  let visivel = true;
  let rodando = false;
  let giro = window.scrollY * 0.0032;
  let progresso = 0;

  function pedirQuadro() {
    if (rodando || !visivel) return;
    rodando = true;
    requestAnimationFrame(quadro);
  }

  function quadro() {
    // Gira com a rolagem e a areia acompanha o progresso da galeria, os dois
    // suavizados; quando chegam ao alvo, o laço para até a próxima rolagem.
    const alvoGiro = window.scrollY * 0.0032;
    const estado = window.chronoGaleria;
    const alvoProgresso = estado ? Math.min(1, Math.max(0, estado.progresso || 0)) : 0;
    giro += (alvoGiro - giro) * 0.07;
    progresso += (alvoProgresso - progresso) * 0.08;

    ampulheta.rotation.y = giro;
    ampulheta.rotation.z = Math.sin(giro * 0.8) * 0.04;
    atualizarAreia(progresso);
    renderer.render(cena, camera);

    const parado = Math.abs(alvoGiro - giro) < 0.0005 && Math.abs(alvoProgresso - progresso) < 0.0005;
    if (parado || !visivel) {
      rodando = false;
      return;
    }
    requestAnimationFrame(quadro);
  }

  window.addEventListener("scroll", pedirQuadro, { passive: true });
  // landing-scroll.js chama isto a cada atualização da galeria (o scrub
  // continua mexendo na areia por um instante depois que a rolagem para)
  window.chronoGaleria = window.chronoGaleria || { progresso: 0 };
  window.chronoGaleria.aoMudar = pedirQuadro;

  new IntersectionObserver((entradas) => {
    visivel = entradas[0].isIntersecting;
    if (visivel) pedirQuadro();
  }, { rootMargin: "100px 0px" }).observe(palco);

  // Câmera recua em telas estreitas para a ampulheta caber inteira
  function redimensionar() {
    const largura = palco.clientWidth;
    const altura = palco.clientHeight;
    if (!largura || !altura) return;
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    const tanMeio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distancia = Math.max(2.15 / tanMeio, 1.45 / (tanMeio * camera.aspect));
    camera.position.set(0, distancia * 0.12, distancia);
    camera.lookAt(0, 0.05, 0);
    camera.updateProjectionMatrix();
    renderer.render(cena, camera);
  }
  new ResizeObserver(redimensionar).observe(palco);

  atualizarAreia(0);
  redimensionar();
  palco.classList.add("is-3d-ready");
  pedirQuadro();
}
