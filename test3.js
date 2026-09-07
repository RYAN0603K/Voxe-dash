const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(<!DOCTYPE html><button onclick="setTimeFilter('month')">Click me</button>);
const document = dom.window.document;

const mode = 'month';
const btn = document.querySelector(utton[onclick="setTimeFilter('')"]);
console.log(btn ? btn.textContent : 'Not found');