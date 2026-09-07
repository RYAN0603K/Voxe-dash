const fs = require('fs');
let js = fs.readFileSync('voxe-dashboard/src/main.js', 'utf8');

const newBrainJS = `
// ==========================================
// DATA-DRIVEN BRAIN NETWORK (CRM LEADS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainRaycaster, brainMouse, brainControls, brainDragControls;
let leadParticlesGroup, hubParticlesGroup, connectionLines;
let nodeDataList = [];

function typeWriterEffect(elementId, text, speed, callback) {
    const el = document.getElementById(elementId);
    if(!el) return;
    el.innerHTML = '';
    el.classList.remove('opacity-0');
    let i = 0;
    function type() {
        if (i < text.length) {
            el.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }
    type();
}

function initBrain() {
    if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined' || typeof THREE.DragControls === 'undefined') { 
        setTimeout(initBrain, 500); 
        return; 
    }
    
    const container = document.getElementById('brain-container');
    if (!container) return;
    
    // Jarvis HUD Animation
    const mrr = crmData.filter(l => l.status === 'cliente').reduce((a, b) => a + (b.mensal || 0), 0);
    const ativos = crmData.filter(l => l.status === 'cliente').length;
    const leadsPropostas = crmData.filter(l => l.status === '1_reuniao' || l.status === '2_reuniao').length;
    
    document.getElementById('jarvis-stat-1').innerHTML = '';
    document.getElementById('jarvis-stat-2').innerHTML = '';
    document.getElementById('jarvis-stat-3').innerHTML = '';
    document.getElementById('jarvis-stat-4').innerHTML = '';

    typeWriterEffect('jarvis-greeting', '> BOM DIA, RYAN.', 40, () => {
        typeWriterEffect('jarvis-stat-1', '> SISTEMAS ONLINE. SINCRONIZANDO DADOS CRM...', 20, () => {
            setTimeout(() => {
                typeWriterEffect('jarvis-stat-2', '> TOTAL DE LEADS: ' + crmData.length, 15, () => {
                    typeWriterEffect('jarvis-stat-3', '> PROPOSTAS ABERTAS: ' + leadsPropostas, 15, () => {
                        typeWriterEffect('jarvis-stat-4', '> RECEITA ATIVA (MRR): ' + formatBRL(mrr), 15);
                    });
                });
            }, 300);
        });
    });
    
    if (brainInitialized) {
        buildDataNodes();
        return;
    }
    brainInitialized = true;

    brainScene = new THREE.Scene();
    brainCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 5000);
    brainCamera.position.z = 800;
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

    // OrbitControls
    brainControls = new THREE.OrbitControls(brainCamera, brainRenderer.domElement);
    brainControls.enableDamping = true;
    brainControls.dampingFactor = 0.05;
    brainControls.autoRotate = true;
    brainControls.autoRotateSpeed = 0.5;

    brainRaycaster = new THREE.Raycaster();
    brainRaycaster.params.Points.threshold = 15;
    brainMouse = new THREE.Vector2(-9999, -9999);

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        brainMouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        brainMouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;
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

    // DragControls
    brainDragControls = new THREE.DragControls(leadParticlesGroup.children, brainCamera, brainRenderer.domElement);
    brainDragControls.addEventListener('dragstart', function (event) {
        brainControls.enabled = false;
        brainControls.autoRotate = false;
        event.object.userData.isDragging = true;
        document.body.style.cursor = 'grabbing';
    });
    brainDragControls.addEventListener('dragend', function (event) {
        brainControls.enabled = true;
        brainControls.autoRotate = true;
        event.object.userData.isDragging = false;
        document.body.style.cursor = 'default';
        
        // Check if dropped near a hub
        const leadMesh = event.object;
        const leadNode = nodeDataList.find(n => n.mesh === leadMesh);
        if(!leadNode) return;
        
        let closestHub = null;
        let minDistance = 200; // Drop threshold
        
        nodeDataList.forEach(node => {
            if(node.type === 'hub') {
                const dist = leadMesh.position.distanceTo(node.mesh.position);
                if(dist < minDistance) {
                    minDistance = dist;
                    closestHub = node;
                }
            }
        });
        
        if (closestHub && closestHub !== leadNode.hubObj) {
            // Update Data!
            leadNode.hubObj = closestHub;
            const leadData = leadMesh.userData;
            leadData.statusLabel = closestHub.label;
            
            // Sync with CRM Data
            const crmItem = crmData.find(l => l.id === leadData.id);
            if(crmItem) {
                crmItem.status = closestHub.id;
                saveData(); // Save to local/supabase
            }
        }
        
        // Recalculate orbit from current dropped position
        const dx = leadMesh.position.x - leadNode.hubObj.mesh.position.x;
        const dz = leadMesh.position.z - leadNode.hubObj.mesh.position.z;
        leadNode.angle = Math.atan2(dz, dx);
        leadNode.orbitRadius = Math.sqrt(dx*dx + dz*dz);
        if(leadNode.orbitRadius < 40) leadNode.orbitRadius = 40;
    });

    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        brainControls.update();

        const time = Date.now() * 0.0005;
        nodeDataList.forEach((node, i) => {
            if(node.type === 'lead') {
                const hub = node.hubObj;
                if(hub && !node.mesh.userData.isDragging) {
                    node.angle += node.speed;
                    node.mesh.position.x = hub.mesh.position.x + Math.cos(node.angle) * node.orbitRadius;
                    node.mesh.position.y = hub.mesh.position.y + Math.sin(time + i) * 20;
                    node.mesh.position.z = hub.mesh.position.z + Math.sin(node.angle) * node.orbitRadius;
                }
            } else if (node.type === 'hub') {
                node.mesh.position.y = Math.sin(time + i * 10) * 30;
            }
        });

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

        let isHovering = false;
        
        // If not dragging, we show tooltip on hover
        if(!brainControls.enabled === false) {
            brainRaycaster.setFromCamera(brainMouse, brainCamera);
            const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
            const tooltip = document.getElementById('brain-tooltip');
            
            if (intersects.length > 0 && tooltip) {
                const hit = intersects[0];
                const leadData = hit.object.userData;
                if(leadData && leadData.type === 'lead' && !leadData.isDragging) {
                    isHovering = true;
                    document.body.style.cursor = 'grab';
                    const rect = container.getBoundingClientRect();
                    const vector = hit.object.position.clone();
                    vector.applyMatrix4(group.matrixWorld);
                    vector.project(brainCamera);
                    
                    const sx = (vector.x * .5 + .5) * container.clientWidth;
                    const sy = (vector.y * -.5 + .5) * container.clientHeight;
                    
                    tooltip.style.left = sx + 'px';
                    tooltip.style.top = sy + 'px';
                    tooltip.innerHTML = \`
                        <div class="text-[10px] text-emerald-400 font-bold mb-1 uppercase tracking-widest">\${leadData.statusLabel}</div>
                        <div class="text-base font-black">\${leadData.nome}</div>
                        <div class="text-slate-300 text-sm font-medium mt-0.5">\${formatBRL(leadData.mensal || 0)}</div>
                    \`;
                    tooltip.classList.remove('hidden');
                    tooltip.classList.add('opacity-100');
                    
                    hit.object.scale.set(3,3,3);
                    brainControls.autoRotate = false;
                }
            } else {
                document.body.style.cursor = 'default';
                if(tooltip) {
                    tooltip.classList.add('hidden');
                    tooltip.classList.remove('opacity-100');
                }
                leadParticlesGroup.children.forEach(c => { if(!c.userData.isDragging) c.scale.set(1,1,1); });
                brainControls.autoRotate = true;
            }
        }

        brainRenderer.render(brainScene, brainCamera);
    }
    animate();
}

function buildDataNodes() {
    while(leadParticlesGroup.children.length > 0) leadParticlesGroup.remove(leadParticlesGroup.children[0]);
    while(hubParticlesGroup.children.length > 0) hubParticlesGroup.remove(hubParticlesGroup.children[0]);
    while(connectionLines.children.length > 0) connectionLines.remove(connectionLines.children[0]);
    nodeDataList = [];

    // Sync IDs EXACTLY with Kanban COLUMNS
    const hubs = [
        { id: 'novo', label: 'Leads Novos', color: 0x00ffff, pos: new THREE.Vector3(-350, 0, -150) },
        { id: '1_reuniao', label: '1ª Reunião', color: 0xffea00, pos: new THREE.Vector3(-150, 0, 200) },
        { id: '2_reuniao', label: '2ª Reunião', color: 0xcc00ff, pos: new THREE.Vector3(100, 0, 250) },
        { id: 'cliente', label: 'Clientes Ativos', color: 0x00ff66, pos: new THREE.Vector3(350, 0, 0) },
        { id: 'perdido', label: 'Antigos', color: 0xff0055, pos: new THREE.Vector3(150, 0, -250) }
    ];

    const hubMap = {};
    hubs.forEach(h => {
        const geo = new THREE.SphereGeometry(15, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: h.color, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(h.pos);
        
        const haloGeo = new THREE.SphereGeometry(25, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: h.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        mesh.add(halo);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + h.color.toString(16).padStart(6, '0');
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(h.label.toUpperCase(), 128, 64);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(100, 50, 1);
        sprite.position.y = 40;
        mesh.add(sprite);

        hubParticlesGroup.add(mesh);
        
        const node = { type: 'hub', mesh: mesh, ...h };
        nodeDataList.push(node);
        hubMap[h.id] = node;
    });

    const linePositions = [];
    const lineColors = [];

    crmData.forEach((lead, i) => {
        const hubNode = hubMap[lead.status];
        if(!hubNode) return; // Ignore if status invalid

        const geo = new THREE.SphereGeometry(6, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 80;
        
        mesh.position.x = hubNode.mesh.position.x + Math.cos(angle) * radius;
        mesh.position.y = hubNode.mesh.position.y;
        mesh.position.z = hubNode.mesh.position.z + Math.sin(angle) * radius;
        
        mesh.userData = { type: 'lead', isDragging: false, ...lead, statusLabel: hubNode.label };
        leadParticlesGroup.add(mesh);

        nodeDataList.push({
            type: 'lead',
            mesh: mesh,
            hubObj: hubNode,
            angle: angle,
            orbitRadius: radius,
            speed: 0.005 + Math.random() * 0.01
        });

        linePositions.push(0,0,0, 0,0,0);
        const c = new THREE.Color(hubNode.color);
        lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    });

    if(linePositions.length > 0) {
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
        lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
        const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        connectionLines.add(lines);
    }

    // Bind DragControls if initialized
    if(brainDragControls) {
        brainDragControls.dispose();
        brainDragControls = new THREE.DragControls(leadParticlesGroup.children, brainCamera, brainRenderer.domElement);
        brainDragControls.addEventListener('dragstart', function (event) {
            brainControls.enabled = false;
            brainControls.autoRotate = false;
            event.object.userData.isDragging = true;
            document.body.style.cursor = 'grabbing';
        });
        brainDragControls.addEventListener('dragend', function (event) {
            brainControls.enabled = true;
            brainControls.autoRotate = true;
            event.object.userData.isDragging = false;
            document.body.style.cursor = 'default';
            
            const leadMesh = event.object;
            const leadNode = nodeDataList.find(n => n.mesh === leadMesh);
            if(!leadNode) return;
            
            let closestHub = null;
            let minDistance = 200; 
            
            nodeDataList.forEach(node => {
                if(node.type === 'hub') {
                    const dist = leadMesh.position.distanceTo(node.mesh.position);
                    if(dist < minDistance) {
                        minDistance = dist;
                        closestHub = node;
                    }
                }
            });
            
            if (closestHub && closestHub !== leadNode.hubObj) {
                leadNode.hubObj = closestHub;
                const leadData = leadMesh.userData;
                leadData.statusLabel = closestHub.label;
                
                const crmItem = crmData.find(l => l.id === leadData.id);
                if(crmItem) {
                    crmItem.status = closestHub.id;
                    saveData();
                }
            }
            
            const dx = leadMesh.position.x - leadNode.hubObj.mesh.position.x;
            const dz = leadMesh.position.z - leadNode.hubObj.mesh.position.z;
            leadNode.angle = Math.atan2(dz, dx);
            leadNode.orbitRadius = Math.sqrt(dx*dx + dz*dz);
            if(leadNode.orbitRadius < 40) leadNode.orbitRadius = 40;
        });
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

js = js.replace(/\/\/ ==========================================\r?\n\/\/ DATA-DRIVEN BRAIN NETWORK \(CRM LEADS\)[\s\S]*/, newBrainJS);
fs.writeFileSync('voxe-dashboard/src/main.js', js, 'utf8');
