import { EngineObject, TileInfo, Vector2, vec2, clamp, isUsingGamepad, gamepadStick, keyIsDown, Timer, sign, gamepadIsDown, randInt, randSign, rand } from "littlejsengine";
import { gameData, incrementTotSteps, setGameOver, spawnSpikeBall, TILEMAP_LOOKUP } from "./global";
import { PALLETE, SE } from "./effects";
import FT from "./flamethrower";
import { destroyTile } from "./level";
import SpikeBall from "./spikeBall";

const airControlSystem = (_gnT: Timer, _mov: Vector2, _vel: Vector2) => {
    if(_gnT && !_gnT.isSet()) {
        if (sign(_mov.x) == sign(_vel.x))
            _mov.x *= .1; // moving with velocity
        else
            _mov.x *= .2; // moving against velocity (stopping)
    }

    return _mov
}

const playerMoveSys = (_move: Vector2, _vel: Vector2, _max: number, _mir: boolean) => {
    _vel.x = clamp(
        _vel.x + _move.x * 0.042,
        -_max,
        _max
    )

    return _vel
}

const mirrorHandling = (_mv: Vector2, _mir: boolean) => {
    if(_mv.x) {
        _mir = _mv.x < 0
    }

    return _mir
}

export default class Player extends EngineObject {
    constructor(_pos: Vector2, _size: Vector2, _tile: TileInfo) {
        super(_pos, _size, _tile)
        this.name = "player"
        this.drawSize = vec2(1, 1)
        this.setCollision(true, true)

        this.groundTimer = new Timer()
        this.pressedJumpTimer = new Timer()
        this.jumpTimer = new Timer()
        this.prePos = this.pos.copy()
        this.countTile = 0
        this.countTileCooldown = new Timer()
        this.ft = new FT(this.pos, this)
        this.sBCoolDown = new Timer()
        this.sBInEffect = new Timer()
        this.sBCDPeriod = 0.8
        this.sBCount = 1
        this.sBCurr = this.sBCount
        this.isDead = false
        this.deathTimer = new Timer()
    }

    ft: FT
    name: string
    moveInput = vec2(0, 0)
    maxSpeed = 0.25
    groundTimer: Timer
    pressedJumpTimer: Timer
    jumpTimer: Timer
    holdingJump = false
    wasHoldJump = false
    prePos: Vector2
    countTile: number
    countTileCooldown: Timer
    hasKey = false
    // spikeball spawning related
    sBCoolDown: Timer
    sBCDPeriod: number // in seconds
    sBInEffect: Timer
    sBCount: number
    sBCurr: number
    // death mechanics handling
    isDead: boolean
    deathTimer: Timer

    setStartGameParams() {
        this.groundTimer?.unset()
        this.pressedJumpTimer?.unset()
        this.jumpTimer?.unset()
        this.countTileCooldown?.unset()
        this.sBCoolDown?.unset()
        this.sBInEffect?.unset()
        this.deathTimer?.unset()

        this.prePos = this.pos.copy()
        this.countTile = 0
        this.sBCount = 1
        this.sBCurr = this.sBCount
        // this.hasKey = false
        this.isDead = false
    }


    get getCountTile() {
        return this.countTile
    }

    setKeyState(_state: boolean) {
        this.hasKey = _state
    }

    inputSystem() {
        this.moveInput = isUsingGamepad ? gamepadStick(0) : vec2(keyIsDown('ArrowRight')?1:0 - (keyIsDown('ArrowLeft')?1:0), 
        keyIsDown('ArrowUp')?1:0 - (keyIsDown('ArrowDown')?1:0));

        this.holdingJump   = keyIsDown('ArrowUp') || gamepadIsDown(0);
    }

