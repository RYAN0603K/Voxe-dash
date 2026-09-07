import os
import re

html_path = 'voxe-dashboard/index.html'
js_path = 'voxe-dashboard/src/main.js'

with open(html_path, 'r', encoding='utf8') as f:
    html = f.read()

# 1. Remove Cofre de Dados button
html = re.sub(r'<button onclick="changePage\(''configuracoes''\)".*?</button>', '', html, flags=re.DOTALL)

# 2. Remove Cofre de Dados page
html = re.sub(r'<div id="page-configuracoes".*?</main>', '</main>', html, flags=re.DOTALL)

# 3. Add Cérebro button
navAgenda = '<button onclick="changePage(''agenda'')" id="nav-agenda"'
navCerebro = '''
            <button onclick="changePage('cerebro')" id="nav-cerebro" class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all group">
                <i data-lucide="brain-circuit" class="w-5 h-5 group-hover:scale-110 transition-transform"></i> <span class="font-semibold text-sm tracking-wide">Cérebro Jarvis</span>
            </button>
'''
html = html.replace(navAgenda, navCerebro + '            ' + navAgenda)

# 4. Add Cérebro Page
pageAgenda = '<div id="page-agenda" class="page-content">'
pageCerebro = '''
            <!-- PAGE: CEREBRO -->
            <div id="page-cerebro" class="page-content">
                <div class="mb-10 flex justify-between items-start">
                    <div>
                        <h1 class="text-4xl font-extrabold tracking-tight mb-2">Cérebro <span class="text-gradient">Voxe</span></h1>
                        <p class="text-slate-500 dark:text-slate-400 font-medium">Análise e conexões em tempo real do sistema.</p>
                    </div>
                    <button onclick="toggleSidebar()" class="md:hidden p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-md text-slate-700 dark:text-slate-200"><i data-lucide="menu" class="w-6 h-6"></i></button>
                </div>
                
                <div class="glass-panel rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden p-6 relative">
                    <div class="absolute inset-0 z-0 bg-black/90 pointer-events-none rounded-3xl mix-blend-multiply"></div>
                    <div class="absolute top-8 left-8 z-10 flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-emerald-400 font-mono text-sm">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SISTEMA ONLINE
                        </div>
                        <h3 class="text-white font-bold text-xl font-mono">REDE NEURAL ATIVA</h3>
                    </div>
                    <div id="brain-container" class="w-full h-[60vh] min-h-[400px] rounded-2xl overflow-hidden cursor-crosshair"></div>
                </div>
            </div>
'''
html = html.replace(pageAgenda, pageCerebro + '            ' + pageAgenda)

# 5. Fix Layout for all headers
html = re.sub(r'<div class="mb-10 flex justify-between items-start">\s*<h1([^>]*)>(.*?)</h1>\s*<p([^>]*)>(.*?)</p>\s*</div>', 
    r'<div class="mb-10 flex justify-between items-start">\n    <div>\n        <h1\1>\2</h1>\n        <p\3>\4</p>\n    </div>\n</div>', html)

# 6. Add Three.js
html = html.replace('</head>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n</head>')

with open(html_path, 'w', encoding='utf8') as f:
    f.write(html)


with open(js_path, 'r', encoding='utf8') as f:
    js = f.read()

# 1. Remove Auto-login
js = re.sub(r'function initLogin\(\) \{.*?initLogin\(\);', '// Auto-login desativado', js, flags=re.DOTALL)
js = re.sub(r'// Also auto-init if already logged in!.*?100\);\s*\}', '', js, flags=re.DOTALL)

