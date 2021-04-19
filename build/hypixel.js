"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVENTORIES = exports.cacheInventories = exports.itemToUrlCached = exports.itemToUrl = exports.fetchLeaderboards = exports.fetchLeaderboard = exports.fetchProfile = exports.fetchPlayer = exports.baseApi = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const node_cache_1 = __importDefault(require("node-cache"));
const https_1 = require("https");
// import { Agent } from 'http'
const skyblockAssets = __importStar(require("skyblock-assets"));
if (!process.env.key)
    // if there's no key in env, run dotenv
    require('dotenv').config();
exports.baseApi = 'https://skyblock-api2.matdoes.dev'; // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one
// export const baseApi = 'http://localhost:8080'
// We need to create an agent to prevent memory leaks and to only do dns lookups once
const httpsAgent = new https_1.Agent({
    keepAlive: true
});
/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 */
async function fetchApi(path) {
    const fetchUrl = `${exports.baseApi}/${path}`;
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
const itemToUrlCache = new node_cache_1.default({
    stdTTL: 60,
    checkperiod: 5,
    useClones: false,
});
async function itemToUrl(item) {
    const stringifiedItem = JSON.stringify(item);
    if (itemToUrlCache.has(stringifiedItem))
        return itemToUrlCache.get(stringifiedItem);
    const itemNbt = {
        display: {
            Name: item.display.name
        },
        ExtraAttributes: {
            id: item.id,
        }
    };
    let textureUrl = await skyblockAssets.getTextureUrl({
        id: item.vanillaId,
        nbt: itemNbt,
        pack: 'furfsky'
    });
    if (!textureUrl && item.head_texture)
        textureUrl = `https://mc-heads.net/head/${item.head_texture}`;
    itemToUrlCache.set(stringifiedItem, textureUrl);
    return textureUrl;
}
exports.itemToUrl = itemToUrl;
function itemToUrlCached(item) {
    if (!item)
        return null;
    const stringifiedItem = JSON.stringify(item);
    return itemToUrlCache.get(stringifiedItem);
}
exports.itemToUrlCached = itemToUrlCached;
/** Get all the items in an inventories object to cache them */
async function cacheInventories(inventories) {
    const promises = [];
    for (const inventoryItems of Object.values(inventories !== null && inventories !== void 0 ? inventories : {}))
        for (const inventoryItem of inventoryItems)
            if (inventoryItem)
                promises.push(itemToUrl(inventoryItem));
    await Promise.all(promises);
}
exports.cacheInventories = cacheInventories;
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
