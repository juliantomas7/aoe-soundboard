class ParticleSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true,
            antialias: true 
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        document.getElementById('particles-container').appendChild(this.renderer.domElement);
        
        this.camera.position.z = 5;
        this.particles = [];
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.05,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        // Configurar Audio Context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        // Manejar resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.animate();
    }

    connectAudio(audioElement) {
        const source = this.audioContext.createMediaElementSource(audioElement);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    createParticles(x, y) {
        const numParticles = 50;
        const positions = new Float32Array(numParticles * 3);
        const velocities = [];
        const sizes = new Float32Array(numParticles);
        const originalSizes = new Float32Array(numParticles);

        for (let i = 0; i < numParticles; i++) {
            // Convertir coordenadas de pantalla a coordenadas 3D
            const screenX = (x / window.innerWidth) * 2 - 1;
            const screenY = -(y / window.innerHeight) * 2 + 1;

            const vector = new THREE.Vector3(screenX, screenY, 0);
            vector.unproject(this.camera);

            const idx = i * 3;
            positions[idx] = vector.x;
            positions[idx + 1] = vector.y;
            positions[idx + 2] = vector.z;

            const size = 0.05 + Math.random() * 0.05;
            sizes[i] = size;
            originalSizes[i] = size;

            velocities.push({
                x: (Math.random() - 0.5) * 0.05,
                y: Math.random() * 0.05,
                z: (Math.random() - 0.5) * 0.05,
                life: 1.0,
                originalSize: size
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0xFFD700) },
                opacity: { value: 1.0 }
            },
            vertexShader: `
                attribute float size;
                varying float vAlpha;
                void main() {
                    vAlpha = opacity;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vAlpha;
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5));
                    if (r > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.0, r);
                    gl_FragColor = vec4(color, vAlpha * alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const particles = {
            geometry,
            material,
            velocities,
            originalSizes,
            mesh: new THREE.Points(geometry, material)
        };

        this.scene.add(particles.mesh);
        this.particles.push(particles);

        // Eliminar partículas después de 2 segundos
        setTimeout(() => {
            this.scene.remove(particles.mesh);
            this.particles = this.particles.filter(p => p !== particles);
            particles.geometry.dispose();
            particles.material.dispose();
        }, 2000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Obtener datos de audio
        this.analyser.getByteFrequencyData(this.dataArray);
        const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
        const scale = 1 + (average / 255) * 0.5; // Factor de escala basado en el volumen

        // Actualizar partículas
        this.particles.forEach(particles => {
            const positions = particles.geometry.attributes.position.array;
            const sizes = particles.geometry.attributes.size.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                const velocity = particles.velocities[i];
                const idx = i * 3;

                positions[idx] += velocity.x;
                positions[idx + 1] += velocity.y;
                positions[idx + 2] += velocity.z;

                // Aplicar gravedad y fricción
                velocity.y -= 0.001;
                velocity.x *= 0.99;
                velocity.z *= 0.99;

                // Actualizar opacidad y tamaño
                velocity.life *= 0.98;
                particles.material.uniforms.opacity.value = velocity.life;
                
                // Ajustar tamaño basado en el audio
                sizes[i] = particles.originalSizes[i] * scale;
            }

            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Exportar la clase
window.ParticleSystem = ParticleSystem; 