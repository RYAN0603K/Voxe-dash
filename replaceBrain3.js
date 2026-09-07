const fs = require('fs');
let js = fs.readFileSync('voxe-dashboard/src/main.js', 'utf8');

const newBrainJS = `
// ==========================================
// DATA-DRIVEN BRAIN NETWORK (CRM LEADS)
// ==========================================
let brainInitialized = false;
let brainScene, brainCamera, brainRenderer, brainRaycaster, brainMouse, brainControls;
let leadParticlesGroup, hubParticlesGroup;
let brainLines, brainLinePositions, brainLineColors;
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
    if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') { 
        setTimeout(initBrain, 500); 
        return; 
    }
    
    const container = document.getElementById('brain-container');
    if (!container) return;
    
    // Jarvis HUD Animation
    const mrr = crmData.filter(l => l.status === 'cliente').reduce((a, b) => a + (b.mensal || 0), 0);
    const leadsPropostas = crmData.filter(l => l.status === '1_reuniao' || l.status === '2_reuniao').length;
    
    document.getElementById('jarvis-stat-1').innerHTML = '';
    document.getElementById('jarvis-stat-2').innerHTML = '';
    document.getElementById('jarvis-stat-3').innerHTML = '';
    document.getElementById('jarvis-stat-4').innerHTML = '';

    const hour = new Date().getHours();
    let greeting = '> BOA NOITE, RYAN.';
    if (hour >= 5 && hour < 12) greeting = '> BOM DIA, RYAN.';
    else if (hour >= 12 && hour < 18) greeting = '> BOA TARDE, RYAN.';

    fetch('https://api.open-meteo.com/v1/forecast?latitude=-23.67&longitude=-46.77&current_weather=true')
      .then(r => r.json())
      .then(data => {
          const temp = data.current_weather ? data.current_weather.temperature + '°C' : 'OFFLINE';
          typeWriterEffect('jarvis-greeting', greeting, 40, () => {
              typeWriterEffect('jarvis-stat-1', '> SISTEMAS ONLINE. JD MITSUTANI: ' + temp + '.', 20, () => {
                  setTimeout(() => {
                      typeWriterEffect('jarvis-stat-2', '> TOTAL DE LEADS: ' + crmData.length, 15, () => {
                          typeWriterEffect('jarvis-stat-3', '> PROPOSTAS ABERTAS: ' + leadsPropostas, 15, () => {
                              typeWriterEffect('jarvis-stat-4', '> RECEITA ATIVA (MRR): ' + formatBRL(mrr), 15);
                          });
                      });
                  }, 300);
              });
          });
      })
      .catch(() => {
          typeWriterEffect('jarvis-greeting', greeting, 40, () => {
              typeWriterEffect('jarvis-stat-1', '> SISTEMAS ONLINE. SINCRONIZANDO DADOS...', 20, () => {
                  setTimeout(() => {
                      typeWriterEffect('jarvis-stat-2', '> TOTAL DE LEADS: ' + crmData.length, 15, () => {
                          typeWriterEffect('jarvis-stat-3', '> PROPOSTAS ABERTAS: ' + leadsPropostas, 15, () => {
                              typeWriterEffect('jarvis-stat-4', '> RECEITA ATIVA (MRR): ' + formatBRL(mrr), 15);
                          });
                      });
                  }, 300);
              });
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
    group.add(leadParticlesGroup);
    group.add(hubParticlesGroup);

    // Neural Plexus Lines
    const maxLines = 1000 * 1000; 
    brainLinePositions = new Float32Array(maxLines * 3);
    brainLineColors = new Float32Array(maxLines * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(brainLinePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(brainLineColors, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    brainLines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(brainLines);

    brainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    brainRenderer.setPixelRatio(window.devicePixelRatio);
    brainRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(brainRenderer.domElement);

    brainControls = new THREE.OrbitControls(brainCamera, brainRenderer.domElement);
    brainControls.enableDamping = true;
    brainControls.dampingFactor = 0.05;
    brainControls.autoRotate = true;
    brainControls.autoRotateSpeed = 0.5;

    brainRaycaster = new THREE.Raycaster();
    brainRaycaster.params.Points.threshold = 15;
    brainMouse = new THREE.Vector2(-9999, -9999);

    let draggedNode = null;
    let dragPlane = new THREE.Plane();
    let dragIntersection = new THREE.Vector3();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        brainMouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
        brainMouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

        if (draggedNode) {
            brainRaycaster.setFromCamera(brainMouse, brainCamera);
            brainRaycaster.ray.intersectPlane(dragPlane, dragIntersection);
            draggedNode.targetPos.copy(dragIntersection);
        }
    });

    container.addEventListener('mousedown', (e) => {
        brainRaycaster.setFromCamera(brainMouse, brainCamera);
        const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
        if (intersects.length > 0) {
            brainControls.enabled = false;
            brainControls.autoRotate = false;
            document.body.style.cursor = 'grabbing';
            const mesh = intersects[0].object;
            draggedNode = nodeDataList.find(n => n.mesh === mesh);
            if (draggedNode) {
                draggedNode.isDragging = true;
                draggedNode.targetPos = mesh.position.clone();
                // Create a plane facing camera to drag upon
                const camDir = new THREE.Vector3();
                brainCamera.getWorldDirection(camDir);
                dragPlane.setFromNormalAndCoplanarPoint(camDir, mesh.position);
            }
        }
    });

    container.addEventListener('mouseup', (e) => {
        if (draggedNode) {
            brainControls.enabled = true;
            brainControls.autoRotate = true;
            document.body.style.cursor = 'default';
            draggedNode.isDragging = false;

            const leadMesh = draggedNode.mesh;
            let closestHub = null;
            let minDistance = 250; 
            
            nodeDataList.forEach(node => {
                if(node.type === 'hub') {
                    const dist = leadMesh.position.distanceTo(node.mesh.position);
                    if(dist < minDistance) {
                        minDistance = dist;
                        closestHub = node;
                    }
                }
            });
            
            if (closestHub && closestHub !== draggedNode.hubObj) {
                draggedNode.hubObj = closestHub;
                draggedNode.mesh.userData.statusLabel = closestHub.label;
                
                const crmItem = crmData.find(l => l.id === draggedNode.mesh.userData.id);
                if (crmItem) {
                    crmItem.status = closestHub.id;
                    saveData();
                }
            }
            
            // Recalc orbit to resume from dropped spot seamlessly
            const dx = leadMesh.position.x - draggedNode.hubObj.mesh.position.x;
            const dz = leadMesh.position.z - draggedNode.hubObj.mesh.position.z;
            draggedNode.angle = Math.atan2(dz, dx);
            draggedNode.orbitRadius = Math.sqrt(dx*dx + dz*dz);
            if(draggedNode.orbitRadius < 50) draggedNode.orbitRadius = 50;

            draggedNode = null;
        }
    });

    container.addEventListener('mouseleave', () => {
        brainMouse.x = -9999;
        brainMouse.y = -9999;
        const tooltip = document.getElementById('brain-tooltip');
        if(tooltip) {
            tooltip.classList.add('hidden');
            tooltip.classList.remove('opacity-100');
        }
        if (draggedNode) {
            brainControls.enabled = true;
            brainControls.autoRotate = true;
            document.body.style.cursor = 'default';
            draggedNode.isDragging = false;
            draggedNode = null;
        }
    });

    buildDataNodes();

    function animate() {
        requestAnimationFrame(animate);
        if (!document.getElementById('page-cerebro').classList.contains('active')) return;

        brainControls.update();
        const time = Date.now() * 0.0005;

        // Fluid Physics & Orbits
        nodeDataList.forEach((node, i) => {
            if(node.type === 'lead') {
                if (node.isDragging && node.targetPos) {
                    // Fluid delayzinho (spring physics)
                    node.mesh.position.lerp(node.targetPos, 0.15);
                } else {
                    // Smoothly orbit around hub
                    const hub = node.hubObj;
                    if(hub) {
                        node.angle += node.speed;
                        const tx = hub.mesh.position.x + Math.cos(node.angle) * node.orbitRadius;
                        const ty = hub.mesh.position.y + Math.sin(time + i) * 20;
                        const tz = hub.mesh.position.z + Math.sin(node.angle) * node.orbitRadius;
                        // Lerp to orbit target gives fluid return when dropped!
                        node.mesh.position.lerp(new THREE.Vector3(tx, ty, tz), 0.05);
                    }
                }
            } else if (node.type === 'hub') {
                node.mesh.position.y = Math.sin(time + i * 10) * 30;
            }
        });

        // Neural Interconnections (Plexus)
        let vPos = 0;
        let cPos = 0;
        let numConn = 0;
        const connectionDist = 180;

        for (let i = 0; i < nodeDataList.length; i++) {
            for (let j = i + 1; j < nodeDataList.length; j++) {
                const n1 = nodeDataList[i];
                const n2 = nodeDataList[j];
                const dist = n1.mesh.position.distanceTo(n2.mesh.position);
                
                if (dist < connectionDist) {
                    brainLinePositions[vPos++] = n1.mesh.position.x;
                    brainLinePositions[vPos++] = n1.mesh.position.y;
                    brainLinePositions[vPos++] = n1.mesh.position.z;
                    brainLinePositions[vPos++] = n2.mesh.position.x;
                    brainLinePositions[vPos++] = n2.mesh.position.y;
                    brainLinePositions[vPos++] = n2.mesh.position.z;

                    // White Lines for neuron effect
                    const alpha = 1.0 - (dist / connectionDist);
                    brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0;
                    brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0; brainLineColors[cPos++] = 1.0;
                    
                    numConn++;
                }
            }
        }
        brainLines.geometry.setDrawRange(0, numConn * 2);
        brainLines.geometry.attributes.position.needsUpdate = true;
        brainLines.geometry.attributes.color.needsUpdate = true;

        // Hover Tooltip
        if(!draggedNode) {
            brainRaycaster.setFromCamera(brainMouse, brainCamera);
            const intersects = brainRaycaster.intersectObjects(leadParticlesGroup.children);
            const tooltip = document.getElementById('brain-tooltip');
            
            if (intersects.length > 0 && tooltip) {
                const hit = intersects[0];
                const leadData = hit.object.userData;
                if(leadData) {
                    document.body.style.cursor = 'grab';
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
                    
                    hit.object.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.2);
                    brainControls.autoRotate = false;
                }
            } else {
                document.body.style.cursor = 'default';
                if(tooltip) {
                    tooltip.classList.add('hidden');
                    tooltip.classList.remove('opacity-100');
                }
                leadParticlesGroup.children.forEach(c => c.scale.lerp(new THREE.Vector3(1,1,1), 0.1));
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
    nodeDataList = [];

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

    crmData.forEach((lead, i) => {
        const hubNode = hubMap[lead.status];
        if(!hubNode) return;

        const geo = new THREE.SphereGeometry(12, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
        const mesh = new THREE.Mesh(geo, mat);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 60 + Math.random() * 80;
        
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
            speed: 0.005 + Math.random() * 0.01
        });
    });
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
