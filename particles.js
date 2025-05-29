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
        
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.1,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        // Manejar resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.animate();
    }

    createParticles(x, y) {
        const numParticles = 100; // Aumentamos el número de partículas
        const positions = new Float32Array(numParticles * 3);
        const velocities = [];

        for (let i = 0; i < numParticles; i++) {
            const screenX = (x / window.innerWidth) * 2 - 1;
            const screenY = -(y / window.innerHeight) * 2 + 1;

            const vector = new THREE.Vector3(screenX, screenY, 0);
            vector.unproject(this.camera);

            const idx = i * 3;
            positions[idx] = vector.x;
            positions[idx + 1] = vector.y;
            positions[idx + 2] = vector.z;

            velocities.push({
                x: (Math.random() - 0.5) * 0.1, // Aumentamos la velocidad
                y: Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.1,
                life: 1.0
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = this.particleMaterial.clone();
        material.size = 0.1;
        
        const particles = {
            geometry,
            material,
            velocities,
            mesh: new THREE.Points(geometry, material)
        };

        this.scene.add(particles.mesh);
        this.particles.push(particles);

        // Eliminar partículas después de 1.5 segundos
        setTimeout(() => {
            this.scene.remove(particles.mesh);
            this.particles = this.particles.filter(p => p !== particles);
            particles.geometry.dispose();
            particles.material.dispose();
        }, 1500);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Actualizar partículas
        this.particles.forEach(particles => {
            const positions = particles.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                const velocity = particles.velocities[i];
                const idx = i * 3;

                positions[idx] += velocity.x;
                positions[idx + 1] += velocity.y;
                positions[idx + 2] += velocity.z;

                // Aplicar gravedad y fricción
                velocity.y -= 0.003; // Aumentamos la gravedad
                velocity.x *= 0.99;
                velocity.z *= 0.99;

                // Actualizar opacidad
                velocity.life *= 0.98;
                particles.material.opacity = velocity.life;
            }

            particles.geometry.attributes.position.needsUpdate = true;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Exportar la clase
window.ParticleSystem = ParticleSystem; 