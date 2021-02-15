"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPlayer = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = require("https");
// import { Agent } from 'http'
if (!process.env.key)
    // if there's no key in env, run dotenv
    require('dotenv').config();
const baseApi = 'https://skyblock-api2.matdoes.dev'; // TODO: change this to skyblock-api.matdoes.dev once it replaces the old one
// const baseApi = 'http://localhost:8080'
// We need to create an agent to prevent memory leaks and to only do dns lookups once
const httpsAgent = new https_1.Agent({
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
