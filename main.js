canv = document.getElementById("mainCanvas");
ctx = canv.getContext("2d");
var width,
    height = 0;

cam = {
    x: 0,
    y: 0,
};

const Bodies = Matter.Bodies,
    Engine = Matter.Engine,
    Body = Matter.Body,
    Collision = Matter.Collision,
    Composite = Matter.Composite,
    Bounds = Matter.Bounds;
const Render = Matter.Render;

const debugRender = false;

var engine = Engine.create();

engine.positionIterations = 256;
engine.velocityIterations = 64;

if (debugRender) {
    var render = Render.create({
        element: document.getElementById("debugCanvas"),
        engine: engine,
        options: {
            showIds: true,
            showVelocity: true,
            showPerformance: true,
        },
    });
    canv.style.opacity = 0.5;
}
function updateWindowSize() {
    height = Math.max(window.innerHeight, plateHeight);
    width = Math.max(window.innerWidth, 200);
    canv.width = width;
    canv.height = height;
    ctx.imageSmoothingEnabled = false;

    if (debugRender) Render.setSize(render, width, height);

    cam.x = -width / 2;

    draw();
}

var combo = 0;

var score = 0;
var rawScore = 0;

const scoreValueP = document.getElementById("scoreValue");
const scoreComboP = document.getElementById("scoreCombo");

var IngredientsDiscovered = {};

function processScore(ingredient) {
    score += ingredient.value * (combo / 10 + 1);
    rawScore += ingredient.value;
    console.log(score, "x" + (combo / 10 + 1) + " (" + rawScore + ")");
    scoreValueP.innerText = Math.round(score * 10) / 10;
    scoreComboP.innerText = "x" + (combo / 10 + 1);
    scoreValueP.classList.add("blink");
    window.setTimeout(() => {
        scoreValueP.classList.remove("blink");
    }, 100);
}
function processCombo(comboVal) {
    if (comboVal == -1) {
        combo = 0;
    } else {
        combo++;
    }
}

var Burger;
const lerp = (a, b, c) => a + (b - a) * c;
let camyTarget = plateHeight;
function draw() {
    if (Burger.holding) {
        camyTarget = Math.min(
            Math.max(
                Burger.lowestMoving
                    ? Burger.lowestMoving.getCenter().y
                    : -Infinity,
                Burger.stackTop.getCenter().y
            ) -
                dropHeight -
                100,
            0
        );
    }
    cam.y = lerp(cam.y, camyTarget, 0.05);
    //cam.x = lerp(cam.x, Burger.holdingParams.center - width / 2, 0.001);
    if (debugRender) {
        Render.lookAt(render, {
            min: { x: cam.x, y: cam.y },
            max: { x: cam.x + width, y: cam.y + height },
        });
    }
    ctx.clearRect(0, 0, width, height);
    Burger.draw(ctx, cam);

    //draw countertop
    for (let i = 0; i < width; i += 16 * 5) {
        for (
            let j = plateHeight - cam.y - 10 + 4 * 5;
            j < height;
            j += 16 * 5 - 0.5
        ) {
            ctx.drawImage(sprites.Countertop1, i, j, 16 * 5, 16 * 5);
        }
        ctx.drawImage(
            sprites.Countertop2,
            i,
            plateHeight - cam.y - 10,
            16 * 5,
            8 * 5
        );
    }
}

function frame() {
    Burger.update();
    draw();
    Engine.update(engine, 1000 / 60);

    window.requestAnimationFrame(frame);
}

Composite.add(
    engine.world,
    Bodies.rectangle(0, plateHeight, 2000, 20, {
        isStatic: true,
        friction: 1,
        restitution: 0,
        label: "Countertop",
    })
);
document.gameOverScreen = document.getElementById("gameOverScreen");
function gameOver() {
    console.log("Game Over");
    document.gameOverScreen.style.display = "block";
    document.getElementById("finalScore").innerText =
        Math.round(score * 10) / 10;
    let highScore = window.localStorage.getItem("highScore");
    if (highScore == null || score > highScore) {
        window.localStorage.setItem("highScore", score);
        highScore = score;
    }
    document.getElementById("highScore").innerText = highScore;
    let pattyCount = 0;
    Burger.stackFrames.forEach((frame) => {
        frame.stack.forEach((ingredient) => {
            if (ingredient.isPatty) {
                pattyCount++;
            } else if (ingredient.isBacon) {
                pattyCount += 0.5;
            }
        });
    });
    document.getElementById("totalPatty").innerText =
        Math.floor(pattyCount * 200) + " g";
}
document.getElementById("restartButton").addEventListener("click", restart);
function restart() {
    window.location.reload();
}
document.getElementById("reviewButton").addEventListener("click", () => {
    document.gameOverScreen.style.display = "none";
});

let noteFadeTimeout = null;
function discover(name, description, value, sprite, showextra = true) {
    document.getElementById("noteHeading").innerText = name;
    document.getElementById("noteText").innerText = `${
        showextra ? "You discovered a new ingredient!\n\n" : ""
    } ${description}\n\nValue: ${value}`;
    let imgContext = document.getElementById("noteImage").getContext("2d");
    imgContext.imageSmoothingEnabled = false;
    imgContext.clearRect(0, 0, 100, 100);
    imgContext.drawImage(sprite, 0, 0, sprite.width * 5, sprite.height * 5);
    document.getElementById("notification").classList.add("show");
    if (noteFadeTimeout != null) window.clearTimeout(noteFadeTimeout);
    noteFadeTimeout = window.setTimeout(() => {
        document.getElementById("notification").classList.remove("show");
    }, 5000);
}

window.addEventListener("keydown", (e) => {
    if (e.key == "w") camyTarget -= 32;
    if (e.key == "s") camyTarget += 32;
    camyTarget = Math.min(camyTarget, plateHeight);
});

assets.onload = () => {
    loadSprites().then(() => {
        if (debugRender) Render.run(render);
        Burger = new BurgerStack(engine);
        updateWindowSize();
        window.requestAnimationFrame(frame);
        window.addEventListener("resize", updateWindowSize);
        canv.addEventListener("click", () => {
            Burger.drop();
        });
        window.addEventListener("keydown", (e) => {
            if (e.key == " ") Burger.drop();
        });
        Burger.onCombo = processCombo;
        Burger.onScore = processScore;
    });
};
