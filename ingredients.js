const assets = new Image();
assets.src = "assets/all.png";
sprites = {};
const loadSprites = async () => {
    await Promise.all([
        window.createImageBitmap(assets, 16, 0, 16, 6),
        window.createImageBitmap(assets, 0, 6, 16, 6),
        window.createImageBitmap(assets, 0, 0, 16, 6),
        window.createImageBitmap(assets, 16, 6, 16, 6),
        window.createImageBitmap(assets, 0, 12, 16, 6),
        window.createImageBitmap(assets, 0, 18, 8, 3),
        window.createImageBitmap(assets, 0, 21, 5, 3),
        window.createImageBitmap(assets, 0, 24, 5, 3),
        window.createImageBitmap(assets, 0, 27, 18, 3),
        window.createImageBitmap(assets, 0, 30, 22, 4),
        window.createImageBitmap(assets, 0, 34, 18, 2),
        window.createImageBitmap(assets, 0, 36, 18, 5),
        window.createImageBitmap(assets, 16, 12, 16, 4),
    ]).then((bitmaps) => {
        sprites.Empty = bitmaps[0];
        sprites.Bun0 = bitmaps[1];
        sprites.Bun1 = bitmaps[2];
        sprites.Bun2 = bitmaps[3];
        sprites.Patty = bitmaps[4];
        sprites.Tomato = bitmaps[5];
        sprites.Onion0 = bitmaps[6];
        sprites.Onion1 = bitmaps[7];
        sprites.Lettuce = bitmaps[8];
        sprites.Plate = bitmaps[9];
        sprites.Cheese = bitmaps[10];
        sprites.Bacon = bitmaps[11];
        sprites.Toast = bitmaps[12];
    });
};

