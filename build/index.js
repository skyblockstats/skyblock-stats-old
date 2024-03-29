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
const hypixel_1 = require("./hypixel");
const util_1 = require("./util");
const nunjucks_with_1 = __importDefault(require("@allmarkedup/nunjucks-with"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const serve_static_1 = __importDefault(require("serve-static"));
const nunjucks = __importStar(require("nunjucks"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = require("fs");
const express_1 = __importDefault(require("express"));
const fsSync = __importStar(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
const env = nunjucks.configure('src/views', {
    autoescape: true,
    express: app,
});
// we need this extension to have sections work correctly
env.addExtension('WithExtension', new nunjucks_with_1.default());
env.addGlobal('BASE_API', hypixel_1.baseApi);
env.addGlobal('getTime', () => Date.now() / 1000);
env.addGlobal('colorCodes', util_1.colorCodes);
const hash = crypto_1.default.createHash('sha1');
hash.setEncoding('hex');
hash.write(fsSync.readFileSync('src/public/style.css'));
hash.end();
env.addGlobal('styleFileHash', hash.read());
env.addGlobal('getConstants', () => hypixel_1.skyblockConstantValues);
env.addGlobal('skyblockTime', util_1.skyblockTime);
env.addFilter('itemToUrl', (item, packName) => (0, hypixel_1.itemToUrlCached)(item, packName));
env.addFilter('itemNameToUrl', (item, packName) => (0, hypixel_1.itemToUrlCached)((0, hypixel_1.skyblockItemNameToItem)(item), packName));
env.addFilter('append', (arr, item) => arr.concat(item));
env.addFilter('slice', (arr, start, end) => arr.slice(start, end));
env.addFilter('startsWith', (string, substring) => string.startsWith(substring));
env.addFilter('cleannumber', util_1.cleanNumber);
env.addFilter('clean', util_1.clean);
env.addFilter('formattingCodeToHtml', util_1.formattingCodeToHtml);
env.addFilter('removeFormattingCode', util_1.removeFormattingCode);
env.addFilter('romanNumerals', util_1.toRomanNumerals);
env.addFilter('shuffle', util_1.shuffle);
env.addFilter('isString', o => typeof o === 'string');
env.addFilter('round', o => Math.round(o));
env.addFilter('formatnumber', (n, digits = 3) => {
    // from https://stackoverflow.com/a/9462382 with some modifications
    const numberSymbolsLookup = [
        { value: 1, symbol: '' },
        { value: 1e3, symbol: 'k' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'G' },
        { value: 1e12, symbol: 'T' },
        { value: 1e15, symbol: 'P' },
        { value: 1e18, symbol: 'E' },
    ];
    const item = numberSymbolsLookup.slice().reverse().find(item => n >= item.value);
    return (n / item.value).toPrecision(digits).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + item.symbol;
});
env.addFilter('trim', (s) => s.trim());
// convert all the emojis in a string into images
env.addFilter('twemojiHtml', (s) => {
    let htmlEncoded = s.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;');
    // replace unicode emojis with <img src="/emoji/[hex].svg">
    let asTwemoji = htmlEncoded.replace(emojiRegex, (match) => {
        return `<img src="/emoji/${[...match].map(p => p.codePointAt(0).toString(16)).join('-')}.svg" class="emoji">`;
    });
    return asTwemoji;
});
const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
let emojis = {};
// list items in src/public/emoji
// and create a map of emoji hex to emoji unicode
async function initEmojis() {
    const emojiFiles = await fs_1.promises.readdir('src/public/emoji');
    for (const file of emojiFiles) {
        const hex = file.split('.')[0];
        // get the unicode emoji from the hex, codepoints are separated by '-'
        const emoji = hex.split('-').map(p => String.fromCodePoint(parseInt(p, 16))).join('');
        emojis[hex] = emoji;
    }
}
initEmojis();
let donators = [];
const admins = [
    '6536bfed869548fd83a1ecd24cf2a0fd' // mat
];
async function initDonators() {
    const donatorsFileRaw = await fs_1.promises.readFile('src/donators.txt', { encoding: 'ascii' });
    const donatorUuids = donatorsFileRaw.split('\n').filter(u => u).map(u => u.split(' ')[0]);
    const promises = [];
    for (const donatorUuid of donatorUuids) {
        promises.push((0, hypixel_1.fetchPlayer)(donatorUuid, true));
    }
    donators = await Promise.all(promises);
}
initDonators();
app.get('/', (req, res) => {
    res.render('index.njk', { donators, loggedIn: req.cookies.sid !== undefined });
});
app.get('/chat', (req, res) => {
    res.render('fakechat.njk');
});
app.get('/player/:user', async (req, res) => {
    var _a;
    let data;
    try {
        data = await (0, hypixel_1.fetchPlayer)(req.params.user, false, true);
    }
    catch (err) {
        if (err instanceof hypixel_1.NotFound)
            return res.status(404).render('errors/notfound.njk');
        else
            throw err;
    }
    if (data.profiles.length === 0) {
        return res.status(404).render('errors/noprofiles.njk', { data });
    }
    if (req.params.user !== ((_a = data === null || data === void 0 ? void 0 : data.player) === null || _a === void 0 ? void 0 : _a.username))
        return res.redirect(`/player/${data.player.username}`);
    res.render('profiles.njk', { data });
});
app.get('/profile/:user', async (req, res) => {
    const player = await (0, hypixel_1.fetchPlayer)(req.params.user);
    if (player && player.activeProfile) {
        const activeProfileId = player.activeProfile;
        const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId);
        if (activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name)
            return res.redirect(`/player/${player.player.username}/${activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name}`);
    }
    return res.status(404).render('errors/notfound.njk');
});
app.get('/player/:user/:profile', async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    let data;
    try {
        data = await (0, hypixel_1.fetchProfile)(req.params.user, req.params.profile, true);
    }
    catch (err) {
        if (err instanceof hypixel_1.NotFound)
            return res.redirect(`/player/${req.params.user}`);
        else
            throw err;
    }
    if (req.params.profile !== data.profile.name)
        return res.redirect(`/player/${data.member.username}/${data.profile.name}`);
    else if (req.params.user !== data.member.username)
        return res.redirect(`/player/${data.member.username}/${data.profile.name}`);
    const pack = (_a = req.query.pack) !== null && _a !== void 0 ? _a : (_b = data === null || data === void 0 ? void 0 : data.customization) === null || _b === void 0 ? void 0 : _b.pack;
    const backgroundUrl = (_c = data === null || data === void 0 ? void 0 : data.customization) === null || _c === void 0 ? void 0 : _c.backgroundUrl;
    const blurBackground = (_e = (_d = data === null || data === void 0 ? void 0 : data.customization) === null || _d === void 0 ? void 0 : _d.blurBackground) !== null && _e !== void 0 ? _e : false;
    const emoji = (_g = (_f = data === null || data === void 0 ? void 0 : data.customization) === null || _f === void 0 ? void 0 : _f.emoji) !== null && _g !== void 0 ? _g : false;
    if (req.query.simple !== undefined)
        return res.render('member-simple.njk', { data });
    const promises = [];
    for (const coll of data.member.collections) {
        promises.push((0, hypixel_1.skyblockItemToUrl)(coll.name));
    }
    await (0, hypixel_1.cacheInventories)(data.member.inventories, pack);
    await Promise.all(promises);
    res.render('member.njk', { data, pack, backgroundUrl, blurBackground, emoji });
});
app.get('/leaderboard/:name', async (req, res) => {
    const data = await (0, hypixel_1.fetchLeaderboard)(req.params.name);
    await (0, hypixel_1.skyblockItemToUrl)(data.name.slice(11));
    res.render('leaderboard.njk', { data });
});
app.get('/leaderboards/:name', async (req, res) => {
    res.redirect(`/leaderboard/${req.params.name}`);
});
app.get('/leaderboards', async (req, res) => {
    const data = await (0, hypixel_1.fetchLeaderboards)();
    const promises = [];
    for (const leaderboardName of data.collection) {
        promises.push((0, hypixel_1.skyblockItemToUrl)(leaderboardName.slice(11)));
    }
    await Promise.all(promises);
    res.render('leaderboards.njk', { data });
});
app.get('/leaderboard', async (req, res) => {
    res.redirect('/leaderboards');
});
const DISCORD_CLIENT_ID = '885347559382605916';
app.get('/login', async (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=https://${req.headers.host}%2Floggedin&response_type=code&scope=identify`);
});
app.get('/loggedin', async (req, res) => {
    const response = await (0, hypixel_1.createSession)(req.query.code);
    console.log('response', response);
    if (response.ok) {
        res.cookie('sid', response.session_id, { maxAge: 31536000000 });
        res.redirect('/verify');
    }
    else
        res.redirect('/login');
});
app.get('/verify', async (req, res) => {
    if (!req.cookies.sid)
        return res.redirect('/login');
    res.render('account/verify.njk');
});
app.get('/election', async (req, res) => {
    const data = await (0, hypixel_1.fetchElection)();
    res.render('election.njk', { data });
});
// we use bodyparser to be able to get data from req.body
const urlencodedParser = body_parser_1.default.urlencoded({ extended: false });
app.post('/verify', urlencodedParser, async (req, res) => {
    var _a, _b;
    if (!req.cookies.sid)
        return res.redirect('/login');
    if (!req.body.ign)
        return res.redirect('/verify');
    const session = await (0, hypixel_1.fetchSession)(req.cookies.sid);
    if (!session)
        return res.redirect('/login');
    const username = req.body.ign;
    const player = await (0, hypixel_1.fetchPlayer)(username, true);
    const hypixelDiscordName = (_b = (_a = player === null || player === void 0 ? void 0 : player.player) === null || _a === void 0 ? void 0 : _a.socials) === null || _b === void 0 ? void 0 : _b.discord;
    if (!hypixelDiscordName)
        return res.render('account/verify.njk', { error: 'Please link your Discord in Hypixel by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.' });
    const actualDiscordName = session.session.discord_user.name;
    const actualDiscordIdDiscrim = session.session.discord_user.id + '#' + session.session.discord_user.name.split('#')[1];
    if (!(hypixelDiscordName === actualDiscordName || hypixelDiscordName === actualDiscordIdDiscrim))
        return res.render('account/verify.njk', { error: `You\'re linked to ${hypixelDiscordName} on Hypixel, change this to ${actualDiscordName} by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.` });
    await (0, hypixel_1.updateAccount)({
        discordId: session.session.discord_user.id,
        minecraftUuid: player.player.uuid
    });
    res.redirect('/profile');
});
let backgroundNames;
fs_1.promises.readdir('src/public/backgrounds').then(names => {
    backgroundNames = names;
});
app.get('/profile', async (req, res) => {
    if (!req.cookies.sid)
        return res.redirect('/login');
    const session = await (0, hypixel_1.fetchSession)(req.cookies.sid);
    if (!session || !session.account)
        return res.redirect('/login');
    const isDonator = !!donators.find(u => u.player.uuid === session.account.minecraftUuid);
    const isAdmin = !!admins.find(u => u === session.account.minecraftUuid);
    const player = await (0, hypixel_1.fetchPlayer)(session.account.minecraftUuid);
    res.render('account/profile.njk', {
        player,
        customization: session.account.customization,
        backgroundNames,
        isDonator: isDonator || isAdmin,
        emojis
    });
});
app.post('/profile', urlencodedParser, async (req, res) => {
    if (!req.cookies.sid)
        return res.redirect('/login');
    const session = await (0, hypixel_1.fetchSession)(req.cookies.sid);
    if (!session)
        return res.redirect('/login');
    const backgroundName = req.body['background'];
    // prevent people from putting non-existent backgrounds
    if (backgroundName && !backgroundNames.includes(backgroundName))
        return res.send('That background doesn\'t exist. ');
    const backgroundUrl = backgroundName ? `/backgrounds/${backgroundName}` : undefined;
    const isDonator = !!donators.find(u => u.player.uuid === session.account.minecraftUuid);
    const isAdmin = !!admins.find(u => u === session.account.minecraftUuid);
    const customization = session.account.customization || {};
    if (req.body.pack)
        customization.pack = req.body.pack;
    if (backgroundUrl)
        customization.backgroundUrl = backgroundUrl;
    if (req.body['blur-toggle'])
        customization.blurBackground = req.body['blur-toggle'] === 'on';
    if (req.body['emoji'] !== undefined) {
        const emoji = req.body['emoji'];
        const matched = emoji.match(emojiRegex);
        // if this isn't an emoji, remove the emoji from their profile
        if (emoji === '' || matched.length !== 1 || matched[0] !== emoji)
            customization.emoji = '';
        else if (isDonator || isAdmin) {
            customization.emoji = emoji;
        }
    }
    await (0, hypixel_1.updateAccount)({
        discordId: session.account.discordId,
        customization
    });
    res.redirect('/profile');
});
// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
    res.redirect('/player/' + req.body['user-search']);
});
app.get('/profiles/:user', async (req, res) => {
    res.redirect(`/player/${req.params.user}`);
});
app.get('/profile/:user/:profile', async (req, res) => {
    res.redirect(`/player/${req.params.user}/${req.params.profile}`);
});
app.get('/chat.png', async (req, res) => {
    const query = {};
    for (const key of Object.keys(req.query)) {
        query[key] = req.query[key].toString();
    }
    const queryString = new URLSearchParams(query).toString();
    res.redirect(`https://fake-chat.matdoes.dev/render.png?${queryString}`);
});
app.use((0, serve_static_1.default)('src/public', {
    maxAge: 86400000
}));
// this should always be the last route!
// shortcut that redirects the user to their active profile
app.get('/:user', async (req, res) => {
    let player;
    try {
        player = await (0, hypixel_1.fetchPlayer)(req.params.user);
    }
    catch (err) {
        if (err instanceof hypixel_1.NotFound)
            return res.status(404).render('errors/notfound.njk');
        else
            throw err;
    }
    if (player && player.activeProfile) {
        const activeProfileId = player.activeProfile;
        const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId);
        if (activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name)
            return res.redirect(`/player/${player.player.username}/${activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name}`);
    }
    return res.status(404).render('errors/notfound.njk');
});
app.use((req, res, next) => {
    return res.status(404).render('errors/notfound.njk');
});
app.listen(8081, () => console.log('App started :)'));
