// ==============================================
// SILENT HILL: APRENDIENDO HTML - LÓGICA COMPLETA
// ==============================================

// --- Variables Globales ---
let currentLevel = 1;
let score = 0;
const totalLevels = 6;
let audioContext = null;
let gameCompleted = false;

// --- Elementos DOM ---
const levelDisplay = document.getElementById('level-display');
const scoreDisplay = document.getElementById('score-display');
const taskContainer = document.getElementById('task-container');
const narrative = document.getElementById('narrative');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-answer');
const nextBtn = document.getElementById('next-level');
const feedback = document.getElementById('feedback-message');
const manualPanel = document.getElementById('manual-panel');
const closeManualBtn = document.getElementById('close-manual');
const btnManual = document.getElementById('btn-manual');
const btnAutism = document.getElementById('btn-autism-mode');
const btnEpilepsy = document.getElementById('btn-epilepsy-mode');

// --- Elementos DOM multimedia ---
const levelImage = document.getElementById('level-image');
const levelImageContainer = document.getElementById('level-image-container');
const levelVideoContainer = document.getElementById('level-video-container');
const levelVideoFrame = document.getElementById('level-video-frame');

// ==============================================
// SONIDOS (Web Audio API)
// ==============================================
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.log('Audio no soportado en este navegador'); }
    }
}

function playSound(type) {
    try {
        if (!audioContext) { initAudio(); if (!audioContext) return; }
        if (audioContext.state === 'suspended') audioContext.resume();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch(type) {
            case 'correct':
                oscillator.frequency.value = 523.25;
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                oscillator.start();
                setTimeout(() => oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime), 150);
                setTimeout(() => oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime), 300);
                setTimeout(() => {
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    oscillator.stop(audioContext.currentTime + 0.5);
                }, 450);
                break;
            case 'wrong':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                oscillator.start();
                setTimeout(() => {
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                    oscillator.stop(audioContext.currentTime + 0.8);
                }, 400);
                break;
            case 'levelup':
                const notes = [523.25, 587.33, 659.25, 783.99];
                notes.forEach((freq, i) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.15);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.4);
                    osc.start(audioContext.currentTime + i * 0.15);
                    osc.stop(audioContext.currentTime + i * 0.15 + 0.4);
                });
                break;
            case 'ambient':
                const bufferSize = 2 * audioContext.sampleRate;
                const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;
                const noise = audioContext.createBufferSource();
                noise.buffer = buffer;
                const gainNoise = audioContext.createGain();
                gainNoise.gain.setValueAtTime(0.08, audioContext.currentTime);
                noise.connect(gainNoise);
                gainNoise.connect(audioContext.destination);
                noise.start();
                noise.stop(audioContext.currentTime + 2);
                break;
        }
    } catch (e) { console.log('Error audio:', e); }
}

// ==============================================
// PERSISTENCIA (localStorage + cookies)
// ==============================================
function saveGameState() {
    try {
        const gameState = { currentLevel, score, gameCompleted, completedLevels: [] };
        for (let i = 1; i <= totalLevels; i++) {
            if (isLevelCompleted(i)) gameState.completedLevels.push(i);
        }
        localStorage.setItem('silentHillGameState', JSON.stringify(gameState));
        localStorage.setItem('silentHillHTMLScore', score.toString());
        document.cookie = `silentHillCurrentLevel=${currentLevel}; path=/; max-age=86400`;
    } catch (e) { console.log('Error guardando estado:', e); }
}

