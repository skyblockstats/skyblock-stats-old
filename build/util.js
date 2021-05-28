"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = exports.toRomanNumerals = exports.clean = exports.cleanNumber = exports.removeFormattingCode = exports.formattingCodeToHtml = void 0;
const colorCodes = {
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
    'f': '#ffffff',
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
            if (colorCodes[colorCharacter]) {
                if (currentColor !== colorCodes[colorCharacter]) { // make sure the color is different than the active one
                    // if there's already a color, close that tag
                    if (currentColor)
                        htmlOutput += '</span>';
                    currentColor = colorCodes[colorCharacter];
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
            htmlOutput += character;
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
