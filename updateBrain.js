const fs = require('fs');
let js = fs.readFileSync('voxe-dashboard/src/main.js', 'utf8');

const newBrainJS = `
// ==========================================
// DATA-DRIVEN BRAIN NETWORK (CRM LEADS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainRaycaster, brainMouse;
let leadParticlesGroup, hubParticlesGroup, connectionLines;
let nodeDataList = [];

function initBrain() {
    if (typeof THREE === 'undefined') { setTimeout(initBrain, 500); return; }
    
    // We want to redraw if data changed, but for now let's just clear and redraw on every init
    const container = document.getElementById('brain-container');
    if (!container) return;
    
    if (brainInitialized) {
        // Just update data and return
        buildDataNodes();
        return;
    }
    brainInitialized = true;

    brainScene = new THREE.Scene();
    brainCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 5000);
    brainCamera.position.z = 1200;
    brainCamera.position.y = 300;
    
    const group = new THREE.Group();
    brainScene.add(group);

    leadParticlesGroup = new THREE.Group();
    hubParticlesGroup = new THREE.Group();
    connectionLines = new THREE.Group();
    
    group.add(leadParticlesGroup);
    group.add(hubParticlesGroup);
    group.add(connectionLines);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    brainRenderer.setPixelRatio(window.devicePixelRatio);
    brainRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(brainRenderer.domElement);

    brainRaycaster = new THREE.Raycaster();
    brainRaycaster.params.Points.threshold = 15;
    brainMouse = new THREE.Vector2(-9999, -9999);

    let mouseX = 0, mouseY = 0;
    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;
        brainMouse.x = mouseX;
        brainMouse.y = mouseY;
    });

    container.addEventListener('mouseleave', () => {
        brainMouse.x = -9999;
        brainMouse.y = -9999;
        const tooltip = document.getElementById('brain-tooltip');
        if(tooltip) {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('opacity-100');
        }
    });

    buildDataNodes();

    let angle = 0;
    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        angle += 0.002;
        group.rotation.y = angle;
        
        brainCamera.position.x += (mouseX * 400 - brainCamera.position.x) * 0.05;
        brainCamera.position.y += ((mouseY * 200 + 300) - brainCamera.position.y) * 0.05;
        brainCamera.lookAt(brainScene.position);

        // Update orbits
        const time = Date.now() * 0.0005;
        nodeDataList.forEach((node, i) => {
            if(node.type === 'lead') {
                const hub = node.hubObj;
                if(hub) {
                    node.angle += node.speed;
                    node.mesh.position.x = hub.mesh.position.x + Math.cos(node.angle) * node.orbitRadius;
                    node.mesh.position.y = hub.mesh.position.y + Math.sin(time + i) * 30; // slight vertical bob
                    node.mesh.position.z = hub.mesh.position.z + Math.sin(node.angle) * node.orbitRadius;
                }
            } else if (node.type === 'hub') {
                node.mesh.position.y = Math.sin(time + i * 10) * 50;
            }
        });

        // Update lines
        if (connectionLines.children.length > 0) {
            const lineMesh = connectionLines.children[0];
            const positions = lineMesh.geometry.attributes.position.array;
            let idx = 0;
            nodeDataList.forEach(node => {
                if(node.type === 'lead' && node.hubObj) {
                    positions[idx++] = node.mesh.position.x;
                    positions[idx++] = node.mesh.position.y;
                    positions[idx++] = node.mesh.position.z;
                    positions[idx++] = node.hubObj.mesh.position.x;
                    positions[idx++] = node.hubObj.mesh.position.y;
                    positions[idx++] = node.hubObj.mesh.position.z;
                }
            });
            lineMesh.geometry.attributes.position.needsUpdate = true;
        }

        // Raycasting for tooltip
        brainRaycaster.setFromCamera(brainMouse, brainCamera);
        // We only check intersections with lead particles
        const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
        const tooltip = document.getElementById('brain-tooltip');
        
        if (intersects.length > 0 && tooltip) {
            const hit = intersects[0];
            const leadData = hit.object.userData;
            if(leadData && leadData.type === 'lead') {
                document.body.style.cursor = 'pointer';
                const rect = container.getBoundingClientRect();
                // Map 3D pos back to 2D screen
                const vector = hit.object.position.clone();
                vector.applyMatrix4(group.matrixWorld);
                vector.project(brainCamera);
                
                const sx = (vector.x * .5 + .5) * container.clientWidth;
                const sy = (vector.y * -.5 + .5) * container.clientHeight;
                
                tooltip.style.left = sx + 'px';
                tooltip.style.top = sy + 'px';
                tooltip.innerHTML = \`<div class="text-xs text-emerald-400 font-bold mb-1">\${leadData.statusLabel.toUpperCase()}</div>
                                     <div class="text-lg font-black">\${leadData.nome}</div>
                                     <div class="text-slate-300 text-sm font-medium mt-1">\${formatBRL(leadData.mensal)}</div>\`;
                tooltip.classList.remove('hidden');
                tooltip.classList.add('opacity-100');
            }
        } else {
            document.body.style.cursor = 'default';
            if(tooltip) {
                tooltip.classList.add('hidden');
                tooltip.classList.remove('opacity-100');
            }
        }

        brainRenderer.render(brainScene, brainCamera);
    }
    animate();
}

function buildDataNodes() {
    // Clear old
    while(leadParticlesGroup.children.length > 0) leadParticlesGroup.remove(leadParticlesGroup.children[0]);
    while(hubParticlesGroup.children.length > 0) hubParticlesGroup.remove(hubParticlesGroup.children[0]);
    while(connectionLines.children.length > 0) connectionLines.remove(connectionLines.children[0]);
    nodeDataList = [];

    const hubs = [
        { id: 'novo', label: 'Leads Novos', color: 0x94a3b8, pos: new THREE.Vector3(-400, 0, -200) },
        { id: '1_reuniao', label: '1ª Reunião', color: 0xfbbf24, pos: new THREE.Vector3(-200, 0, 200) },
        { id: '2_reuniao', label: '2ª Reunião', color: 0xa78bfa, pos: new THREE.Vector3(100, 0, 300) },
        { id: 'cliente', label: 'Clientes Ativos', color: 0x10b981, pos: new THREE.Vector3(400, 0, 0) },
        { id: 'perdido', label: 'Antigos', color: 0xf87171, pos: new THREE.Vector3(200, 0, -300) }
    ];

    // Create Hub spheres
    const hubMap = {};
    hubs.forEach(h => {
        const geo = new THREE.SphereGeometry(15, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: h.color, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(h.pos);
        
        // Add a glow/halo
        const haloGeo = new THREE.SphereGeometry(25, 16, 16);
        const haloMat = new THREE.MeshBasicMaterial({ color: h.color, transparent: true, opacity: 0.2, wireframe: true });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        mesh.add(halo);

        hubParticlesGroup.add(mesh);
        
        const node = { type: 'hub', mesh: mesh, ...h };
        nodeDataList.push(node);
        hubMap[h.id] = node;
    });

    // Create Lead spheres
    const linePositions = [];
    const lineColors = [];

    crmData.forEach((lead, i) => {
        const hubNode = hubMap[lead.status];
        if(!hubNode) return;

        const geo = new THREE.SphereGeometry(4, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geo, mat);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 100;
        
        mesh.position.x = hubNode.mesh.position.x + Math.cos(angle) * radius;
        mesh.position.y = hubNode.mesh.position.y;
        mesh.position.z = hubNode.mesh.position.z + Math.sin(angle) * radius;
        
        mesh.userData = { type: 'lead', ...lead, statusLabel: hubNode.label };
        leadParticlesGroup.add(mesh);

        nodeDataList.push({
            type: 'lead',
            mesh: mesh,
            hubObj: hubNode,
            angle: angle,
            orbitRadius: radius,
            speed: 0.002 + Math.random() * 0.005 * (Math.random()>0.5?1:-1)
        });

        // Line placeholders
        linePositions.push(0,0,0, 0,0,0);
        
        const c = new THREE.Color(hubNode.color);
        lineColors.push(c.r, c.g, c.b, c.r*0.2, c.g*0.2, c.b*0.2); // Fade towards center
    });

    if(linePositions.length > 0) {
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
        lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
        const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3 });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        connectionLines.add(lines);
    }
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
`;

js = js.replace(/\/\/ ==========================================\r?\n\/\/ BRAIN NETWORK \(JARVIS PLEXUS\)[\s\S]*?\/\/ ==========================================\r?\n\/\/ ROUTES & BOOT/, newBrainJS + '\n// ==========================================\n// ROUTES & BOOT');
fs.writeFileSync('voxe-dashboard/src/main.js', js, 'utf8');