function loadGameState() {
    try {
        const savedState = localStorage.getItem('silentHillGameState');
        if (savedState) {
            const gameState = JSON.parse(savedState);
            score = gameState.score || 0;
            scoreDisplay.textContent = score;

            if (gameState.gameCompleted) {
                gameCompleted = true;
                showGameComplete();
                return true;
            }

            let targetLevel = gameState.currentLevel || 1;
            while (isLevelCompleted(targetLevel) && targetLevel <= totalLevels) targetLevel++;

            if (targetLevel > totalLevels) {
                gameCompleted = true;
                showGameComplete();
                return true;
            }

            currentLevel = targetLevel;
            levelDisplay.textContent = currentLevel;
            loadLevel(currentLevel);
            return true;
        }

        const cookieLevel = getCookie('silentHillCurrentLevel');
        if (cookieLevel) {
            const level = parseInt(cookieLevel, 10);
            if (!isNaN(level) && level >= 1 && level <= totalLevels) {
                currentLevel = level;
                levelDisplay.textContent = currentLevel;
                loadLevel(currentLevel);
                return true;
            }
        }
        return false;
    } catch (e) { return false; }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function saveScore() {
    try {
        localStorage.setItem('silentHillHTMLScore', score.toString());
        saveGameState();
    } catch (e) {}
}

function loadScore() {
    try {
        const saved = localStorage.getItem('silentHillHTMLScore');
        if (saved !== null) {
            score = parseInt(saved, 10);
            if (!isNaN(score)) scoreDisplay.textContent = score;
        }
    } catch (e) {}
}

function saveLevelKey(level) {
    const key = `html_level_${level}_completed`;
    try {
        document.cookie = `${key}=true; path=/; max-age=86400`;
        saveGameState();
    } catch (e) {}
}

function isLevelCompleted(level) {
    const key = `html_level_${level}_completed`;
    try {
        if (document.cookie.split('; ').some(row => row.startsWith(`${key}=true`))) return true;
        const savedState = localStorage.getItem('silentHillGameState');
        if (savedState) {
            const gameState = JSON.parse(savedState);
            if (gameState.completedLevels && gameState.completedLevels.includes(level)) return true;
        }
        return false;
    } catch (e) { return false; }
}

// ==============================================
// DEFINICIÓN DE NIVELES
// ==============================================
// ⚠️ IMPORTANTE:
// Reemplazá el valor de "video" con la URL de EMBED de YouTube
// (formato: https://www.youtube.com/embed/CODIGO_DEL_VIDEO)
// Reemplazá el valor de "image" con la URL de tu imagen.
// Si dejás el valor vacío (""), ese bloque no se mostrará.
// ==============================================
const levels = {
    1: {
        title: "🏚️ La Estructura Olvidada",
        story: "La niebla revela un documento antiguo. La estructura básica de HTML necesita dos etiquetas: una para el 'cabeza' y otra para el 'cuerpo'. ¿Cuál es la etiqueta para el 'cuerpo' del documento?",
        task: "Escribe el nombre de la etiqueta para el 'cuerpo' (body) del documento.",
        answer: "body",
        hint: "💡 Pista: Empieza con 'b' y define el contenido visible de la página.",
        key: "HTML_BODY",
        video: "https://www.youtube.com/embed/9biO4X-iCrE",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWd-5p1Q3KV88bPjdzjc3U56JCfazIlkG0NZEPZ9yIIQ&s=10"
    },
    2: {
        title: "🔗 El Misterio de los Enlaces",
        story: "Un viejo pergamino habla de enlaces que conectan dimensiones. Para crear un enlace en HTML se usa la etiqueta 'a'. ¿Qué atributo define el destino del enlace?",
        task: "Escribe el nombre del atributo que define la URL de un enlace.",
        answer: "href",
        hint: "💡 Pista: Empieza con 'h' y significa 'Hypertext Reference'.",
        key: "HTML_HREF",
        video: "https://www.youtube.com/embed/2brE1F0XsmI",
        image: "https://www.loading.es/blog/wp-content/uploads/a-href-enlaces-web-768x384.jpg"
    },
    3: {
        title: "🖼️ La Imagen Perdida",
        story: "Una fotografía borrosa aparece en la niebla. En HTML, para mostrar imágenes se usa la etiqueta 'img'. ¿Cómo se llama el atributo que contiene la ruta de la imagen?",
        task: "Escribe el nombre del atributo que especifica la fuente de la imagen.",
        answer: "src",
        hint: "💡 Pista: Es la abreviatura de 'source' (origen).",
        key: "HTML_SRC",
        video: "https://www.youtube.com/embed/hfa7_MEBw8k",
        image: "https://i.ytimg.com/vi/YSQBsRtnxHk/maxresdefault.jpg"
    },
    4: {
        title: "📜 El Listado Encantado",
        story: "Las paredes del pueblo muestran listas de nombres. HTML tiene dos tipos de listas: ordenadas (ol) y no ordenadas (ul). ¿Qué etiqueta se usa para crear una lista no ordenada?",
        task: "Escribe el nombre de la etiqueta para una lista no ordenada.",
        answer: "ul",
        hint: "💡 Pista: Son las siglas de 'Unordered List' (lista no ordenada).",
        key: "HTML_UL",
        video: "https://www.youtube.com/embed/d-DsmF5L7oE",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSApo-guk-J-VbRrgWAkr0yZROGFmhxmIBJv8vvtvIxGXyEBWQtlt5RSfQt&s=10"
    },
    5: {
        title: "📝 El Formulario del Pueblo",
        story: "El ritual final requiere enviar un mensaje. Para crear campos de entrada en HTML se usa la etiqueta 'input'. ¿Qué atributo define el tipo de entrada (ej: texto, número, email)?",
        task: "Escribe el nombre del atributo que define el tipo de input.",
        answer: "type",
        hint: "💡 Pista: Es una palabra de 4 letras que significa 'tipo' en inglés.",
        key: "HTML_TYPE",
        video: "https://www.youtube.com/embed/xVfOOndXe0E",
        image: "https://media.geeksforgeeks.org/wp-content/uploads/20240519124156/HTML-Input-Type-Text.png"
    },
    6: {
        title: "🌫️ Misión Extra: El Código Origen",
        story: "Has trascendido la niebla. Para una mejor estructura, HTML5 introduce etiquetas semánticas. ¿Qué etiqueta se usa para definir el encabezado de una página o sección?",
        task: "Escribe el nombre de la etiqueta semántica para el encabezado.",
        answer: "header",
        hint: "💡 Pista: Es una palabra en inglés que significa 'encabezado'.",
        key: "HTML_HEADER",
        video: "https://www.youtube.com/embed/WNAGQeYYLxg",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbYmXu6s0ehEem5yrwIavJ3tdZeHAZI5UqrgBHKtIsQUAWgYGRRkmbCLk&s=10"
    }
};

// ==============================================
// CARGAR IMAGEN Y VIDEO DEL NIVEL (cambia el DOM)
// ==============================================
function loadLevelMedia(levelData) {
    // 🖼️ IMAGEN
    if (levelData.image && levelData.image.trim() !== '') {
        levelImage.src = levelData.image;
        levelImage.alt = `Imagen de apoyo: ${levelData.title}`;
        levelImageContainer.style.display = 'block';
    } else {
        levelImageContainer.style.display = 'none';
        levelImage.src = '';
    }

    // 🎬 VIDEO (iframe de YouTube)
    if (levelData.video && levelData.video.trim() !== '') {
        // Agregamos autoplay=0 para que no se reproduzca sola
        // y rel=0 para limitar videos relacionados
        const separator = levelData.video.includes('?') ? '&' : '?';
        levelVideoFrame.src = `${levelData.video}${separator}rel=0&autoplay=0`;
        levelVideoContainer.style.display = 'block';
    } else {
        levelVideoFrame.src = '';
        levelVideoContainer.style.display = 'none';
    }
}

// ==============================================
// FUNCIONES DEL JUEGO
// ==============================================
function loadLevel(levelNum) {
    if (gameCompleted) { showGameComplete(); return; }

    if (isLevelCompleted(levelNum) && levelNum <= totalLevels) {
        if (levelNum >= totalLevels) { gameCompleted = true; showGameComplete(); return; }
        for (let i = levelNum + 1; i <= totalLevels; i++) {
            if (!isLevelCompleted(i)) { loadLevel(i); return; }
        }
        gameCompleted = true;
        showGameComplete();
        return;
    }

    if (levelNum > totalLevels) { gameCompleted = true; showGameComplete(); return; }

    const levelData = levels[levelNum];
    if (!levelData) { gameCompleted = true; showGameComplete(); return; }

    currentLevel = levelNum;
    levelDisplay.textContent = currentLevel;
    narrative.textContent = `📜 ${levelData.story}`;

    // 🔄 Cargar imagen y video del nivel (cambia el DOM)
    loadLevelMedia(levelData);

    // Tarea
    taskContainer.innerHTML = `
        <div class="level-header">
            <h3>${levelData.title}</h3>
            <div class="code-snippet">
                <pre>📝 ${levelData.task}</pre>
            </div>
        </div>
    `;

    if (levelData.hint) {
        taskContainer.innerHTML += `<p style="color: #8a7a6a; font-size: 0.95rem; margin-top: 12px; padding: 10px; background: #1a1a1a; border-radius: 5px;">${levelData.hint}</p>`;
    }

    answerInput.value = '';
    feedback.textContent = '';
    feedback.style.borderLeftColor = '#b89b7b';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'inline-block';
    answerInput.style.display = 'inline-block';
    answerInput.focus();

    saveGameState();
    playSound('ambient');
}

function checkAnswer() {
    const levelData = levels[currentLevel];
    if (!levelData) { feedback.textContent = '⚠️ Error: No se encontró el nivel.'; return; }

    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = levelData.answer.toLowerCase();

    if (!userAnswer) {
        feedback.textContent = '📝 Escribe una respuesta antes de enviar.';
        feedback.style.borderLeftColor = '#b89b7b';
        return;
    }

    const normalizedUser = userAnswer.replace(/\s+/g, '');
    const normalizedCorrect = correctAnswer.replace(/\s+/g, '');

    if (normalizedUser === normalizedCorrect || userAnswer === correctAnswer) {
        playSound('correct');
        feedback.innerHTML = '✅ ¡Respuesta correcta! El conocimiento HTML se fortalece.';
        feedback.style.borderLeftColor = '#4a7a5a';
        score += 10;
        scoreDisplay.textContent = score;
        saveScore();
        saveLevelKey(currentLevel);

        let allCompleted = true;
        for (let i = 1; i <= totalLevels; i++) {
            if (!isLevelCompleted(i)) { allCompleted = false; break; }
        }

        if (allCompleted) {
            gameCompleted = true;
            nextBtn.textContent = '🎉 Ver Final';
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
            saveGameState();
            return;
        }

        if (currentLevel < totalLevels) {
            nextBtn.style.display = 'inline-block';
            nextBtn.textContent = '➡️ Siguiente Nivel';
            submitBtn.style.display = 'none';
        } else {
            nextBtn.textContent = '🎉 Ver Final';
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }

        saveGameState();
    } else {
        playSound('wrong');
        feedback.innerHTML = `❌ Respuesta incorrecta. ${levelData.hint || 'Revisa la sintaxis de HTML y vuelve a intentarlo.'}`;
        feedback.style.borderLeftColor = '#7a4a4a';
        answerInput.value = '';
        answerInput.focus();
    }
}

function nextLevel() {
    let allCompleted = true;
    for (let i = 1; i <= totalLevels; i++) {
        if (!isLevelCompleted(i)) { allCompleted = false; break; }
    }

    if (allCompleted || currentLevel >= totalLevels) {
        gameCompleted = true;
        showGameComplete();
        return;
    }

    playSound('levelup');

    let next = currentLevel + 1;
    while (next <= totalLevels && isLevelCompleted(next)) next++;

    if (next > totalLevels) {
        gameCompleted = true;
        showGameComplete();
    } else {
        loadLevel(next);
    }
}

function showGameComplete() {
    gameCompleted = true;

    // Ocultar video e imagen
    levelVideoFrame.src = '';
    levelVideoContainer.style.display = 'none';
    levelImageContainer.style.display = 'none';
    levelImage.src = '';

    playSound('levelup');
    narrative.textContent = '🌫️ La niebla se disipa lentamente... Has dominado los fundamentos de HTML. ¡Eres un verdadero maestro del código!';
    taskContainer.innerHTML = `
        <div class="victory-container">
            <h2>🏆 ¡HTML Dominado!</h2>
            <p style="font-size: 1.2rem;">Puntuación final: <strong style="color: #b89b7b; font-size: 1.5rem;">${score}</strong> puntos</p>
            <p style="margin-top: 15px;">Has aprendido sobre:</p>
            <ul>
                <li>✅ Estructura básica (body)</li>
                <li>✅ Enlaces (href)</li>
                <li>✅ Imágenes (src)</li>
                <li>✅ Listas (ul)</li>
                <li>✅ Formularios (type)</li>
                <li>✅ Semántica (header)</li>
            </ul>
            <p style="margin-top: 20px; font-style: italic; color: #b89b7b;">"El conocimiento es la luz que disipa la niebla"</p>
            <p style="margin-top: 10px;">🌿 🌙 ¡Gracias por jugar, desarrollador!</p>
            <button id="btn-restart" style="margin-top: 20px; padding: 12px 30px; background: #4a5a7a; border: none; border-radius: 25px; color: white; font-size: 1rem; cursor: pointer; font-family: inherit;">
                🔄 Jugar de nuevo
            </button>
        </div>
    `;
    answerInput.style.display = 'none';
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    feedback.innerHTML = '🎓 ¡Excelente trabajo! Has completado todos los niveles.';
    feedback.style.borderLeftColor = '#b89b7b';

    saveGameState();

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) restartBtn.addEventListener('click', resetGame);
}

