const dropHeight = 100;
const plateHeight = 450;
const maxHoldTime = 5000;
const dropCooldown = 500;

const comboSlop = 10;
const statSpeed = 10;

const bouncePos = (t) => {
    q = (t + 0.25) % 1;
    //return 2*(Math.random()-0.5);
    //return Math.pow(Math.sin(q*2*Math.PI),5);
    //return Math.cbrt(Math.sin(q*2*Math.PI));

    if (q < 0.5) return 4 * q - 1;
    else return 3 - 4 * q;
};

var Ingredients = [
    Bun,
    Patty,
    Lettuce,
    Tomato,
    Onion,
    Cheese,
    Bacon,
    Toast,
    Plate,
]; //good luck on getting that plate lol
class BurgerStack {
    constructor(engine) {
        this.engine = engine;
        this.world = engine.world;
        this.lastDrop = 0;
        let plate = new Plate(this.world);
        plate.createBody(0, plateHeight - Math.min(dropHeight / 3, 50));
        plate.drop();
        plate.collided = true;
        this.stackFrames = [new StackFrame([plate])];
        this.stackTop = plate;
        this.lowestMoving = null;
        this.lastIngredient = Ingredients[0]; //Start with bun
        Matter.Events.on(engine, "collisionStart", (event) => {
            this.collisionHandler(event);
        });

        this.bunPity = -1;
        this.toastPity = -1;
        this.onCombo = null;
        this.onScore = null;
        this.running = true;
        this.holdingParams = { center: 0 };
    }
    collisionHandler(event) {
        if (!this.running) return;
        var pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            if (
                pair.bodyB.label == "Ingredient" ||
                pair.bodyB.label == "MultiIngredient" ||
                pair.bodyB.label == "Plate"
            ) {
                if (
                    pair.bodyA.label == "Countertop" &&
                    pair.bodyB.label != "Plate"
                ) {
                    console.log(pair.bodyA.label, pair.bodyB.label);
                    this.loss();
                }
                let topFrame = this.stackFrames[0];
                let m = topFrame.getStackIDByBody(pair.bodyB);
                let n = topFrame.getStackIDByBody(pair.bodyA);
                if (m == null || n == null) return;

                let ingredientB = topFrame.stack[m.stackID];
                let ingredientA = topFrame.stack[n.stackID];

                let scoreType = ingredientB.onCollision(
                    ingredientA,
                    m.compositeID
                );
                if (scoreType != null) {
                    if (ingredientB.isBun) {
                        window.setTimeout(() => {
                            topFrame.lock();
                        }, 50);
                        let newFrame = new StackFrame(
                            topFrame.stack.splice(
                                m.stackID,
                                topFrame.stack.length - m.stackID
                            )
                        );
                        this.stackFrames.unshift(newFrame);
                        console.log("New Frame");
                        console.log(this.stackFrames);
                    }
                    this.onCombo(scoreType);
                    this.onScore(ingredientB);
                }
            }
        }
    }
    update() {
        if (this.holding) {
            this.holding.moveTo(
                this.holdingParams.center +
                    bouncePos(
                        (Date.now() - this.startedHolding) /
                            this.holdingParams.speed +
                            this.holdingParams.offset
                    ) *
                        this.holdingParams.dist
            );
            if (
                Math.max(this.startedHolding, this.lastDrop) + maxHoldTime <
                Date.now()
            ) {
                this.drop();
            }
        }
        if (
            this.running &&
            !this.holding &&
            this.lastDrop + dropCooldown < Date.now()
        ) {
            this.generateIngredient();
        }
        this.stackTop = this.getTopIngredient();
        this.lowestMoving = this.stackFrames[0].getLowestMoving();
    }
    getTopIngredient() {
        for (let frame of this.stackFrames) {
            let top = frame.getTopIngredient();
            if (top) return top;
        }
        return this.stackFrames[this.stackFrames.length - 1].bottom;
    }
    draw(ctx, cam) {
        for (let frame of this.stackFrames) {
            frame.draw(ctx, cam);
        }
    }
    loss() {
        for (let i = 0; i < this.stackFrames.length; i++) {
            if (this.stackFrames[i].bottom.isToast) {
                discover(
                    "Another Chance!",
                    "The Mighty TOAST has saved you!",
                    "delicious",
                    sprites.Toast,
                    false
                );
                this.resetTo(i);
                return;
            }
        }
        let topBun = new Bun(this.world, 2);
        topBun.createBody(
            this.stackTop.getCenter().x * 0.9,
            this.stackTop.getCenter().y - 150
        );
        topBun.drop();
        this.stackFrames[0].add(topBun);
        this.stop();
        gameOver();
        return;
    }
    resetTo(i) {
        combo = 0;
        if (this.holding != null) {
            this.holding.delete();
            this.holding = null;
        }
        for (let k = 0; k <= i; k++) {
            this.stackFrames.shift().delete();
        }
        this.stackTop = this.getTopIngredient();
    }
    drop() {
        if (!this.holding) return;
        if (!this.holding.isEmpty()) {
            this.holding.drop();
            this.lastDrop = Date.now();
        }
        //if empty after drop
        if (this.holding.isEmpty()) {
            this.holding = null;
        }
    }
    delete() {
        this.stackFrames.forEach((frame) => {
            frame.delete();
        });
    }
    stop() {
        while (this.holding) this.drop();
        this.running = false;
    }
    generateIngredient() {
        //Buns Grace :3
        if (this.bunPity == -1) {
            this.holding = new Bun(this.world, 0);
        } else {
            let IngredientRarities = Ingredients.map((i) => i.getRarity(this));
            for (let i = 0; i < Ingredients.length; i++) {
                console.log(Ingredients[i].name, IngredientRarities[i]);
            }
            let totalProb = 0;
            for (let i = 0; i < Ingredients.length; i++) {
                if (Ingredients[i] == this.lastIngredient) continue;
                if (IngredientRarities[i] == 0) continue;
                totalProb += 1 / IngredientRarities[i];
            }
            let p = Math.random() * totalProb;
            let pSum = 0;
            for (let i = 0; i < Ingredients.length; i++) {
                if (Ingredients[i] == this.lastIngredient) continue;
                if (IngredientRarities[i] == 0) continue;
                pSum += 1 / IngredientRarities[i];
                if (pSum < p) continue;
                this.holding = new Ingredients[i](this.world);
                this.lastIngredient = Ingredients[i];
                if (!IngredientsDiscovered[Ingredients[i].name]) {
                    IngredientsDiscovered[Ingredients[i].name] = true;
                    window.setTimeout(() => {
                        discover(
                            Ingredients[i].name,
                            Ingredients[i].description,
                            this.holding.value,
                            this.holding.sprite
                        );
                    }, 50);
                }
                break;
            }
        }

        if (!this.holding) return;

        this.holdingParams.speed = lerp(2400, 1200, Math.min(1, score / 1500));
        this.holdingParams.dist = lerp(40, 120, Math.min(1, score / 1500));
        this.holdingParams.offset =
            (Math.random() - 0.5) * Math.min(2, score / 400);

        this.holdingParams.center = this.stackTop.getCenter().x;
        this.holding.createBody(
            this.holdingParams.center +
                bouncePos(this.holdingParams.offset) * this.holdingParams.dist,
            this.stackTop.getCenter().y - dropHeight
        );
        this.stackFrames[0].add(this.holding);
        this.startedHolding = Date.now();

        if (this.holding.isBun) this.bunPity = 0;
        else this.bunPity++;
        if (combo >= 8 && !this.holding.isToast) this.toastPity++;
        else this.toastPity = 0;
    }
    delete() {
        for (let frame of this.stackFrames) {
            frame.delete();
        }
        this.stackFrames = [];
    }
}
class StackFrame {
    constructor(start) {
        this.bottom = start[0];
        this.stack = start;
        this.stackTop = this.bottom;
        this.locked = false;
    }
    add(ingredient) {
        this.stack.push(ingredient);
    }
    draw(ctx, cam) {
        for (let ingredient of this.stack) {
            ingredient.show(ctx, cam);
        }
    }
    lock() {
        for (let ingredient of this.stack) {
            ingredient.lock();
        }
        this.locked = true;
    }
    getTopIngredient() {
        let top = plateHeight;
        let topIngredient = null;
        this.stack.forEach((ingredient) => {
            if (ingredient.isEmpty() && ingredient.isStationary()) {
                if (ingredient.getCenter().y < top) {
                    top = ingredient.getCenter().y;
                    topIngredient = ingredient;
                }
            }
        });
        return topIngredient;
    }
    getLowestMoving() {
        let lowestNonStationary = -Infinity;
        let lowestNonStationaryIngredient = null;
        this.stack.forEach((ingredient) => {
            if (ingredient.isEmpty() && !ingredient.isStationary()) {
                if (ingredient.getCenter().y > lowestNonStationary) {
                    lowestNonStationary = ingredient.getCenter().y;
                    lowestNonStationaryIngredient = ingredient;
                }
            }
        });
        return lowestNonStationaryIngredient;
    }
    delete() {
        for (let ingredient of this.stack) {
            ingredient.delete();
        }
        this.stack = [];
    }

    getStackIDByBody(body) {
        for (let i = 0; i < this.stack.length; i++) {
            if (this.stack[i].physical == body) {
                return { stackID: i };
            } else if (
                this.stack[i].physical.type == "composite" &&
                this.stack[i].physical.bodies.includes(body)
            ) {
                return {
                    stackID: i,
                    compositeID: this.stack[i].physical.bodies.indexOf(body),
                };
            }
        }
        return null;
    }
}