# 2. Add Plexus Logic
plexusJS = '''
// ==========================================
// BRAIN NETWORK (JARVIS PLEXUS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainParticles, brainLines, brainLinePositions, brainLineColors;
let brainParticlesData = [];
const maxParticleCount = 250;
const particleCount = 150;
const r = 800; 

function initBrain() {
    if (brainInitialized) return;
    if (typeof THREE === 'undefined') { setTimeout(initBrain, 500); return; }
    brainInitialized = true;
    const container = document.getElementById('brain-container');
    if (!container) return;

    brainScene = new THREE.Scene();
    brainCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 4000);
    brainCamera.position.z = 1750;
    const group = new THREE.Group();
    brainScene.add(group);

    const pMaterial = new THREE.PointsMaterial({
        color: 0x34d399, size: 5, blending: THREE.AdditiveBlending, transparent: true, sizeAttenuation: true
    });

    const particles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(maxParticleCount * 3);
    for (let i = 0; i < maxParticleCount; i++) {
        particlePositions[i * 3] = Math.random() * r - r / 2;
        particlePositions[i * 3 + 1] = Math.random() * r - r / 2;
        particlePositions[i * 3 + 2] = Math.random() * r - r / 2;
        brainParticlesData.push({
            velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2).normalize().multiplyScalar(Math.random() * 2 + 0.5),
            numConnections: 0
        });
    }

    particles.setDrawRange(0, particleCount);
    particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    brainParticles = new THREE.Points(particles, pMaterial);
    group.add(brainParticles);

    const segments = maxParticleCount * maxParticleCount;
    brainLinePositions = new Float32Array(segments * 3);
    brainLineColors = new Float32Array(segments * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(brainLinePositions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(brainLineColors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.computeBoundingSphere();
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8 });
    brainLines = new THREE.LineSegments(geometry, material);
    group.add(brainLines);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    brainRenderer.setPixelRatio(window.devicePixelRatio);
    brainRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(brainRenderer.domElement);

    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        group.rotation.y += 0.002;
        group.rotation.x += 0.001;
        
        brainCamera.position.x += (mouseX * 500 - brainCamera.position.x) * 0.05;
        brainCamera.position.y += (mouseY * 500 - brainCamera.position.y) * 0.05;
        brainCamera.lookAt(brainScene.position);

        let vertexpos = 0, colorpos = 0, numConnected = 0;
        for (let i = 0; i < particleCount; i++) brainParticlesData[i].numConnections = 0;

        for (let i = 0; i < particleCount; i++) {
            const particleData = brainParticlesData[i];
            particlePositions[i * 3] += particleData.velocity.x;
            particlePositions[i * 3 + 1] += particleData.velocity.y;
            particlePositions[i * 3 + 2] += particleData.velocity.z;

            if (particlePositions[i * 3 + 1] < -r / 2 || particlePositions[i * 3 + 1] > r / 2) particleData.velocity.y = -particleData.velocity.y;
            if (particlePositions[i * 3] < -r / 2 || particlePositions[i * 3] > r / 2) particleData.velocity.x = -particleData.velocity.x;
            if (particlePositions[i * 3 + 2] < -r / 2 || particlePositions[i * 3 + 2] > r / 2) particleData.velocity.z = -particleData.velocity.z;

            for (let j = i + 1; j < particleCount; j++) {
                const particleDataB = brainParticlesData[j];
                const dx = particlePositions[i * 3] - particlePositions[j * 3];
                const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
                const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 150) {
                    particleData.numConnections++;
                    particleDataB.numConnections++;

                    brainLinePositions[vertexpos++] = particlePositions[i * 3];
                    brainLinePositions[vertexpos++] = particlePositions[i * 3 + 1];
                    brainLinePositions[vertexpos++] = particlePositions[i * 3 + 2];

                    brainLinePositions[vertexpos++] = particlePositions[j * 3];
                    brainLinePositions[vertexpos++] = particlePositions[j * 3 + 1];
                    brainLinePositions[vertexpos++] = particlePositions[j * 3 + 2];

                    const alpha = 1.0 - dist / 150;
                    brainLineColors[colorpos++] = 0.05;
                    brainLineColors[colorpos++] = 0.5 + (0.5 * alpha);
                    brainLineColors[colorpos++] = 0.8;

                    brainLineColors[colorpos++] = 0.05;
                    brainLineColors[colorpos++] = 0.5 + (0.5 * alpha);
                    brainLineColors[colorpos++] = 0.8;
                    
                    numConnected++;
                }
            }
        }

        brainLines.geometry.setDrawRange(0, numConnected * 2);
        brainLines.geometry.attributes.position.needsUpdate = true;
        brainLines.geometry.attributes.color.needsUpdate = true;
        brainParticles.geometry.attributes.position.needsUpdate = true;

        brainRenderer.render(brainScene, brainCamera);
    }
    animate();
}

window.addEventListener('resize', () => {
    if(brainRenderer && brainCamera) {
        const container = document.getElementById('brain-container');
        if(container) {
            brainCamera.aspect = container.clientWidth / container.clientHeight;
            brainCamera.updateProjectionMatrix();
            brainRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
});
'''
js = re.sub(r'// ==========================================\r?\n// ROUTES & BOOT', plexusJS + '\n\n// ==========================================\n// ROUTES & BOOT', js)
js = re.sub(r"if\(pageId === 'funil'\) \{", "if(pageId === 'funil') {\n                setTimeout(renderKanban, 50);\n            }\n            if(pageId === 'cerebro') {\n                setTimeout(initBrain, 50);\n            }\n            if(false) {", js)

with open(js_path, 'w', encoding='utf8') as f:
    f.write(js)
