const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State ---
let isGameOver = false;
let frameCount = 0;

// --- Entities ---
const player = {
    x: 50, y: 500, width: 20, height: 20, color: '#00ffff',
    dx: 0, dy: 0, speed: 4, jumpPower: -10, grounded: false
};

// Staggered platforms to allow rolling barrels
const platforms = [
    { x: 0, y: 580, w: 400, h: 20 },   // Ground
    { x: 0, y: 480, w: 320, h: 20 },   // Level 1
    { x: 80, y: 380, w: 320, h: 20 },  // Level 2
    { x: 0, y: 280, w: 320, h: 20 },   // Level 3
    { x: 80, y: 180, w: 320, h: 20 },  // Level 4
    { x: 180, y: 80, w: 40, h: 20 }    // Goal platform
];

let barrels = [];

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

// Basic Touch Support for Mobile
window.addEventListener('touchstart', e => {
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;
    if (touchX < screenWidth / 3) keys.left = true;
    else if (touchX > (screenWidth / 3) * 2) keys.right = true;
    else keys.up = true; // Tap middle to jump
});
window.addEventListener('touchend', () => {
    keys.left = keys.right = keys.up = false;
    if (isGameOver) resetGame();
});

// --- Core Logic ---
function spawnBarrel() {
    barrels.push({ x: 80, y: 150, radius: 10, dx: 3, dy: 0 });
}

function resetGame() {
    isGameOver = false;
    player.x = 50;
    player.y = 500;
    player.dx = 0;
    player.dy = 0;
    barrels = [];
    frameCount = 0;
}

function update() {
    if (isGameOver) return;
    frameCount++;

    // Player Physics
    player.dy += 0.5; // Gravity
    if (keys.left) player.dx = -player.speed;
    else if (keys.right) player.dx = player.speed;
    else player.dx = 0;

    if (keys.up && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }

    player.x += player.dx;
    player.y += player.dy;

    // Boundary walls for player
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Platform Collision (Player)
    player.grounded = false;
    platforms.forEach(p => {
        if (player.x < p.x + p.w && player.x + player.width > p.x &&
            player.y < p.y + p.h && player.y + player.height > p.y) {
            // Only collide if falling downwards onto the platform
            if (player.dy > 0 && player.y + player.height - player.dy <= p.y) {
                player.grounded = true;
                player.dy = 0;
                player.y = p.y - player.height;
            }
        }
    });

    // Barrel Logic
    if (frameCount % 120 === 0) spawnBarrel(); // Spawn roughly every 2 seconds

    barrels.forEach(b => {
        b.dy += 0.5; // Gravity
        b.x += b.dx;
        b.y += b.dy;

        // Platform Collision (Barrels)
        platforms.forEach(p => {
            if (b.x - b.radius < p.x + p.w && b.x + b.radius > p.x &&
                b.y - b.radius < p.y + p.h && b.y + b.radius > p.y) {
                if (b.dy > 0 && b.y + b.radius - b.dy <= p.y) {
                    b.dy = 0;
                    b.y = p.y - b.radius;
                }
            }
        });

        // Bounce off canvas walls to zig-zag down
        if (b.x - b.radius <= 0) { b.x = b.radius; b.dx = Math.abs(b.dx); }
        if (b.x + b.radius >= canvas.width) { b.x = canvas.width - b.radius; b.dx = -Math.abs(b.dx); }

        // Collision with Player
        if (player.x < b.x + b.radius && player.x + player.width > b.x - b.radius &&
            player.y < b.y + b.radius && player.y + player.height > b.y - b.radius) {
            isGameOver = true;
        }
    });

    // Win Condition
    if (player.y < 80) {
        alert("YOU WIN! The Ape is Defeated.");
        resetGame();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    ctx.fillStyle = '#b22222'; // Firebrick red
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    // Draw Goal (Princess/Trophy representation)
    ctx.fillStyle = 'gold';
    ctx.fillRect(180, 60, 40, 20);

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw Barrels
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
        ctx.fillText("Press ENTER or Tap to Restart", canvas.width / 2, canvas.height / 2 + 40);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start game
loop();