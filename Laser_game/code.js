const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let score = 0;
let lives = 3;
let gameOver = false;
let isGameStarted = false;

let difficultyLevel = 1;

const scoreDisplay = document.getElementById("score-value");
const heartsContainer = document.getElementById("hearts-container");
const enemies = [];
let ENEMY_COUNT = 5;
const ENEMY_SIZE = 50;

const CURSOR_SIZE = 64;
let mouseX = 0;
let mouseY = 0;

let BASE_SPEED = 1.5;
let BASE_DANGER_TIME = 3000;
let BASE_ESCAPE_TIME = 3000;

const ENEMY_CONFIGS = [
  {
    name: "Bezos",
    source: "assets/Bezos_sprite.png",
    baseSpeedMultiplier: 0,
    damage: 2,
    hitsToKill: 1,
    dangerTimeMultiplier: 2.5,
    escapeTimeMultiplier: 2.5,
  },

  {
    name: "Apple",
    source: "assets/apple_sprite.png",
    baseSpeedMultiplier: 1,
    damage: 1,
    hitsToKill: 1,
    dangerTimeMultiplier: 1,
    escapeTimeMultiplier: 1,
  },

  {
    name: "Windows",
    source: "assets/Windows_sprite.png",
    baseSpeedMultiplier: 1,
    damage: 1,
    hitsToKill: 2,
    dangerTimeMultiplier: 1.5,
    escapeTimeMultiplier: 1.5,
  },

  {
    name: "Riot",
    source: "assets/Riot_sprite.png",
    baseSpeedMultiplier: 2,
    damage: 1,
    hitsToKill: 1,
    dangerTimeMultiplier: 1.5,
    escapeTimeMultiplier: 1.5,
  },
];

const enemySources = ENEMY_CONFIGS.map((config) => config.source);

let cursorImg = null;
let dangerImg = null;
let fullHeartImg = null;
let emptyHeartImg = null;
let enemyImagesList = [];

function chargerImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;

    if (img.complete) {
      resolve(img);
    } else {
      img.onload = () => resolve(img);
      img.onerror = () => {

        resolve(null);
      };
    }
  });
}

class Enemy {
  constructor() {
    this.configIndex = Math.floor(Math.random() * ENEMY_CONFIGS.length);
    this.config = ENEMY_CONFIGS[this.configIndex];

    this.x = Math.random() * (canvas.width - ENEMY_SIZE);
    this.y = Math.random() * (canvas.height - ENEMY_SIZE);
    this.width = ENEMY_SIZE;
    this.height = ENEMY_SIZE;

    const speed = BASE_SPEED * this.config.baseSpeedMultiplier;
    if (speed === 0) {
      this.dx = 0;
      this.dy = 0;
    } else {
      this.dx = (Math.random() - 0.5) * speed;
      this.dy = (Math.random() - 0.5) * speed;
    }

    this.spawnTime = Date.now();
    this.isDangerous = false;

    this.damage = this.config.damage;
    this.maxHealth = this.config.hitsToKill;
    this.health = this.maxHealth;
    this.dangerTime = BASE_DANGER_TIME * this.config.dangerTimeMultiplier;
    this.escapeTime = BASE_ESCAPE_TIME * this.config.escapeTimeMultiplier;

    this.image = null;
    if (enemyImagesList.length > 0) {
      const loadedImage = enemyImagesList.find(
        (img) => img && img.src.endsWith(this.config.source),
      );
      this.image = loadedImage;
    }
  }

  draw() {
    if (this.image && this.image.complete && this.image.naturalWidth > 0) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "blue";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    if (this.isDangerous && dangerImg && dangerImg.naturalWidth > 0) {
      const dangerSize = 30;
      const dangerX = this.x + this.width / 2 - dangerSize / 2;
      const dangerY = this.y + this.height / 2 - dangerSize / 2;

      ctx.drawImage(dangerImg, dangerX, dangerY, dangerSize, dangerSize);
    }

    if (this.maxHealth > 1 && this.health > 0) {
      ctx.fillStyle = this.health === 2 ? "yellow" : "orange";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        this.health,
        this.x + this.width / 2,
        this.y + this.height + 15,
      );
    }
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;

    if (this.config.baseSpeedMultiplier > 0) {
      if (this.x + this.width > canvas.width) {
        this.x = canvas.width - this.width;
        this.dx = -this.dx;
      }
      if (this.x < 0) {
        this.x = 0;
        this.dx = -this.dx;
      }
      if (this.y + this.height > canvas.height) {
        this.y = canvas.height - this.height;
        this.dy = -this.dy;
      }
      if (this.y < 0) {
        this.y = 0;
        this.dy = -this.dy;
      }
    } else {
      if (this.x + this.width > canvas.width) {
        this.x = canvas.width - this.width;
      }
      if (this.x < 0) {
        this.x = 0;
      }
      if (this.y + this.height > canvas.height) {
        this.y = canvas.height - this.height;
      }
      if (this.y < 0) {
        this.y = 0;
      }
    }

    const timeElapsed = Date.now() - this.spawnTime;

    if (timeElapsed > this.dangerTime + this.escapeTime) {
      handleEscape(this);
    } else if (timeElapsed > this.dangerTime && !this.isDangerous) {
      this.isDangerous = true;
    }
  }

  isHit(clickX, clickY) {
    return (
      clickX > this.x &&
      clickX < this.x + this.width &&
      clickY > this.y &&
      clickY < this.y + this.height
    );
  }
}

function initEnemies() {
  for (let i = 0; i < ENEMY_COUNT; i++) {
    enemies.push(new Enemy());
  }
}

