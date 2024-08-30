import { defineExitQueue, query, World } from "bitecs";
import { DamageComp, EngineObjectsComp, GroundTimer, Health, JumpData, MoveInput, PlayerTag } from "./components";

export const HealthEntityQuery = (_world: World) => {
    return query(_world, [Health, EngineObjectsComp])
}

export const DamagedEntityQuery = (_world: World) => {
    return query(_world, [Health, EngineObjectsComp, DamageComp])
}

export const MoveInputQueries = (_world: World) => {
    return query(_world, [MoveInput])
}

export const JumpingEntityQuery = (_world: World) => {
    return query(_world, [JumpData, GroundTimer, EngineObjectsComp])
}

export const PlayerMoveQueries = (_world: World) => {
    return query(_world, [MoveInput, PlayerTag, EngineObjectsComp])
}

export const playerHealthQuery = (_world: World) => {
    return query(_world, [PlayerTag, Health])
}

export const playerQuery = (_world: World) => {
    return query(_world, [PlayerTag])
}

export const EngineObjExitQueue = defineExitQueue([EngineObjectsComp])