// ==============================================
// REINICIAR JUEGO
// ==============================================
function resetGame() {
    try {
        localStorage.removeItem('silentHillGameState');
        localStorage.removeItem('silentHillHTMLScore');
        for (let i = 1; i <= totalLevels; i++) {
            document.cookie = `html_level_${i}_completed=; path=/; max-age=0`;
        }
        document.cookie = `silentHillCurrentLevel=; path=/; max-age=0`;

        currentLevel = 1;
        score = 0;
        gameCompleted = false;
        levelDisplay.textContent = 1;
        scoreDisplay.textContent = 0;

        loadLevel(1);
        feedback.innerHTML = '🔄 Juego reiniciado. ¡Buena suerte!';
        feedback.style.borderLeftColor = '#b89b7b';
    } catch (e) { console.log('Error al reiniciar:', e); }
}

// ==============================================
// EVENT LISTENERS
// ==============================================
submitBtn.addEventListener('click', checkAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); }
});
nextBtn.addEventListener('click', nextLevel);

// ==============================================
// MANUAL
// ==============================================
btnManual.addEventListener('click', () => {
    manualPanel.style.display = 'block';
    playSound('ambient');
    feedback.innerHTML = '📖 Manual de ayuda abierto.';
    feedback.style.borderLeftColor = '#b89b7b';
});

