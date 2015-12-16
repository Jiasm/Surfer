"use strict";
let http = require("http"),
    fs = require("fs"),
    uuid = require('node-uuid'),
    superagent = require("superagent"),
    cheerio = require('cheerio'),
    localReg = /^http(s)?\:\/\/[^\/]*/,
    fileNameReg = /[^/\\\\]+$/g,
    relatUrlReg = /^\/[^\/]/,
    suffixReg = /[A-z\d]+$/g,
    prefixReg = /^http(s)?\:/,
    url = "http://qq.yh31.com", // 爬哪儿网，聪明你的抠图
    location = "./resource/",   // 图要存哪儿
    linkForFucked = [],         // 被爬过的链接
    imgForFucked = [],          // 被爬过的图
    allLinks = [],              // 爬出来的链接（到最后肯定是空的，如果正常执行完的话）
    allImages = [],             // 爬出来的图（同上）
    maxLinkThread = 5,          // 最大同时爬链接的数量
    currentLinkCount = 0,       // 当前活着的爬链接的数量
    maxImgThread = 50,          // 最大同时下载图片的数量
    currentImgCount = 0,        // 当前活着的下载图片的数量
    growth = true,              // 是否开启成长型爬虫（就是动态增长两个Max的值）
    timer = 20,                 // 用定时任务做的，每隔多少毫秒调用一次获取图片以及爬链接
    count = 1,                  // 已经爬了多少张图了，主要做log输出用
    onInit = true;              // 无视它

Array.prototype.includes = Array.prototype.includes || function(str) {
    return this.indexOf(str) >= 0;
}


function surfingInInternet(url, local) {
    url = (local || "") + url;
    let localName = url.match(localReg)[0];
    try {
        if (!linkForFucked.includes(url)) {
            currentLinkCount++;
            linkForFucked.push(url, url + "\/");
            superagent
                .get(url)
                .end((err, resource) => {
                    //console.log("当前活跃的获取链接的线程数为：", currentLinkCount);
                    if (err) {
                        console.log(err);
                    }
                    if (resource && resource.text) {
                        let $ = cheerio.load(resource.text),
                            imgList = Array.from($("img"), $img => ({
                                url: $($img).attr("src"),
                                local: localName
                            })),
                            linkList = Array.from($("a"), $link => ({
                                url: $($link).attr("href"),
                                local: localName
                            }));
                        paid(imgList, linkList);
                    }
                    currentLinkCount--;
                });
        }
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
    if (growth) {
        setInterval(() => {
            maxLinkThread++;
            maxImgThread++;
        }, timer * 100)
    }
}

function exitHandler(lId, iId) {
    setInterval(() => {
        if (allLinks.length === 0 && allImages.length === 0) {
            clearInterval(lId);
            clearInterval(iId);
            console.log("over"); // 如果这输出了，已经就是说爬完了，但是我™从来没看到过
            process.exit(0);
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
    let fileName = url.match(fileNameReg);
    if (!fileName) {
        let bugName = location + uuid.v1() + ".bug.txt"; // 爬了两千多张，这里出错了，目测是路径问题，写到一个文本文件里边瞅瞅
        fs.writeFile(bugName, url, (err) => console.log("bug:", bugName));
        return;
    }
    suffixName = fileName.pop().replace(/\?.*/, "").match(suffixReg).pop();
    url = local + url;
    if (!imgForFucked.includes(url)) {
        currentImgCount++;
        imgForFucked.push(url);
        try {
            superagent
                .get(url)
                .redirects(2)
                .end((err, resource) => {
                    if (resource && resource.body) {
                        fs.writeFile(location + uuid.v1() + "." + suffixName, resource.body, "binary", (err) => {
                            //console.log("当前活跃的获取图片的线程数为：", currentImgCount);
                            if (err) {
                                console.log("download error");
                            } else {
                                console.log("第", count++, "张", url);
                            }
                            currentImgCount--;
                        });
                    } else {
                        currentImgCount--;
                    }
                });
        } catch (e) {
            console.log("downloadImg:", e);
        }
    }
}

surfingInInternet(url);
