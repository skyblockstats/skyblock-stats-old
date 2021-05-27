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
exports.updateAccount = exports.fetchSession = exports.createSession = exports.cacheInventories = exports.itemToUrlCached = exports.itemToUrl = exports.fetchLeaderboards = exports.fetchLeaderboard = exports.fetchProfile = exports.fetchPlayer = exports.skyblockConstantValues = exports.httpsAgent = exports.baseApi = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const node_cache_1 = __importDefault(require("node-cache"));
// import { Agent } from 'https'
const http_1 = require("http");
const skyblockAssets = __importStar(require("skyblock-assets"));
if (!process.env.key)
    // if there's no key in env, run dotenv
    require('dotenv').config();
// export const baseApi = 'https://skyblock-api2.matdoes.dev' // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one
exports.baseApi = 'http://localhost:8080';
// We need to create an agent to prevent memory leaks and to only do dns lookups once
exports.httpsAgent = new http_1.Agent({
    keepAlive: true
});
exports.skyblockConstantValues = null;
/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 */
async function fetchApi(path, retry = true) {
    const fetchUrl = `${exports.baseApi}/${path}`;
    try {
        const fetchResponse = await node_fetch_1.default(fetchUrl, {
            agent: () => exports.httpsAgent,
            headers: { key: process.env.key },
        });
        return await fetchResponse.json();
    }
    catch (err) {
        if (retry) {
            // wait 5 seconds and retry
            await new Promise(resolve => setTimeout(resolve, 5000));
            return await fetchApi(path, false);
        }
        else {
            throw err;
        }
    }
}
/**
 * Post to skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 * @param data The data (as json) that should be posted
 */
async function postApi(path, data, retry = true) {
    const fetchUrl = `${exports.baseApi}/${path}`;
    try {
        const fetchResponse = await node_fetch_1.default(fetchUrl, {
            agent: () => exports.httpsAgent,
            headers: {
                key: process.env.key,
                'content-type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await fetchResponse.json();
    }
    catch (err) {
        if (retry) {
            // wait 5 seconds and retry
            await new Promise(resolve => setTimeout(resolve, 5000));
            return await postApi(path, data, false);
        }
        else {
            throw err;
        }
    }
}
async function updateConstants() {
    exports.skyblockConstantValues = await fetchApi('constants');
}
setInterval(updateConstants, 60 * 60 * 1000); // update every hour
updateConstants();
/**
 * Fetch a player
 * @param user A username or UUID
 * @param basic Whether it should only return very basic information about the user
 * @param customization Whether it should return extra customization data like the player's selected pack and background
 */
async function fetchPlayer(user, basic = false, customization = false) {
    return await fetchApi(`player/${user}?basic=${basic}&customization=${customization}`);
}
exports.fetchPlayer = fetchPlayer;
/**
 * Fetch a profile
 * @param user A username or UUID
 * @param profile A profile name or UUID
 * @param customization Whether it should return extra customization data like the player's selected pack and background
 */
async function fetchProfile(user, profile, customization = false) {
    return await fetchApi(`player/${user}/${profile}?customization=${customization}`);
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
async function itemToUrl(item, packName) {
    const stringifiedItem = (packName || 'packshq') + JSON.stringify(item);
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
    let textureUrl;
    if (item.head_texture)
        textureUrl = `https://mc-heads.net/head/${item.head_texture}`;
    else
        textureUrl = await skyblockAssets.getTextureUrl({
            id: item.vanillaId,
            nbt: itemNbt,
            pack: packName || 'packshq'
        });
    if (!textureUrl) {
        console.log('no texture', item);
    }
    itemToUrlCache.set(stringifiedItem, textureUrl);
    return textureUrl;
}
exports.itemToUrl = itemToUrl;
function itemToUrlCached(item, packName) {
    if (!item)
        return null;
    const stringifiedItem = (packName || 'packshq') + JSON.stringify(item);
    return itemToUrlCache.get(stringifiedItem);
}
exports.itemToUrlCached = itemToUrlCached;
/** Get all the items in an inventories object to cache them */
async function cacheInventories(inventories, packName) {
    const promises = [];
    for (const inventoryItems of Object.values(inventories !== null && inventories !== void 0 ? inventories : {}))
        for (const inventoryItem of inventoryItems)
            if (inventoryItem)
                promises.push(itemToUrl(inventoryItem, packName));
    await Promise.all(promises);
}
exports.cacheInventories = cacheInventories;
async function createSession(code) {
    return await postApi(`accounts/createsession`, { code });
}
exports.createSession = createSession;
async function fetchSession(sessionId) {
    return await postApi(`accounts/session`, { uuid: sessionId });
}
exports.fetchSession = fetchSession;
async function updateAccount(data) {
    // this is checked with the key env variable, so it's mostly secure
    return await postApi(`accounts/update`, data);
}
exports.updateAccount = updateAccount;
const INVENTORIES = {
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
