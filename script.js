document.addEventListener('DOMContentLoaded', () => {
    const soundboard = document.querySelector('.soundboard');
    const buttons = document.querySelectorAll('.sound-button');
    const editButton = document.querySelector('.edit-button');
    const loadingScreen = document.querySelector('.loading-screen');
    const container = document.querySelector('.container');
    const mouths = {
        base: document.querySelector('.character-base'),
        closed: document.querySelector('.mouth-closed'),
        half: document.querySelector('.mouth-half'),
        midOpen: document.querySelector('.mouth-mid-open'),
        open: document.querySelector('.mouth-open')
    };
    const eyes = {
        closed: document.querySelector('.eyes-closed'),
        user: document.querySelector('.eyes-user')
    };
    const audioElements = new Map();
    let sortableInstance = null;
    let isEditMode = false;
    let currentMouthInterval = null;
    let blinkTimeout = null;
    let userEyesTimeout = null;
    let loadedSounds = 0;
    const totalSounds = buttons.length;

    // Inicializar sistema de partículas
    const particleSystem = new ParticleSystem();

    // Prevenir scroll del body
    document.body.classList.add('no-scroll');

    // Iniciar el parpadeo inmediatamente
    scheduleNextBlink();

    // Prevenir scroll en iOS
    document.addEventListener('touchmove', (e) => {
        if (!container.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });

    function setActiveMouth(type) {
        Object.values(mouths).forEach(mouth => mouth.classList.remove('active'));
        mouths[type].classList.add('active');
    }

    function setActiveEyes(type) {
        Object.values(eyes).forEach(eye => eye.classList.remove('active'));
        if (type) {
            eyes[type].classList.add('active');
        }
    }

    function getRandomMouth() {
        const mouthStates = ['closed', 'half', 'midOpen', 'open'];
        const weights = [25, 30, 30, 15]; // Ajustado las probabilidades
        const random = Math.random() * 100;
        let sum = 0;
        
        for (let i = 0; i < weights.length; i++) {
            sum += weights[i];
            if (random <= sum) {
                return mouthStates[i];
            }
        }
        return 'closed';
    }

    function blink() {
        // Duración del parpadeo
        setActiveEyes('closed');
        setTimeout(() => {
            setActiveEyes(null);
        }, 150);
    }

    function scheduleNextBlink() {
        // Parpadeo normal cada 2-6 segundos
        const nextBlinkDelay = Math.random() * (6000 - 2000) + 2000;
        blinkTimeout = setTimeout(() => {
            // 20% de probabilidad de ojos de usuario en lugar de parpadeo normal
            if (Math.random() < 0.2) {
                setActiveEyes('user');
                // Mantener ojos de usuario por 0.5-1.5 segundos
                userEyesTimeout = setTimeout(() => {
                    setActiveEyes(null);
                    scheduleNextBlink();
                }, Math.random() * (1500 - 500) + 500);
            } else {
                blink();
                scheduleNextBlink();
            }
        }, nextBlinkDelay);
    }

    function animateMouth(audio) {
        if (currentMouthInterval) {
            clearInterval(currentMouthInterval);
        }
        if (blinkTimeout) {
            clearTimeout(blinkTimeout);
        }
        if (userEyesTimeout) {
            clearTimeout(userEyesTimeout);
        }

        let lastMouth = 'closed';
        
        function updateMouth() {
            const newMouth = getRandomMouth();
            if (newMouth !== lastMouth) {
                setActiveMouth(newMouth);
                lastMouth = newMouth;
            }
        }

        const getRandomInterval = () => Math.floor(Math.random() * (100 - 50) + 50);
        
        updateMouth(); // Comenzar inmediatamente
        
        function scheduleNextUpdate() {
            updateMouth();
            currentMouthInterval = setTimeout(scheduleNextUpdate, getRandomInterval());
        }

        setTimeout(scheduleNextUpdate, 50); // Comenzar las actualizaciones rápidamente

        audio.addEventListener('ended', () => {
            if (currentMouthInterval) {
                clearTimeout(currentMouthInterval);
            }
            setActiveMouth('closed');
            scheduleNextBlink();
            currentMouthInterval = null;
        });
    }

    // Función para activar/desactivar el modo de edición
    function toggleEditMode() {
        isEditMode = !isEditMode;
        soundboard.classList.toggle('edit-mode');
        editButton.classList.toggle('active');
        editButton.textContent = isEditMode ? 'LISTO' : 'EDITAR';

        if (isEditMode) {
            sortableInstance = new Sortable(soundboard, {
                animation: 300,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                onStart: function(evt) {
                    document.body.style.cursor = 'grabbing';
                    soundboard.style.cursor = 'grabbing';
                },
                onEnd: function(evt) {
                    document.body.style.cursor = 'default';
                    soundboard.style.cursor = 'default';
                    const order = Array.from(soundboard.children).map(button => button.dataset.sound);
                    localStorage.setItem('buttonOrder', JSON.stringify(order));
                }
            });
        } else {
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
            }
        }
    }

    // Event listener para el botón de edición
    editButton.addEventListener('click', toggleEditMode);

    // Restaurar el orden guardado
    const savedOrder = localStorage.getItem('buttonOrder');
    if (savedOrder) {
        const order = JSON.parse(savedOrder);
        const buttonArray = Array.from(buttons);
        order.forEach((soundName) => {
            const button = buttonArray.find(btn => btn.dataset.sound === soundName);
            if (button) {
                soundboard.appendChild(button);
            }
        });
    }

    // Precarga y manejo de audio
    buttons.forEach(button => {
        const soundName = button.dataset.sound;
        const audio = new Audio();
        
        audio.addEventListener('canplaythrough', () => {
            loadedSounds++;
            if (loadedSounds === totalSounds) {
                loadingScreen.classList.add('hidden');
            }
        }, { once: true });

        audio.src = `sounds/${soundName}.mp3`;
        audioElements.set(button, audio);

        // Conectar el audio al sistema de partículas la primera vez que se reproduce
        let isFirstPlay = true;

        button.addEventListener('click', (e) => {
            if (isEditMode) {
                e.preventDefault();
                return;
            }

            // Crear partículas en la posición del clic
            const rect = button.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            particleSystem.createParticles(x, y);

            audioElements.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            buttons.forEach(btn => btn.classList.remove('playing'));
            
            const currentAudio = audioElements.get(button);

            // Conectar el audio al sistema de partículas solo la primera vez
            if (isFirstPlay) {
                particleSystem.connectAudio(currentAudio);
                isFirstPlay = false;
            }
            
            const playPromise = currentAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Error reproduciendo audio:", error);
                });
            }
            
            button.classList.add('playing');
            animateMouth(currentAudio);

            currentAudio.onended = () => {
                button.classList.remove('playing');
            };
        });
    });

    // Efecto de hover con sonido de "clic"
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
    });
}); 