    countTilesFunc() {
        if(Math.floor(this.prePos.x) === Math.floor(this.pos.x) || this.countTileCooldown.active() || !this.groundTimer.active()) return
        if(!this.countTileCooldown.active()) {
            if(this.countTile > 11) {
                this.trigger()
                this.countTile = 0
            } else {
                this.countTile++
                gameData.totalSteps = incrementTotSteps(gameData.totalSteps)
            }
            this.countTileCooldown.set(0.5)
        }
        this.prePos.x = this.pos.x
    }

    trigger() {
        // set the effect timer with no countdown to trigger the cont spawn of spikeballs
        this.sBInEffect.set()
    }

    playDeadAnims(obj: EngineObject) {
        this.size = this.size.scale(.5);
        const fallDirection = obj ? sign(obj.velocity.x) : randSign();
        this.color = PALLETE.DARK_1
        this.angleVelocity = fallDirection*rand(.22,.14);
        this.angleDamping = .9;
        this.renderOrder = -1;  // move to back layer
    }

    findSpikeBallSpawnPos() {
        // find a starting position and start counting
        const spawnPosGp = []
        // const spawnPos = this.pos.floor().add(vec2(-2, 2))
        const range = 4
        for(let i = 0; i < range; i++) {
            spawnPosGp.push(this.pos.floor().add(vec2(-2 + i, 2)))
        }
        const pickPos = spawnPosGp[randInt(0, spawnPosGp.length-1)]
        spawnSpikeBall(pickPos)
    }

    spikeBallStateHandle() {
        if(this.sBInEffect.isSet()) {
            if(!this.sBCoolDown.active() && this.sBCurr > 0) {
                this.findSpikeBallSpawnPos()
                this.sBCoolDown.set(this.sBCDPeriod)
                this.sBCurr = clamp(this.sBCurr-1, 0, this.sBCurr)
            } else if(this.sBCurr === 0) {
                // reset the params
                this.sBCount = clamp(this.sBCount+1, this.sBCount, 3)
                this.sBCurr = this.sBCount
                this.sBInEffect.unset()
                this.sBCoolDown.unset()
            }
        }
    }

    jumpHandling() {
        if(!this.holdingJump) {
            this.pressedJumpTimer.unset()
        } else if (!this.wasHoldJump) {
            this.pressedJumpTimer.set(0.3)
        }
        this.wasHoldJump = this.holdingJump

        if(this.groundTimer.active()) {
            if(this.pressedJumpTimer.active() && ! this.jumpTimer.active()) {
                this.velocity.y = .15;
                this.jumpTimer.set(.2)
                SE.JUMP.play()
            }
        }

        if(this.jumpTimer.active()) {
            this.groundTimer.unset();
            if(this.holdingJump && this.velocity.y > 0) {
                this.velocity.y += .017;
            }
        }
    }

    update() {
        if(this.isDead) return super.update()

        super.update()

        if(this.groundObject) {
            this.groundTimer.set()
        } else {
            this.groundTimer.unset()
        }

        this.inputSystem()
        this.jumpHandling()
        this.countTilesFunc()
        this.moveInput = airControlSystem(this.groundTimer, this. moveInput, this.velocity)
        this.velocity = playerMoveSys(this.moveInput, this.velocity, this.maxSpeed, this.mirror)
        this.mirror = mirrorHandling(this.moveInput, this.mirror)

        this.spikeBallStateHandle()
    }

    setDeath(_obj: EngineObject) {
        this.isDead = true
        this.deathTimer.set(1)
        this.playDeadAnims(_obj)
    }

    collideWithObject(_obj: EngineObject): boolean {
        const sB = _obj as SpikeBall
        if(sB.name) {
            this.setCollision(false, false)
            this.setDeath(sB)
        }
        return true
    }
    
    collideWithTile(tileData: number, pos: Vector2): boolean {
        if(tileData === TILEMAP_LOOKUP.KEY) {
            this.setKeyState(true)
            destroyTile(pos)
        } else if (tileData === TILEMAP_LOOKUP.DOOR) {
            if(!this.hasKey) return true
            this.setKeyState(false)
            setGameOver(true)
        }
        return true
    }
}