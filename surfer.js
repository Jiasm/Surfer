"use strict";
let http = require("http"),
    fs = require("fs"),
    uuid = require('node-uuid'),
    cheerio = require('cheerio'),
    url = "http://qq.yh31.com", // 爬哪儿网，聪明你的抠图
    linkForFucked = [],
    imgForFucked = [],
    allImages = [],
    allLinks = [],
    localReg = /^http(s)?\:\/\/[^\/]*/,
    fileNameReg = /[^/\\\\]+$/g,
    relatUrlReg = /^\/[^\/]/,
    suffixReg = /[A-z\d]+$/g,
    prefixReg = /^http(s)?\:/,
    maxImgThread = 5,           // 最大同时下载图片的数量
    currentImgCount = 0,    
    maxLinkThread = 2,          // 最大同时爬链接的数量
    currentLinkCount = 0,   
    timer = 20,                 // 用定时任务做的，每隔多少毫秒调用一次获取图片以及爬链接
    count = 1,
    onInit = true;
Array.prototype.includes = Array.prototype.includes || function(str) {
    return this.indexOf(str) >= 0;
}

function init() {
    surfingInInternet(url);
}

function surfingInInternet(url, local) {
    currentLinkCount++;
    url = (local || "") + url;
    let localName = url.match(localReg)[0],
        html = "";
    try {
        http.get(url, function(res) {
            //console.log("当前活跃的获取链接的线程数为：", currentLinkCount);
            if (!linkForFucked.includes(url)) {
                linkForFucked.push(url, url + "\/");
                res.on("data", (data) => html += data).on("end", () => {
                    let $ = cheerio.load(html),
                        imgList = Array.from($("img"), $img => ({
                            url: $($img).attr("src"),
                            local: localName
                        })),
                        linkList = Array.from($("a"), $link => ({
                            url: $($link).attr("href"),
                            local: localName
                        }));
                    paid(imgList, linkList);
                    currentLinkCount--;
                });
            }
        });
    } catch (e) {
        console.log("getHtml:", e);
    }
}

function paid(imgList, linkList) {
    allImages.push(...imgList);
    allLinks.push(...linkList);
    if (onInit) {
        onInit = false;
        fire();
    }
}

function fire() {
    let linkId = setInterval(linkControl, timer),
        imgId = setInterval(imgControl, timer);
    exitHandler(linkId, imgId);
}

function exitHandler(lId, iId) {
    setInterval(() => {
        if (allLinks.length === 0 && allImages.length === 0) {
            clearInterval(lId);
            clearInterval(iId);
            console.log("over");
        }
    }, timer)
}

function linkControl() {
    if (currentLinkCount < maxLinkThread && allLinks.length) {
        let first = allLinks.shift();
        if (!prefixReg.test(first.url)) {
            surfingInInternet(first.url, first.local);
        }
    }
}

function imgControl() {
    if (currentImgCount < maxImgThread && allImages.length) {
        let first = allImages.shift();
        if (!prefixReg.test(first.url)) {
            doDownload(first.url, first.local);
        }
    }
}
function doDownload(url, local) {
    let fileName = url.match(fileNameReg).pop().replace(/[^A-z\d\.]?/g, "").replace(/\^/g, ""), // 莫名其妙的bug
        suffixName = fileName.match(suffixReg).pop();
    url = local + url;
    if (!imgForFucked.includes(url)) {
        currentImgCount++;
        imgForFucked.push(url);
        try {
            http.get(url, (res) => {
                let imgData = "";
                res.setEncoding("binary");
                res.on("data", (chunk) => imgData += chunk);
                res.on("end", () => {
                    fs.writeFile("./resource/" + uuid.v1() + "." + suffixName, imgData, "binary", (err) => {
                        //console.log("当前活跃的获取图片的线程数为：", currentImgCount);
                        if (err) {
                            console.log("download error");
                        } else {
                            console.log("第", count++, "张", url);
                        }
                        currentImgCount--;
                    });
                });
            });
        } catch (e) {
            console.log("downloadImg:", e);
        }
    }
}

init();
