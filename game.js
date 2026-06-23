const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const helpBtn = document.getElementById('helpBtn');
const closeBtn = document.getElementById('closeBtn');
const helpModal = document.getElementById('helpModal');
const overlay = document.getElementById('overlay');
const installBtn = document.getElementById('installBtn');

// --- Game State ---
let isGameOver = false;
let isPaused = false;
let frameCount = 0;

// --- Entities ---
const player = {
    x: 50, y: 500, width: 20, height: 20, color: '#00ffff',
    dx: 0, dy: 0, speed: 4, jumpPower: -10, grounded: false
};

const platforms = [
    { x: 0, y: 580, w: 400, h: 20 },
    { x: 0, y: 480, w: 320, h: 20 },
    { x: 80, y: 380, w: 320, h: 20 },
    { x: 0, y: 280, w: 320, h: 20 },
    { x: 80, y: 180, w: 320, h: 20 },
    { x: 180, y: 80, w: 40, h: 20 }
];

let barrels = [];

// --- PWA Install Logic ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Prevent standard browser prompt
    deferredPrompt = e;
    installBtn.style.display = 'block'; // Show install button in modal
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt !== null) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.style.display = 'none'; // Hide if installed
        }
        deferredPrompt = null;
    }
});

// --- Modal UI Logic ---
function toggleModal(show) {
    isPaused = show;
    helpModal.style.display = show ? 'block' : 'none';
    overlay.style.display = show ? 'block' : 'none';
}

helpBtn.addEventListener('click', () => toggleModal(true));
closeBtn.addEventListener('click', () => toggleModal(false));

// --- Input Handling ---
const keys = { left: false, right: false, up: false };

window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = true;
    if (isGameOver && e.code === 'Enter') resetGame();
});

window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = false;
});

// Bind Touch Events directly to CANVAS to avoid UI interference
canvas.addEventListener('touchstart', e => {
    if (isPaused) return; // Don't move if paused
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const canvasWidth = rect.width;
    
    if (touchX < canvasWidth / 3) keys.left = true;
    else if (touchX > (canvasWidth / 3) * 2) keys.right = true;
    else keys.up = true; 
}, { passive: false });

canvas.addEventListener('touchend', () => {
    keys.left = keys.right = keys.up = false;
    if (isGameOver) resetGame();
});

// --- Core Logic ---
function spawnBarrel() {
    barrels.push({ x: 80, y: 150, radius: 10, dx: 3, dy: 0 });
}

function resetGame() {
    isGameOver = false;
    player.x = 50; player.y = 500;
    player.dx = 0; player.dy = 0;
    barrels = [];
    frameCount = 0;
}

function update() {
    if (isGameOver || isPaused) return; // Stop logic if game over or help menu open
    frameCount++;

    player.dy += 0.5;
    if (keys.left) player.dx = -player.speed;
    else if (keys.right) player.dx = player.speed;
    else player.dx = 0;

    if (keys.up && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }

    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    player.grounded = false;
    platforms.forEach(p => {
        if (player.x < p.x + p.w && player.x + player.width > p.x &&
            player.y < p.y + p.h && player.y + player.height > p.y) {
            if (player.dy > 0 && player.y + player.height - player.dy <= p.y) {
                player.grounded = true;
                player.dy = 0;
                player.y = p.y - player.height;
            }
        }
    });

    if (frameCount % 120 === 0) spawnBarrel();

    barrels.forEach(b => {
        b.dy += 0.5; 
        b.x += b.dx;
        b.y += b.dy;

        platforms.forEach(p => {
            if (b.x - b.radius < p.x + p.w && b.x + b.radius > p.x &&
                b.y - b.radius < p.y + p.h && b.y + b.radius > p.y) {
                if (b.dy > 0 && b.y + b.radius - b.dy <= p.y) {
                    b.dy = 0;
                    b.y = p.y - b.radius;
                }
            }
        });

        if (b.x - b.radius <= 0) { b.x = b.radius; b.dx = Math.abs(b.dx); }
        if (b.x + b.radius >= canvas.width) { b.x = canvas.width - b.radius; b.dx = -Math.abs(b.dx); }

        if (player.x < b.x + b.radius && player.x + player.width > b.x - b.radius &&
            player.y < b.y + b.radius && player.y + player.height > b.y - b.radius) {
            isGameOver = true;
        }
    });

    if (player.y < 80) {
        alert("YOU WIN! Donkey Wrong has been thwarted.");
        resetGame();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#b22222';
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    ctx.fillStyle = 'gold';
    ctx.fillRect(180, 60, 40, 20);

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'orange';
    barrels.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = '15px Arial';
        ctx.fillText("Press ENTER or Tap Canvas to Restart", canvas.width / 2, canvas.height / 2 + 40);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();