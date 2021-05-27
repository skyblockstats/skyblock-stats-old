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
const express_1 = __importDefault(require("express"));
const serve_static_1 = __importDefault(require("serve-static"));
const nunjucks = __importStar(require("nunjucks"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = require("fs");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
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
env.addGlobal('getConstants', () => hypixel_1.skyblockConstantValues);
env.addFilter('itemToUrl', (item, packName) => {
    return hypixel_1.itemToUrlCached(item, packName);
});
env.addFilter('append', (arr, item) => arr.concat(item));
env.addFilter('slice', (arr, start, end) => arr.slice(start, end));
env.addFilter('startsWith', (string, substring) => string.startsWith(substring));
env.addFilter('cleannumber', util_1.cleanNumber);
env.addFilter('clean', util_1.clean);
env.addFilter('formattingCodeToHtml', util_1.formattingCodeToHtml);
env.addFilter('romanNumerals', util_1.toRomanNumerals);
env.addFilter('shuffle', util_1.shuffle);
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
    res.render('index.njk', { donators });
});
app.get('/chat', (req, res) => {
    res.render('fakechat.njk');
});
app.get('/player/:user', async (req, res) => {
    const data = await hypixel_1.fetchPlayer(req.params.user);
    res.render('profiles.njk', { data });
});
app.get('/player/:user/:profile', async (req, res) => {
    var _a, _b;
    const data = await hypixel_1.fetchProfile(req.params.user, req.params.profile, true);
    const pack = (_a = req.query.pack) !== null && _a !== void 0 ? _a : (_b = data === null || data === void 0 ? void 0 : data.customization) === null || _b === void 0 ? void 0 : _b.pack;
    if (req.query.simple !== undefined)
        return res.render('member-simple.njk', { data });
    await hypixel_1.cacheInventories(data.member.inventories, pack);
    res.render('member.njk', { data, pack });
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
    res.render('leaderboards.njk', { data });
});
app.get('/leaderboard', async (req, res) => {
    res.redirect('/leaderboards');
});
const DISCORD_CLIENT_ID = '656634948148527107';
app.get('/login', async (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=http${req.secure ? 's' : ''}://${req.headers.host}%2Floggedin&response_type=code&scope=identify`);
});
app.get('/loggedin', async (req, res) => {
    const response = await hypixel_1.createSession(req.query.code);
    if (response.ok) {
        res.cookie('sid', response.session_id);
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
    const actualDiscordName = session.discord_user.name;
    const actualDiscordIdDiscrim = session.discord_user.id + '#' + session.discord_user.name.split('#')[1];
    if (!(hypixelDiscordName === actualDiscordName || hypixelDiscordName === actualDiscordIdDiscrim))
        return res.render('account/verify.njk', { error: `You\'re linked to ${hypixelDiscordName} on Hypixel, change this to ${actualDiscordName} by doing /profile -> Social media -> Discord. If you just changed it, wait a few minutes and try again.` });
    await hypixel_1.updateAccount({
        discordId: session.discord_user.id,
        minecraftUuid: player.player.uuid
    });
    res.redirect('/profile');
});
app.get('/profile', async (req, res) => {
    if (!req.cookies.sid)
        return res.redirect('/login');
    res.render('account/profile.njk');
});
// redirect post requests from /player to /player/:user
app.post('/player', urlencodedParser, (req, res) => {
    res.redirect('/player/' + req.body['user-search']);
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
