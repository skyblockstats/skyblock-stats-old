"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skyblockTime = exports.shuffle = exports.toRomanNumerals = exports.clean = exports.cleanNumber = exports.removeFormattingCode = exports.formattingCodeToHtml = exports.colorCodes = void 0;
exports.colorCodes = {
    '0': '#000000',
    '1': '#0000be',
    '2': '#00be00',
    '3': '#00bebe',
    '4': '#be0000',
    '5': '#be00be',
    '6': '#ffaa00',
    '7': '#bebebe',
    '8': '#3f3f3f',
    '9': '#3f3ffe',
    'a': '#3ffe3f',
    'b': '#3ffefe',
    'c': '#fe3f3f',
    'd': '#fe3ffe',
    'e': '#fefe3f',
    'f': '#ffffff', // white
};
const specialCodes = {
    'l': 'font-weight: bold'
};
const colorCodeCharacter = '§';
function formattingCodeToHtml(formatted) {
    let htmlOutput = '';
    // we store the hex code, not the formatting code
    let currentColor = null;
    // we store the css code, not the formatting code
    let activeSpecialCodes = [];
    function reset() {
        if (currentColor) {
            htmlOutput += '</span>';
            currentColor = null;
        }
        while (activeSpecialCodes.pop()) {
            htmlOutput += '</span>';
        }
    }
    while (formatted.length > 0) {
        const character = formatted[0];
        formatted = formatted.slice(1);
        // if it encounters § (or whatever colorCodeCharacter is), then read the next character
        if (character === colorCodeCharacter) {
            const colorCharacter = formatted[0];
            formatted = formatted.slice(1);
            if (exports.colorCodes[colorCharacter]) {
                if (currentColor !== exports.colorCodes[colorCharacter]) { // make sure the color is different than the active one
                    // if there's already a color, close that tag
                    if (currentColor)
                        htmlOutput += '</span>';
                    currentColor = exports.colorCodes[colorCharacter];
                    htmlOutput += `<span style="color: ${currentColor}">`;
                }
            }
            else if (specialCodes[colorCharacter]) {
                if (!activeSpecialCodes.includes(specialCodes[colorCharacter])) {
                    activeSpecialCodes.push(specialCodes[colorCharacter]);
                    htmlOutput += `<span style="${specialCodes[colorCharacter]}">`;
                }
            }
            else if (colorCharacter === 'r') {
                reset();
            }
        }
        else {
            // no xss!
            htmlOutput += character.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }
    reset();
    return htmlOutput;
}
exports.formattingCodeToHtml = formattingCodeToHtml;
function removeFormattingCode(formatted) {
    return formatted.replace(new RegExp(colorCodeCharacter + '.', 'g'), '');
}
exports.removeFormattingCode = removeFormattingCode;
function moveStringToEnd(word, thing) {
    if (thing.startsWith(`${word}_`))
        thing = thing.substr(`${word}_`.length) + `_${word}`;
    return thing;
}
function millisecondsToTime(totalMilliseconds) {
    const totalSeconds = totalMilliseconds / 1000;
    const totalMinutes = totalSeconds / 60;
    const totalHours = totalMinutes / 60;
    const totalDays = totalHours / 24;
    const milliseconds = Math.floor(totalMilliseconds) % 1000;
    const seconds = Math.floor(totalSeconds) % 60;
    const minutes = Math.floor(totalMinutes) % 60;
    const hours = Math.floor(totalHours) % 24;
    const days = Math.floor(totalDays);
    const stringUnits = [];
    if (days > 1)
        stringUnits.push(`${days} days`);
    else if (days == 1)
        stringUnits.push(`${days} day`);
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
            return millisecondsToTime(Math.abs(number));
        case 'date':
            return (new Date(number * 1000)).toUTCString();
    }
    return number.toLocaleString() + (unit ? (' ' + unit) : '');
}
exports.cleanNumber = cleanNumber;
function clean(thing) {
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
}
exports.clean = clean;
function toRomanNumerals(number) {
    return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'][number];
}
exports.toRomanNumerals = toRomanNumerals;
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
exports.shuffle = shuffle;
/** Get the seconds since epoch for a given SkyBlock date. The year, month, and day are 1 indexed. */
function skyblockTime(year, month = 1, day = 1) {
    const sbEpoch = 1560275700;
    let time = sbEpoch;
    if (year)
        time += 446400 * (year);
    if (month)
        time += 37200 * (month - 1);
    if (day)
        time += 1200 * (day - 1);
    return time;
}
exports.skyblockTime = skyblockTime;