class Ingredient {
    constructor(world) {
        this.world = world;
        this.options = {
            friction: 0.7,
            frictionStatic: 5,
            restitution: 0,
            label: "Ingredient",
            isSleeping: true,
            mass: 1.5,
        };
        this.value = 1;
        this.dropped = 0;
        this.combo = 0;
        this.collided = false;
        this.sprite = sprites.Empty;
        this.width = 16 * 5;
        this.height = 6 * 5;
    }
    lock() {
        Body.setStatic(this.physical, true);
    }
    createBody(x, y) {
        this.physical = Bodies.rectangle(
            x,
            y,
            this.width,
            this.height,
            this.options
        );
        Composite.add(this.world, this.physical);
    }
    moveTo(x) {
        Body.setPosition(this.physical, { x: x, y: this.physical.position.y });
    }
    show(ctx, cam) {
        ctx.save();

        ctx.translate(
            this.physical.position.x - cam.x,
            this.physical.position.y - cam.y
        );
        ctx.rotate(this.physical.angle);
        ctx.drawImage(
            this.sprite,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        ctx.restore();
    }
    drop() {
        this.physical.isSleeping = false;
        this.dropped++;
    }
    isEmpty() {
        return !!this.dropped;
    }
    delete() {
        Composite.remove(this.world, this.physical);
    }
    isOffScreen() {
        return this.physical.position.y > 2 * height;
    }
    calcCombo(other) {
        if (!other.isStationary()) return -1;
        if (Math.abs(other.getCenter().x - this.getCenter().x) > comboSlop)
            return -1;
        return 1;
    }
    checkCombo(other) {
        if (this.combo != 0) {
            return null;
        }
        this.combo = this.calcCombo(other);
        return this.combo;
    }
    isStationary() {
        return Body.getSpeed(this.physical) < statSpeed && this.collided;
    }
    getCenter() {
        return this.physical.position;
    }
    onCollision(other) {
        this.collided = true;
        return this.checkCombo(other);
    }
    static getRarity(context) {
        return 1;
    }
}
class MultiIngredient extends Ingredient {
    constructor(world) {
        super(world);
        this.options.label = "MultiIngredient";
        this.count = Math.ceil(Math.pow(Math.random(), 4) * 2 + 1);
        this.options.mass = 1 / this.count;
        this.width = Math.floor(64 / this.count) - 2;
        this.height = 12;
        this.sprite = sprites.Empty;
    }
    lock() {
        this.physical.bodies.forEach((b) => {
            Body.setStatic(b, true);
        });
    }
    createBody(x, y) {
        this.physical = Composite.create();
        for (let i = 0; i < this.count; i++) {
            //Composite.add(this.physical,Bodies.rectangle(x+(i-(this.count-1)/2)*(this.width+3) , y, this.width, 12, this.options));
            Composite.add(
                this.physical,
                Bodies.rectangle(
                    x,
                    y + (this.count - i) * this.height,
                    this.width,
                    this.height,
                    this.options
                )
            );
        }
        Composite.add(this.world, this.physical);
    }
    moveTo(x) {
        this.physical.bodies.forEach((b, i) => {
            if (b.isSleeping) {
                Body.setPosition(b, { x: x, y: b.position.y });
                //Body.setPosition(b, { x: x+(i-(this.count-1)/2)*(this.width+2), y: b.position.y });
            }
        });
    }
    show(ctx, cam) {
        for (let i = 0; i < this.count; i++) {
            let b = this.physical.bodies[i];
            ctx.save();
            ctx.translate(b.position.x - cam.x, b.position.y - cam.y);
            ctx.rotate(b.angle);
            ctx.drawImage(
                this.sprite,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
            ctx.restore();
        }
    }
    drop() {
        if (this.isEmpty()) return;
        this.physical.bodies[this.dropped].isSleeping = false;
        this.dropped++;
    }
    isEmpty() {
        return this.dropped >= this.count;
    }
    isOffScreen(slop) {
        for (let i = 0; i < this.count; i++) {
            if (this.physical.bodies[i].position.y < height + slop) {
                return false;
            }
        }
        return true;
    }
    calcCombo(other) {
        if (!other.isStationary()) {
            console.log(statSpeed);
            return -1;
        }
        if (Math.abs(other.getCenter().x - this.getCenter().x) > comboSlop) {
            return -1;
        }
        for (let i = 0; i < this.count; i++) {
            if (
                Math.abs(
                    this.physical.bodies[i].position.x - other.getCenter().x
                ) >
                ((comboSlop + this.width) * this.count - this.width) / 2
            ) {
                return -1;
            }
        }
        return 1;
    }
    isStationary() {
        if (this.getMaxHeightDelta() > dropHeight / 2) {
            return false;
        }
        return this.getMaxSpeed() < statSpeed && this.collided;
    }
    getCenter() {
        let center = { x: 0, y: 0 };
        for (let i = 0; i < this.count; i++) {
            center.x += this.physical.bodies[i].position.x;
            center.y += this.physical.bodies[i].position.y;
        }
        center.x /= this.count;
        center.y /= this.count;
        return center;
    }
    getMaxHeightDelta() {
        let maxDelta = 0;
        for (let i = 0; i < this.count - 1; i++) {
            maxDelta = Math.max(
                maxDelta,
                Math.abs(
                    this.physical.bodies[i].position.y -
                        this.physical.bodies[i + 1].position.y
                )
            );
        }
        return maxDelta;
    }
    getMaxSpeed() {
        let maxSpeed = 0;
        for (let i = 0; i < this.count; i++) {
            maxSpeed = Math.max(
                maxSpeed,
                Body.getSpeed(this.physical.bodies[i])
            );
        }
        return maxSpeed;
    }
    onCollision(other, compositeID) {
        this.collided = true;
        if (!compositeID || compositeID < this.count - 1) return null;
        return this.checkCombo(other);
    }
    static getRarity(context) {
        return 1;
    }
}
class Bun extends Ingredient {
    static description =
        "Needed for every burger. Will help you keep yours stable when it gets too tall.";
    constructor(world, part = 1) {
        super(world);
        this.sprite = [sprites.Bun0, sprites.Bun1, sprites.Bun2][part];
        this.width = 16 * 5;
        this.height = 6 * 5;
        this.isBun = true;
        this.value = 0.5;
    }
    static getRarity(context) {
        return (
            (12 * Math.pow(0.9, context.bunPity)) /
            Math.max(1, 2 - rawScore / 30)
        );
    }
}
class Patty extends Ingredient {
    static description = "A patty made of... some kind of meat. Probably.";
    constructor(world) {
        super(world);
        this.sprite = sprites.Patty;
        this.width = 16 * 5;
        this.height = 6 * 5;
        this.value = 1;
    }
}
class Lettuce extends Ingredient {
    static description = "A leaf of lettuce. It's green.";
    constructor(world) {
        super(world);
        this.sprite = sprites.Lettuce;
        this.width = 18 * 5;
        this.height = 3 * 5;
        this.value = 1;
    }
    static getRarity() {
        return 2;
    }
}
class Tomato extends MultiIngredient {
    static description = "Don't tell Integza about this one.";
    constructor(world) {
        super(world);
        this.sprite = sprites.Tomato;
        this.count = 2;
        this.width = 8 * 5;
        this.height = 3 * 5;
        this.value = 3;
    }
    static getRarity() {
        if (rawScore < 12) return 0;
        return 2;
    }
}

class Onion extends MultiIngredient {
    static description = "A little sweet, just like you :3";
    constructor(world) {
        super(world);
        this.sprite = Math.random() < 0.7 ? sprites.Onion0 : sprites.Onion1;
        this.count = 3;
        this.width = 5 * 5;
        this.height = 3 * 5;
        this.value = 8;
    }
    static getRarity() {
        if (rawScore < 30) return 0;
        return Math.max(6 - (rawScore - 30) / 40, 4);
    }
}
class Plate extends Ingredient {
    static description =
        "a plate??? ontop of a burger??? how queer!! ive never seen such a thing- i must inquire about this further with my supervisor post-haste";
    constructor(world) {
        super(world);
        this.sprite = sprites.Plate;
        this.width = 22 * 5;
        this.height = 4 * 5;
        this.options.friction = 1;
        this.options.label = "Plate";
        this.value = 69;
    }
    static getRarity() {
        return 1000;
    }
}
class Cheese extends Ingredient {
    static description = "It's cheese, what did you expect?";
    constructor(world) {
        super(world);
        this.sprite = sprites.Cheese;
        this.width = 18 * 5;
        this.height = 2 * 5;
        this.value = 3;
    }
    static getRarity() {
        return 4;
    }
}

class Bacon extends Ingredient {
    static description =
        "Rare, but perfect for greasing up your burger a little. You'll get more bacon during combos!";
    constructor(world) {
        super(world);
        this.sprite = sprites.Bacon;
        this.width = 18 * 5;
        this.height = 5 * 5;
        this.value = 10;
    }
    static getRarity() {
        if (combo > 8) return Math.max(8 - combo / 10, 5);
        if (rawScore < 80) return 0;
        return 10;
    }
}
class Toast extends Bun {
    static description =
        "Congrats on getting such a Combo! For that you'll get... a nice crispy piece of toast. Might come in handy...";
    constructor(world) {
        super(world, 0);
        this.sprite = sprites.Toast;
        this.height = 4 * 5;
        this.value = 0;
        this.isToast = true;
    }
    static getRarity(context) {
        if (!context.toastPity) return 0;
        else return 50 * Math.pow(0.6, context.toastPity);
    }
}