closeManualBtn.addEventListener('click', () => { manualPanel.style.display = 'none'; });

window.addEventListener('click', (e) => {
    if (e.target === manualPanel) manualPanel.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && manualPanel.style.display === 'block') manualPanel.style.display = 'none';
});

// ==============================================
// MODOS DE ACCESIBILIDAD
// ==============================================
btnAutism.addEventListener('click', () => {
    document.body.classList.toggle('autism-mode');
    const isActive = document.body.classList.contains('autism-mode');
    btnAutism.classList.toggle('activado', isActive);
    btnAutism.textContent = isActive ? '🌿 Modo Serenidad Activado' : '🌿 Modo Serenidad';
    playSound('ambient');

    if (isActive) {
        feedback.innerHTML = '🌿 Modo Serenidad activado. Los colores y sonidos se han suavizado.';
        feedback.style.borderLeftColor = '#6a9a7a';
    } else {
        feedback.innerHTML = '🌿 Modo Serenidad desactivado.';
        feedback.style.borderLeftColor = '#b89b7b';
    }
});

btnEpilepsy.addEventListener('click', () => {
    document.body.classList.toggle('epilepsy-mode');
    const isActive = document.body.classList.contains('epilepsy-mode');
    btnEpilepsy.classList.toggle('activado', isActive);
    btnEpilepsy.textContent = isActive ? '🌙 Modo Descanso Activado' : '🌙 Modo Descanso';

    if (isActive) {
        document.querySelectorAll('*').forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
        });
        feedback.innerHTML = '🌙 Modo Descanso activado. Animaciones eliminadas.';
        feedback.style.borderLeftColor = '#6a8a9a';
    } else {
        document.querySelectorAll('*').forEach(el => {
            el.style.animation = '';
            el.style.transition = '';
        });
        feedback.innerHTML = '🌙 Modo Descanso desactivado.';
        feedback.style.borderLeftColor = '#b89b7b';
    }
    playSound('ambient');
});

// ==============================================
// INICIALIZACIÓN
// ==============================================
function init() {
    console.log('🌫️ Silent Hill: Aprendiendo HTML - Iniciando...');

    const loaded = loadGameState();

    if (!loaded) {
        loadScore();
        loadLevel(1);
    }

    setInterval(() => {
        if (!document.body.classList.contains('epilepsy-mode') && !gameCompleted) {
            playSound('ambient');
        }
    }, 15000);
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => { saveGameState(); });

window.addEventListener('error', (e) => {
    console.log('⚠️ Error detectado:', e.message);
    feedback.innerHTML = '⚠️ Ha ocurrido un error. Por favor, recarga la página.';
    feedback.style.borderLeftColor = '#7a4a4a';
});
