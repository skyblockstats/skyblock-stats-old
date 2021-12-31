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
exports.updateAccount = exports.fetchSession = exports.createSession = exports.cacheInventories = exports.itemToUrlCached = exports.skyblockItemNameToItem = exports.skyblockItemToUrl = exports.itemToUrl = exports.fetchLeaderboards = exports.fetchLeaderboard = exports.fetchProfile = exports.fetchPlayer = exports.NotFound = exports.skyblockConstantValues = exports.agent = exports.baseApi = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const node_cache_1 = __importDefault(require("node-cache"));
const https_1 = require("https");
const vanilla_damages_json_1 = __importDefault(require("skyblock-assets/data/vanilla_damages.json"));
const http_1 = require("http");
const skyblockAssets = __importStar(require("skyblock-assets"));
if (!process.env.key)
    // if there's no key in env, run dotenv
    require('dotenv').config();
exports.baseApi = 'https://skyblock-api.matdoes.dev';
if (exports.baseApi.startsWith('https://'))
    exports.agent = new https_1.Agent({
        keepAlive: true
    });
else
    exports.agent = new http_1.Agent({
        keepAlive: true
    });
exports.skyblockConstantValues = null;
class NotFound extends Error {
}
exports.NotFound = NotFound;
/**
 * Fetch skyblock-api
 * @param path The url path, for example `player/py5/Strawberry`. This shouldn't have any trailing slashes
 * @param retry How many times it'll retry the request before failing
 */
async function fetchApi(path, retry = 3) {
    const fetchUrl = `${exports.baseApi}/${path}`;
    try {
        const fetchResponse = await (0, node_fetch_1.default)(fetchUrl, {
            agent: () => exports.agent,
            headers: { key: process.env.key },
        });
        if (fetchResponse.status === 404)
            throw new NotFound();
        return await fetchResponse.json();
    }
    catch (err) {
        if (err instanceof NotFound)
            throw err;
        if (retry > 0) {
            // wait 5 seconds and retry
            await new Promise(resolve => setTimeout(resolve, 5000));
            return await fetchApi(path, retry - 1);
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
        const fetchResponse = await (0, node_fetch_1.default)(encodeURI(fetchUrl), {
            agent: () => exports.agent,
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
    var _a;
    const stringifiedItem = (packName !== null && packName !== void 0 ? packName : 'packshq') + JSON.stringify(item);
    if (itemToUrlCache.has(stringifiedItem))
        return itemToUrlCache.get(stringifiedItem);
    const itemNbt = {
        display: {
            Name: (_a = item.display) === null || _a === void 0 ? void 0 : _a.name
        },
        ExtraAttributes: {
            id: item.id,
        },
    };
    let textureUrl;
    if (item.head_texture)
        textureUrl = `https://mc-heads.net/head/${item.head_texture}`;
    else
        textureUrl = await skyblockAssets.getTextureUrl({
            id: item.vanillaId,
            nbt: itemNbt,
            pack: packName !== null && packName !== void 0 ? packName : 'packshq'
        });
    if (!textureUrl) {
        console.log('no texture', item);
    }
    itemToUrlCache.set(stringifiedItem, textureUrl);
    return textureUrl;
}
exports.itemToUrl = itemToUrl;
async function skyblockItemToUrl(skyblockItemName) {
    let item = skyblockItemNameToItem(skyblockItemName);
    const itemTextureUrl = await itemToUrl(item, 'packshq');
    return itemTextureUrl;
}
exports.skyblockItemToUrl = skyblockItemToUrl;
function skyblockItemNameToItem(skyblockItemName) {
    let item;
    if (Object.keys(skyblockItems).includes(skyblockItemName)) {
        item = skyblockItems[skyblockItemName];
    }
    else {
        item = {
            vanillaId: `minecraft:${skyblockItemName}`
        };
    }
    return item;
}
exports.skyblockItemNameToItem = skyblockItemNameToItem;
const skyblockItems = {
    ink_sac: { vanillaId: 'minecraft:dye' },
    cocoa_beans: { vanillaId: 'minecraft:dye:3' },
    lapis_lazuli: { vanillaId: 'minecraft:dye:4' },
    lily_pad: { vanillaId: 'minecraft:waterlily' },
    melon_slice: { vanillaId: 'minecraft:melon' },
    mithril_ore: {
        vanillaId: 'minecraft:prismarine_crystals',
        display: { name: 'Mithril Ore' }
    },
    acacia_log: { vanillaId: 'minecraft:log2' },
    birch_log: { vanillaId: 'minecraft:log:2' },
    cod: { vanillaId: 'minecraft:fish' },
    dark_oak_log: { vanillaId: 'minecraft:log2:1' },
    jungle_log: { vanillaId: 'minecraft:log:3' },
    oak_log: { vanillaId: 'minecraft:log' },
    pufferfish: { vanillaId: 'minecraft:fish:3' },
    salmon: { vanillaId: 'minecraft:fish:1' },
    spruce_log: { vanillaId: 'minecraft:log:1' },
    // hypixel named the collection "gemstone_collection" instead of "gemstone"
    gemstone_collection: {
        vanillaId: 'minecraft:skull',
        head_texture: '39b6e047d3b2bca85e8cc49e5480f9774d8a0eafe6dfa9559530590283715142'
    },
    hard_stone: { vanillaId: 'minecraft:stone' },
};
function itemToUrlCached(item, packName) {
    var _a;
    if (!item)
        return null;
    if (typeof item === 'string') {
        let itemId = (_a = vanilla_damages_json_1.default[item]) !== null && _a !== void 0 ? _a : item;
        let damage = null;
        if (itemId.startsWith('minecraft:'))
            itemId = itemId.slice('minecraft:'.length);
        if (itemId.includes(':')) {
            damage = parseInt(itemId.split(':')[1]);
            itemId = itemId.split(':')[0];
        }
        item = {
            count: 1,
            display: {
                glint: false,
                lore: null,
                name: null
            },
            id: null,
            vanillaId: `minecraft:${itemId}`
        };
    }
    const stringifiedItem = (packName !== null && packName !== void 0 ? packName : 'packshq') + JSON.stringify(item);
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
