const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI & Score Elements
const scoreValEl = document.getElementById('scoreVal');
const hiValEl = document.getElementById('hiVal');
let score = 0;
let highScore = localStorage.getItem('donkeyWrongHighScore') || 0;
hiValEl.innerText = highScore;

function addScore(points) {
    score += points;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('donkeyWrongHighScore', highScore);
        hiValEl.innerText = highScore;
    }
    scoreValEl.innerText = score;
}

const helpBtn = document.getElementById('helpBtn');
const closeBtn = document.getElementById('closeBtn');
const helpModal = document.getElementById('helpModal');
const overlay = document.getElementById('overlay');
const installBtn = document.getElementById('installBtn');

let isGameOver = false;
let isPaused = false;
let frameCount = 0;

// --- Entities ---
// Player starts TOP-RIGHT (Needs to go down)
const player = {
    x: 320, y: 50, width: 20, height: 26, 
    dx: 0, dy: 0, speed: 4, jumpPower: -10, grounded: false, facingLeft: true
};

// DK starts BOTTOM-LEFT (Throwing barrels up)
const dk = { x: 20, y: 540, width: 40, height: 40 };

// Exit is BOTTOM-RIGHT
const goal = { x: 340, y: 540, width: 30, height: 40 };

// Staggered platforms
const platforms = [
    { x: 0, y: 80, w: 340, h: 20 },   // Gap on right
    { x: 60, y: 180, w: 340, h: 20 },  // Gap on left
    { x: 0, y: 280, w: 340, h: 20 },   // Gap on right
    { x: 60, y: 380, w: 340, h: 20 },  // Gap on left
    { x: 0, y: 480, w: 340, h: 20 },   // Gap on right
    { x: 0, y: 580, w: 400, h: 20 }    // Solid ground
];

let barrels = [];

// --- PWA Install Logic ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none';
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
    if (e.code === 'ArrowLeft') { keys.left = true; player.facingLeft = true; }
    if (e.code === 'ArrowRight') { keys.right = true; player.facingLeft = false; }
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = true;
    if (isGameOver && e.code === 'Enter') resetGame(true);
});
window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = false;
});

canvas.addEventListener('touchstart', e => {
    if (isPaused) return; 
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    if (touchX < rect.width / 3) { keys.left = true; player.facingLeft = true; }
    else if (touchX > (rect.width / 3) * 2) { keys.right = true; player.facingLeft = false; }
    else keys.up = true; 
}, { passive: false });

canvas.addEventListener('touchend', () => {
    keys.left = keys.right = keys.up = false;
    if (isGameOver) resetGame(true);
});

// --- Core Logic ---
function spawnBarrel() {
    // Spawns near DK at the bottom and rolls right initially
    barrels.push({ x: 70, y: 550, radius: 10, dx: 3, dy: 0, rotation: 0 });
}

function resetGame(fullReset) {
    isGameOver = false;
    player.x = 320; player.y = 50; // Reset to Top Right
    player.dx = 0; player.dy = 0;
    barrels = [];
    frameCount = 0;
    if (fullReset) {
        score = 0;
        scoreValEl.innerText = score;
    }
}

