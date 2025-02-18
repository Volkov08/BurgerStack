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
function draw() {
    cam.y = Math.min(
        lerp(
            cam.y,
            Math.max(
                Burger.lowestMoving
                    ? Burger.lowestMoving.getCenter().y
                    : -Infinity,
                Burger.stackTop.getCenter().y
            ) -
                dropHeight -
                100,
            0.05
        ),
        0
    );
    //cam.x = lerp(cam.x, Burger.holdingParams.center - width / 2, 0.001);
    if (debugRender) {
        Render.lookAt(render, {
            min: { x: cam.x, y: cam.y },
            max: { x: cam.x + width, y: cam.y + height },
        });
    }
    ctx.clearRect(0, 0, width, height);
    Burger.draw(ctx, cam);
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

function gameOver() {
    console.log("Game Over");
    alert("Game Over");
    window.location.reload();
}
function discover(name, description, value, sprite) {
    alert(
        `You discovered a new ingredient!\n\n${name}:\n${description}\n\nValue: ${value}`
    );
}

assets.onload = () => {
    loadSprites().then(() => {
        if (debugRender) Render.run(render);
        Burger = new BurgerStack(engine);
        updateWindowSize();
        window.requestAnimationFrame(frame);
        window.addEventListener("resize", updateWindowSize);
        window.addEventListener("click", () => {
            Burger.drop();
        });
        window.addEventListener("keydown", (e) => {
            if (e.key == " ") Burger.drop();
        });
        Burger.onCombo = processCombo;
        Burger.onScore = processScore;
    });
};
