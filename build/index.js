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
const app = express_1.default();
app.use(cookie_parser_1.default());
app.use(express_1.default.json());
const env = nunjucks.configure('src/views', {
    autoescape: true,
    express: app,
});
// we need this extension to have sections work correctly
env.addExtension('WithExtension', new nunjucks_with_1.default());
env.addGlobal('BASE_API', hypixel_1.baseApi);
env.addGlobal('getTime', () => (new Date()).getTime() / 1000);
const hash = crypto_1.default.createHash('sha1');
hash.setEncoding('hex');
hash.write(fsSync.readFileSync('src/public/style.css'));
hash.end();
env.addGlobal('styleFileHash', hash.read());
env.addGlobal('getConstants', () => hypixel_1.skyblockConstantValues);
env.addFilter('itemToUrl', (item, packName) => hypixel_1.itemToUrlCached(item, packName));
env.addFilter('itemNameToUrl', (item, packName) => hypixel_1.itemToUrlCached(hypixel_1.skyblockItemNameToItem(item), packName));
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
let donators = [];
async function initDonators() {
    const donatorsFileRaw = await fs_1.promises.readFile('src/donators.txt', { encoding: 'ascii' });
    const donatorUuids = donatorsFileRaw.split('\n').filter(u => u).map(u => u.split(' ')[0]);
    const promises = [];
    for (const donatorUuid of donatorUuids) {
        promises.push(hypixel_1.fetchPlayer(donatorUuid, true));
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
    const data = await hypixel_1.fetchPlayer(req.params.user, false, true);
    if (req.params.user !== ((_a = data === null || data === void 0 ? void 0 : data.player) === null || _a === void 0 ? void 0 : _a.username))
        return res.redirect(`/player/${data.player.username}`);
    res.render('profiles.njk', { data });
});
app.get('/profile/:user', async (req, res) => {
    const player = await hypixel_1.fetchPlayer(req.params.user);
    if (player && player.activeProfile) {
        const activeProfileId = player.activeProfile;
        const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId);
        if (activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name)
            return res.redirect(`/player/${player.player.username}/${activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name}`);
    }
    return res.status(404).send('Not found');
});
app.get('/player/:user/:profile', async (req, res) => {
    var _a, _b, _c;
    const data = await hypixel_1.fetchProfile(req.params.user, req.params.profile, true);
    if (!data)
        return res.status(404).send('Not found');
    if (req.params.profile !== data.profile.name)
        return res.redirect(`/player/${data.member.username}/${data.profile.name}`);
    else if (req.params.user !== data.member.username)
        return res.redirect(`/player/${data.member.username}/${data.profile.name}`);
    const pack = (_a = req.query.pack) !== null && _a !== void 0 ? _a : (_b = data === null || data === void 0 ? void 0 : data.customization) === null || _b === void 0 ? void 0 : _b.pack;
    const backgroundUrl = (_c = data === null || data === void 0 ? void 0 : data.customization) === null || _c === void 0 ? void 0 : _c.backgroundUrl;
    if (req.query.simple !== undefined)
        return res.render('member-simple.njk', { data });
    await hypixel_1.cacheInventories(data.member.inventories, pack);
    res.render('member.njk', { data, pack, backgroundUrl });
});
app.get('/leaderboard/:name', async (req, res) => {
    const data = await hypixel_1.fetchLeaderboard(req.params.name);
    res.render('leaderboard.njk', { data });
});
app.get('/leaderboards/:name', async (req, res) => {
    res.redirect(`/leaderboard/${req.params.name}`);
});
app.get('/leaderboards', async (req, res) => {
    const data = await hypixel_1.fetchLeaderboards();
    const promises = [];
    for (const leaderboardName of data.collection) {
        promises.push(hypixel_1.skyblockItemToUrl(leaderboardName.slice(11)));
    }
    await Promise.all(promises);
    res.render('leaderboards.njk', { data });
});
app.get('/leaderboard', async (req, res) => {
    res.redirect('/leaderboards');
});
const DISCORD_CLIENT_ID = '656634948148527107';
app.get('/login', async (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=https://${req.headers.host}%2Floggedin&response_type=code&scope=identify`);
});
app.get('/loggedin', async (req, res) => {
    const response = await hypixel_1.createSession(req.query.code);
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
// we use bodyparser to be able to get data from req.body
const urlencodedParser = body_parser_1.default.urlencoded({ extended: false });
app.post('/verify', urlencodedParser, async (req, res) => {
    var _a, _b;
    if (!req.cookies.sid)
        return res.redirect('/login');
    if (!req.body.ign)
        return res.redirect('/verify');
    const session = await hypixel_1.fetchSession(req.cookies.sid);
    if (!session)
        return res.redirect('/login');
    const username = req.body.ign;
    const player = await hypixel_1.fetchPlayer(username, true);
    const hypixelDiscordName = (_b = (_a = player === null || player === void 0 ? void 0 : player.player) === null || _a === void 0 ? void 0 : _a.socials) === null || _b === void 0 ? void 0 : _b.discord;
    if (!hypixelDiscordName)
        return res.render('account/verify.njk', { error: 'Please link your Discord in Hypixel by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.' });
    const actualDiscordName = session.session.discord_user.name;
    const actualDiscordIdDiscrim = session.session.discord_user.id + '#' + session.session.discord_user.name.split('#')[1];
    if (!(hypixelDiscordName === actualDiscordName || hypixelDiscordName === actualDiscordIdDiscrim))
        return res.render('account/verify.njk', { error: `You\'re linked to ${hypixelDiscordName} on Hypixel, change this to ${actualDiscordName} by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.` });
    await hypixel_1.updateAccount({
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
    const session = await hypixel_1.fetchSession(req.cookies.sid);
    if (!session)
        return res.redirect('/login');
    const player = await hypixel_1.fetchPlayer(session.account.minecraftUuid);
    res.render('account/profile.njk', { player, customization: session.account.customization, backgroundNames });
});
app.post('/profile', urlencodedParser, async (req, res) => {
    if (!req.cookies.sid)
        return res.redirect('/login');
    const session = await hypixel_1.fetchSession(req.cookies.sid);
    if (!session)
        return res.redirect('/login');
    const backgroundName = req.body['background'];
    // prevent people from putting non-existent backgrounds
    if (backgroundName && !backgroundNames.includes(backgroundName))
        return res.send('That background doesn\'t exist. ');
    const backgroundUrl = backgroundName ? `/backgrounds/${backgroundName}` : undefined;
    const customization = session.account.customization || {};
    if (req.body.pack)
        customization.pack = req.body.pack;
    if (backgroundUrl)
        customization.backgroundUrl = backgroundUrl;
    await hypixel_1.updateAccount({
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
// we use serveStatic so it caches
app.use(serve_static_1.default('src/public'));
// this should always be the last route!
// shortcut that redirects the user to their active profile
app.get('/:user', async (req, res) => {
    const player = await hypixel_1.fetchPlayer(req.params.user);
    if (player && player.activeProfile) {
        const activeProfileId = player.activeProfile;
        const activeProfileName = player.profiles.find((profile) => profile.uuid === activeProfileId);
        if (activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name)
            return res.redirect(`/player/${player.player.username}/${activeProfileName === null || activeProfileName === void 0 ? void 0 : activeProfileName.name}`);
    }
    return res.status(404).send('Not found');
});
app.listen(8081, () => console.log('App started :)'));