function update() {
    if (isGameOver || isPaused) return;
    frameCount++;

    // NORMAL GRAVITY FOR PLAYER (Falls down)
    player.dy += 0.6; 
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

    // Player collides with TOP of platforms
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

    if (frameCount % 110 === 0) spawnBarrel();

    for (let i = barrels.length - 1; i >= 0; i--) {
        let b = barrels[i];
        
        // ANTI-GRAVITY FOR BARRELS (Accelerate upwards)
        b.dy -= 0.3; 
        b.x += b.dx;
        b.y += b.dy;
        b.rotation -= b.dx * 0.1; 

        // Barrels collide with UNDERSIDE of platforms
        platforms.forEach(p => {
            if (b.x - b.radius < p.x + p.w && b.x + b.radius > p.x &&
                b.y - b.radius < p.y + p.h && b.y + b.radius > p.y) {
                if (b.dy < 0 && b.y - b.radius - b.dy >= p.y + p.h) {
                    b.dy = 0; // Stop moving up
                    b.y = p.y + p.h + b.radius; // Snap to underside
                }
            }
        });

        // Bounce off walls
        if (b.x - b.radius <= 0) { b.x = b.radius; b.dx = Math.abs(b.dx); }
        if (b.x + b.radius >= canvas.width) { b.x = canvas.width - b.radius; b.dx = -Math.abs(b.dx); }

        // Player Hit
        if (player.x < b.x + b.radius && player.x + player.width > b.x - b.radius &&
            player.y < b.y + b.radius && player.y + player.height > b.y - b.radius) {
            isGameOver = true;
        }

        // Barrel reached the TOP of the screen - Despawn and add points
        if (b.y < -20) {
            barrels.splice(i, 1);
            addScore(10);
        }
    }

    // Win condition check (Reached bottom right)
    if (player.x < goal.x + goal.width && player.x + player.width > goal.x &&
        player.y < goal.y + goal.height && player.y + player.height > goal.y) {
        addScore(500);
        alert("Level Cleared! Escaping to the next floor...");
        resetGame(false); 
    }
}

// --- Custom Graphics ---
function drawGirder(p) {
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#800000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = 0; i < p.w; i += 20) {
        ctx.moveTo(p.x + i, p.y);
        ctx.lineTo(p.x + i + 20, p.y + p.h);
        ctx.moveTo(p.x + i + 20, p.y);
        ctx.lineTo(p.x + i, p.y + p.h);
    }
    ctx.stroke();
    ctx.strokeRect(p.x, p.y, p.w, p.h);
}

function drawMario(x, y, facingLeft) {
    ctx.save();
    if (facingLeft) {
        ctx.translate(x + 20, y);
        ctx.scale(-1, 1);
        x = 0; y = 0;
    }
    ctx.fillStyle = '#0000bb'; ctx.fillRect(x + 4, y + 14, 12, 12);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(x + 2, y + 10, 16, 8);
    ctx.fillStyle = '#ffcc99'; ctx.fillRect(x + 4, y + 4, 12, 8);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(x + 2, y, 16, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 12, y + 8, 6, 4);
    ctx.fillStyle = '#663300'; ctx.fillRect(x + 2, y + 24, 6, 4); ctx.fillRect(x + 12, y + 24, 6, 4);
    ctx.restore();
}

function drawDK(x, y) {
    ctx.fillStyle = '#5c3a21'; ctx.fillRect(x, y + 10, 40, 30);
    ctx.fillStyle = '#d4a373'; ctx.fillRect(x + 10, y + 15, 20, 15);
    ctx.fillStyle = '#5c3a21'; ctx.fillRect(x + 5, y, 30, 20);
    ctx.fillStyle = '#d4a373'; ctx.fillRect(x + 10, y + 5, 20, 15);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 12, y + 8, 4, 4); ctx.fillRect(x + 24, y + 8, 4, 4);
    ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + 16, y + 35); ctx.lineTo(x + 24, y + 35); ctx.fill();
}

function drawBarrel(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);
    ctx.fillStyle = '#a65d37'; ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.radius - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#6e3c22'; ctx.lineWidth = 1; ctx.beginPath(); 
    ctx.moveTo(-b.radius+2, 0); ctx.lineTo(b.radius-2, 0);
    ctx.moveTo(-b.radius+4, -4); ctx.lineTo(b.radius-4, -4);
    ctx.moveTo(-b.radius+4, 4); ctx.lineTo(b.radius-4, 4);
    ctx.stroke();
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(p => drawGirder(p));

    // Draw Exit Door (Bottom Right)
    ctx.fillStyle = '#228B22'; 
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
    ctx.fillStyle = '#000'; 
    ctx.fillRect(goal.x + 22, goal.y + 20, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText("EXIT", goal.x + 4, goal.y + 10);

    drawDK(dk.x, dk.y);
    drawMario(player.x, player.y, player.facingLeft);
    barrels.forEach(b => drawBarrel(b));

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 35px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Courier New';
        ctx.fillText("Tap or press ENTER to retry", canvas.width / 2, canvas.height / 2 + 40);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();