function updateHeartsDisplay() {
  const heartElements = heartsContainer.getElementsByClassName("heart");

  if (!fullHeartImg || !emptyHeartImg) return;

  for (let i = 0; i < heartElements.length; i++) {
    if (i < lives) {
      heartElements[i].src = fullHeartImg.src;
    } else {
      heartElements[i].src = emptyHeartImg.src;
    }
  }
}

function updateDifficulty() {
  const newDifficultyLevel = Math.floor(score / 10) + 1;

  if (newDifficultyLevel > difficultyLevel) {
    difficultyLevel = newDifficultyLevel;

    ENEMY_COUNT = Math.min(10, 5 + difficultyLevel - 1);

    BASE_SPEED = Math.min(3, 1.5 + (difficultyLevel - 1) * 0.2);

    BASE_DANGER_TIME = Math.max(1000, 3000 - (difficultyLevel - 1) * 200);
    BASE_ESCAPE_TIME = Math.max(1000, 3000 - (difficultyLevel - 1) * 200);


  }
}

function handleEscape(enemyToRemove) {
  if (gameOver) return;

  lives -= enemyToRemove.damage;
  updateHeartsDisplay();

  const index = enemies.indexOf(enemyToRemove);
  if (index > -1) {
    enemies.splice(index, 1);
  }

  if (lives <= 0) {
    endGame();
  }
}

function endGame() {
  gameOver = true;
  const gameOverScreen = document.getElementById("game-over-screen");
  const finalScore = document.getElementById("final-score");
  if (gameOverScreen) {
    gameOverScreen.style.display = "flex";
  }
  if (finalScore) {
    finalScore.textContent = `Score final : ${score}`;
  }

  document.body.style.cursor = "default";
  canvas.removeEventListener("click", clickHandler);
}

function restartGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  difficultyLevel = 1;
  ENEMY_COUNT = 5;
  BASE_SPEED = 1.5;
  BASE_DANGER_TIME = 3000;
  BASE_ESCAPE_TIME = 3000;
  scoreDisplay.textContent = score;
  enemies.length = 0;

  const gameOverScreen = document.getElementById("game-over-screen");
  if (gameOverScreen) {
    gameOverScreen.style.display = "none";
  }

  canvas.addEventListener("click", clickHandler);
  document.body.style.cursor = "none";

  initEnemies();
  updateHeartsDisplay();
  gameLoop();
}

function showIntroductionScreen() {
  const introScreen = document.getElementById("introduction-screen");

  if (introScreen) {
    introScreen.style.display = "flex";
  }

  document
    .getElementById("introduction-screen")
    .addEventListener("click", startGame, { once: true });
}

function startGame() {
  if (isGameStarted) return;
  isGameStarted = true;

  const introScreen = document.getElementById("introduction-screen");

  if (introScreen) {
    introScreen.style.display = "none";
  }

  canvas.addEventListener("click", clickHandler);

  initEnemies();
  updateHeartsDisplay();
  gameLoop();
}

function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  while (enemies.length < ENEMY_COUNT) {
    enemies.push(new Enemy());
  }

  for (let i = 0; i < enemies.length; i++) {
    enemies[i].update();
    enemies[i].draw();
  }

  if (cursorImg && cursorImg.naturalWidth > 0) {
    const offset = CURSOR_SIZE / 2;
    ctx.drawImage(
      cursorImg,
      mouseX - offset,
      mouseY - offset,
      CURSOR_SIZE,
      CURSOR_SIZE,
    );
  }

  requestAnimationFrame(gameLoop);
}

Promise.all([
  chargerImage("assets/target.png"),

  chargerImage("assets/Panneau danger.png"),

  chargerImage("assets/coeur_plein.png"),

  chargerImage("assets/coeur_vide.png"),

  ...enemySources.map((src) => chargerImage(src)),
])
  .then((images) => {
    cursorImg = images[0];
    dangerImg = images[1];
    fullHeartImg = images[2];
    emptyHeartImg = images[3];

    const rawEnemies = images.slice(4);
    enemyImagesList = rawEnemies.filter(
      (img) => img !== null && img.naturalWidth > 0,
    );

    if (enemyImagesList.length === 0) {

    }



    let currentStoryPageIndex = 0;
    const storyPages = [
      document.getElementById("histoire-page-1"),
      document.getElementById("histoire-page-2"),
    ];

    function showNextStoryPage() {
      if (currentStoryPageIndex < storyPages.length) {
        if (currentStoryPageIndex > 0) {
          storyPages[currentStoryPageIndex - 1].style.display = "none";
        }

        storyPages[currentStoryPageIndex].style.display = "flex";
        storyPages[currentStoryPageIndex].addEventListener(
          "click",
          () => {
            storyPages[currentStoryPageIndex].style.display = "none";
            currentStoryPageIndex++;
            showNextStoryPage();
          },
          { once: true },
        );
      } else {
        showIntroductionScreen();
      }
    }

    if (storyPages[0]) {
      showNextStoryPage();
    } else {
      showIntroductionScreen();
    }
  })
  .catch((err) => {

    alert("Impossible de charger les images. Vérifiez la console.");
  });

const mouseMoveHandler = (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
};

const clickHandler = (event) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (enemy.isHit(clickX, clickY)) {
      enemy.health--;

      if (enemy.health <= 0) {
        score++;
        scoreDisplay.textContent = score;
        updateDifficulty();

        enemies.splice(i, 1);
      }

      break;
    }
  }
};

canvas.addEventListener("mousemove", mouseMoveHandler);

document
  .getElementById("restart-button")
  .addEventListener("click", restartGame);

