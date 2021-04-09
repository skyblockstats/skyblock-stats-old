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
const nunjucks_with_1 = __importDefault(require("@allmarkedup/nunjucks-with"));
const serve_static_1 = __importDefault(require("serve-static"));
const nunjucks = __importStar(require("nunjucks"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const env = nunjucks.configure('src/views', {
    autoescape: true,
    express: app,
});
// we need this extension to have sections work correctly
env.addExtension('WithExtension', new nunjucks_with_1.default());
env.addGlobal('BASE_API', hypixel_1.baseApi);
function moveStringToEnd(word, thing) {
    if (thing.startsWith(`${word}_`))
        thing = thing.substr(`${word}_`.length) + `_${word}`;
    return thing;
}
function millisecondsToTime(totalMilliseconds) {
    const totalSeconds = totalMilliseconds / 1000;
    const totalMinutes = totalSeconds / 60;
    const totalHours = totalMinutes / 60;
    const milliseconds = Math.floor(totalMilliseconds) % 1000;
    const seconds = Math.floor(totalSeconds) % 60;
    const minutes = Math.floor(totalMinutes) % 60;
    const hours = Math.floor(totalHours);
    const stringUnits = [];
    if (hours > 1)
        stringUnits.push(`${hours} hours`);
    else if (hours == 1)
        stringUnits.push(`${hours} hour`);
    if (minutes > 1)
        stringUnits.push(`${minutes} minutes`);
    else if (minutes == 1)
        stringUnits.push(`${minutes} minute`);
    if (seconds > 1)
        stringUnits.push(`${seconds} seconds`);
    else if (seconds == 1)
        stringUnits.push(`${seconds} second`);
    if (milliseconds > 1)
        stringUnits.push(`${milliseconds} milliseconds`);
    else if (milliseconds == 1)
        stringUnits.push(`${milliseconds} millisecond`);
    return stringUnits.slice(0, 2).join(' and ');
}
function cleanNumber(number, unit) {
    switch (unit) {
        case 'time':
            return millisecondsToTime(number);
        case 'date':
            return (new Date(number * 1000)).toUTCString();
    }
    return number.toLocaleString() + ' ' + unit;
}
env.addFilter('cleannumber', cleanNumber);
env.addFilter('clean', (thing) => {
    if (typeof thing === 'number') {
        return cleanNumber(thing);
    }
    else {
        for (const string of ['deaths', 'kills', 'collection', 'skill'])
            thing = moveStringToEnd(string, thing);
        return thing
            .replace(/^./, thing[0].toUpperCase())
            .replace(/_/g, ' ');
    }
});
app.get('/', (req, res) => {
    res.render('index.njk', {});
});
app.get('/player/:user', async (req, res) => {
    const data = await hypixel_1.fetchPlayer(req.params.user);
    res.render('profiles.njk', { data });
});
app.get('/player/:user/:profile', async (req, res) => {
    const data = await hypixel_1.fetchProfile(req.params.user, req.params.profile);
    res.render('member.njk', { data });
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
// we use bodyparser to be able to get data from req.body
const urlencodedParser = body_parser_1.default.urlencoded({ extended: false });
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
