"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVENTORIES = exports.fetchLeaderboards = exports.fetchLeaderboard = exports.fetchProfile = exports.fetchPlayer = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
// import { Agent } from 'https'
const http_1 = require("http");
if (!process.env.key)
    // if there's no key in env, run dotenv
    require('dotenv').config();
// const baseApi = 'https://skyblock-api2.matdoes.dev' // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one
const baseApi = 'http://localhost:8080';
// We need to create an agent to prevent memory leaks and to only do dns lookups once
const httpsAgent = new http_1.Agent({
    keepAlive: true
});
/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 */
async function fetchApi(path) {
    const fetchUrl = `${baseApi}/${path}`;
    const fetchResponse = await node_fetch_1.default(fetchUrl, {
        agent: () => httpsAgent,
        headers: {
            key: process.env.key
        }
    });
    return await fetchResponse.json();
}
/**
 * Fetch a player
 * @param user A username or UUID
 */
async function fetchPlayer(user) {
    return await fetchApi(`player/${user}`);
}
exports.fetchPlayer = fetchPlayer;
/**
 * Fetch a profile
 * @param user A username or UUID
 * @profile A profile name or UUID
 */
async function fetchProfile(user, profile) {
    return await fetchApi(`player/${user}/${profile}`);
}
exports.fetchProfile = fetchProfile;
async function fetchLeaderboard(name) {
    return await fetchApi(`leaderboard/${name}`);
}
exports.fetchLeaderboard = fetchLeaderboard;
async function fetchLeaderboards() {
    return await fetchApi(`leaderboards`);
}
exports.fetchLeaderboards = fetchLeaderboards;
exports.INVENTORIES = {
    armor: 'inv_armor',
    inventory: 'inv_contents',
    ender_chest: 'ender_chest_contents',
    talisman_bag: 'talisman_bag',
    potion_bag: 'potion_bag',
    fishing_bag: 'fishing_bag',
    quiver: 'quiver',
    trick_or_treat_bag: 'candy_inventory_contents',
    wardrobe: 'wardrobe_contents'
};
const COLLECTIONS = {
    'farming': [
        'wheat',
        'carrot',
        'potato',
        'pumpkin',
        'melon_slice',
        'wheat_seeds',
        'red_mushroom',
        'cocoa_beans',
        'cactus',
        'sugar_cane',
        'feather',
        'leather',
        'porkchop',
        'chicken',
        'mutton',
        'rabbit',
        'nether_wart'
    ],
    'mining': [
        'cobblestone',
        'coal',
        'iron_ingot',
        'gold_ingot',
        'diamond',
        'lapis_lazuli',
        'emerald',
        'redstone',
        'quartz',
        'obsidian',
        'glowstone_dust',
        'gravel',
        'ice',
        'netherrack',
        'sand',
        'end_stone'
    ],
    'combat': [
        'rotten_flesh',
        'bone',
        'string',
        'spider_eye',
        'gunpowder',
        'ender_pearl',
        'ghast_tear',
        'slime_ball',
        'blaze_rod',
        'magma_cream'
    ],
    'foraging': [
        'oak_log',
        'spruce_log',
        'birch_log',
        'jungle_log',
        'acacia_log',
        'dark_oak_log'
    ],
    'fishing': [
        'cod',
        'salmon',
        'tropical_fish',
        'pufferfish',
        'prismarine_shard',
        'prismarine_crystals',
        'clay_ball',
        'lily_pad',
        'ink_sac',
        'sponge'
    ],
    // no item should be here, but in case a new collection is added itll default to this
    'unknown': []
};
const SLAYER_NAMES = {
    spider: 'tarantula',
    zombie: 'revenant',
    wolf: 'sven'
};
