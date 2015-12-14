"use strict";
let http = require("http"),
    fs = require("fs"),
    html = "",
    cheerio = require('cheerio'),
    url = "http://qq.yh31.com",
    fucked = [url],
    localReg = /^http(s)?\:\/\/[^\/]*/,
    fileNameReg = /[^/\\\\]+$/g,
    relatUrlReg = /^\/[^\/]/,
    suffixReg = /[A-z\d]+$/g,
    prefixReg = /^http(s)?\:/;

function surfingInInternet(url) {
	let localName = url.match(localReg)[0];
    http.get(url, function(res) {
    	if (fucked.includes(url))
        res.on("data", (data) => html += data).on("end", () => {
            let $ = cheerio.load(html),
            	$imgs = $("img"),
            	imgList = Array.from($imgs, $img => $($img).attr("src")),
            	$links = $("a"),
            	linkList = Array.from($links, $link => $($link).attr("href"));
            //downloadImg(imgList, localName);
            for (let href of linkList) {
				more(href, localName);
            }
        });
    });
}
function more (href, url) {
	if (prefixReg.test(href)) {	// 说明是其他域的，就不进去了- -
		return ;
	}
	console.log(url + href);
}
function downloadImg(urlList, url) {
    for (let key of urlList) {
    	doDownload(key, url);
    }
}

function doDownload(src, url) {
	if (prefixReg.test(src)) {	// 说明是其他域的，就不进去了- -
		return ;
	}
	let fileName = src.match(fileNameReg).pop().replace(/[^A-z\d\.]?/g,"").replace(/\^/g,""),	// 莫名其妙的bug
		suffixName = fileName.match(suffixReg).pop();
	src = url + src;
    http.get(src, (res) => {
        let imgData = "";
        res.setEncoding("binary");
        res.on("data", (chunk) => imgData += chunk);
        res.on("end", function() {
            fs.writeFile("./resource/" + fileName, imgData, "binary", 
            	(err) => console.log(err?"down fail":"down success"));
        });
    });
}
surfingInInternet(url);