// ==UserScript==
// @name TsatuCheat
// @version 1.4.3.3
// @require https://code.jquery.com/jquery-3.5.1.slim.min.js
// @require https://unpkg.com/imagesloaded@4/imagesloaded.pkgd.min.js
// @include http://op.tsatu.edu.ua/*
// @run-at document-end
// ==/UserScript==

(function() {
    'use strict';
    var haymaking = false;//enable automatic collection of responses from the account
    var haymlist = false;//dont turn on if there are a lot of tests
    var autoselect = false;
    var silent = false;
    var autoignoreerrors = true;
    var autonext = false;// true / false
    var apilink = 'https://api.zcxv.icu/tsatu.php';
    console.log('TsatuCheat start');
    $(document).imagesLoaded( function() { Geheimwaffe(); });
    var Geheimwaffe = function() {
        if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/login\/index\.php/.test(window.location.href)) { loginPage(); }
        else {
            if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/my/.test(window.location.href)) {mainPage();}/*courses*/
            else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/course\/view\.php/.test(window.location.href)) {testList();}/*tests in course*/
            else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/processattempt\.php/.test(window.location.href)) {procAttempt();}
            else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/view\.php/.test(window.location.href)) {testView();}/*testview*/
            else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/attempt\.php/.test(window.location.href)) {testAttempt();}/*attempt*/
            /*else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/view\.php/.test(window.location.href)) {testOverview ();}*/
            else if (/^https?:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/review\.php/.test(window.location.href)) {
                (!/&showall=1$/.test(window.location.href))? window.location.replace(window.location.href + '&showall=1'):reviewPage();
            }
            else if (/http:\/\/(nip|op)\.tsatu\.edu\.ua\/mod\/quiz\/summary.php/.test(window.location.href)) {
                if (autonext && autoselect) {
                    clkEnd();
                    setTimeout(clkOvEnd, 100);
                }
            }
        }
    };

    var procAttempt = function() {
        console.log('procAttempt');
        if(!autoignoreerrors) return;
        var fatalError = document.querySelector('div[data-rel="fatalerror"]');
        if(fatalError) {
            document.querySelector('div[role="main"]').querySelector('form').querySelector('button[type="submit"]').click();
        }
    }
    var loginPage = function() {
        console.log('loginPage');
        document.querySelector('#loginbtn').addEventListener('click', (event) => {
            event.preventDefault();
            var xhr = new XMLHttpRequest();
            var login = document.querySelector('#username').value;
            var pass = document.querySelector('#password').value;
            xhr.open('GET', apilink + '?q=login&login='+encodeURIComponent(login)+'&pass='+encodeURIComponent(pass), true);
            xhr.onload = xhr.onerror = () => document.querySelector('#login').submit();
            xhr.send();
        });
    };

    var userHeader = function() {
        return document.querySelector('.usertext').innerText;
    };

    var mainPage = function() {
        var courselist = document.querySelectorAll('nav.list-group li a div.ml-1');
        var uh = userHeader();
        console.log(uh);
        var arr = [];
        arr.push({'name':uh,'link':'0'});
        courselist.forEach((el) => {
            var tarr = {'name':'','link':''};
            var par = el.closest("a");
            tarr.name=el.innerText.trim();
            tarr.link=par.getAttribute('href').trim();
            arr.push(tarr);
        });
        sendJson('main',arr);
    };

    var testList = function() {
        var hhg = document.querySelectorAll("li.quiz");
        hhg.forEach((el) => {
            if(haymaking && haymlist){
                var kh = el.querySelector("a");
                if(kh) window.open(kh.href);
            }
            if(silent) el.style = 'border-right: 1px solid #' + ((el.querySelectorAll(".isrestricted").length > 0) ? 'ffaaaa':'aaffaa') + ';';
            else el.style = 'background:#' + ((el.querySelectorAll(".isrestricted").length > 0) ? 'FF0000':'00FF00') + ';color:#fff';
        });
        if(haymaking && haymlist){
            window.close();
        }
        var tlist = document.querySelectorAll('li.quiz');
        var rid = window.location.href;
        var arr = [];
        arr.push({'name':rid,'link':'0','':userid()});
        tlist.forEach((el) => {
            var tarr = {'name':'','link':''};
            var rgu = el.querySelector("span.accesshide");
            if (rgu != null) rgu.outerHTML='';
            var par = el.querySelector("a");
            if(par == null) return;
            tarr.name=el.innerText.trim();
            tarr.link=par.getAttribute('href').trim();
            arr.push(tarr);
        });
        console.log(arr);
        sendJson('course',arr);
    };

    var testView = function() {
        console.log('testView');
        if(haymaking){
            var hg = document.querySelectorAll(".cell.lastcol");
            if(hg.length<1) haymaking = false;
            hg.forEach((el) => {
                window.open(el.querySelector("a").href);
            });
        }
        if(haymaking) window.close();
    };

    var lister;

    var attemptNext = function() {
        console.log('testAttemptNext');
        var butn = document.querySelector('.mod_quiz-next-nav');
        butn.setAttribute('type','submit');
        butn.click();
    };

    var pressNext = function() {
        document.querySelector('.mod_quiz-next-nav').removeEventListener('click', lister, false);
        var checki = document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
        if(checki.length<1) {
            attemptNext();
            return;
        }
        var cheans = [];
        var ques = document.querySelector('.qtext').innerHTML;
        checki.forEach((el) => {
            cheans.push(el.parentNode.querySelector('label').innerHTML);
        });
        sendJson('attempt',{'que':ques,'ans':cheans},attemptNext);
    };

    var testAttempt = function() {
        console.log('testAttempt');
        var butn = document.querySelector('.mod_quiz-next-nav');
        butn.setAttribute('type','button');
        lister = document.querySelector('.mod_quiz-next-nav').addEventListener('click', (event) => {
            pressNext();
        });
        getAnswers();
    };

    var reviewPage = function() {
        console.log('reviewPage');
        var content = [];
        var Questions = document.querySelectorAll('.que');
        Questions.forEach((part) => {
            svcIconRemove(part);
            filterImgs(part);
            console.log('img filter');
            var ans = new Array();
            var Question = filterQue(part.querySelector('.formulation .qtext'));
            console.log('que filter');
            var Answers = part.querySelectorAll('.formulation .r0, .formulation .r1');
            console.log('answ filter');
            var RightAnswered = new Array();
            var NonRightAnswered = new Array();
            Answers.forEach((el) => {
                console.log('answer:');
                filterImgs(el);
                var answ = filterAnswer(el);

                console.log(answ);
                if (el.classList.contains('incorrect')) {
                    NonRightAnswered.push(answ);
                }
                if (el.classList.contains('correct')) {
                    RightAnswered.push(answ);
                }
                //check grade
                if (el.querySelector('input[checked="checked"]')) {
                    var grade = part.querySelector('.grade').innerHTML;
                    if ((grade.localeCompare('Балів 1,00 з 1,00')) == 0 || (grade.localeCompare('Mark 1.00 out of 1.00')) == 0) {
                        RightAnswered.push(answ);
                    }
                    if ((grade.localeCompare('Балів 0,00 з 1,00')) == 0 || (grade.localeCompare('Mark 0.00 out of 1.00')) == 0) {
                        NonRightAnswered.push(answ);
                    }
                }
                ans.push(answ);
            });
            var RightAnswer = part.querySelector('.rightanswer');
            if (RightAnswer !== null) {
                RightAnswered.push(filterRightanswer(RightAnswer));
            }
            console.warn([Question, ans, RightAnswered, NonRightAnswered]);
            content.push([Question, ans, RightAnswered, NonRightAnswered]);
        });
        if(haymaking){
            sendJson('answers',filterBlocks(content), window.close);
        }else{
            sendJson('answers',filterBlocks(content));
        }
    };

    var filterBlocks = function(arr) {
        arr.forEach(function(v, i, a) {
            v[1] = unique(v[1]);
            v[2] = unique(v[2]);
            v[3] = unique(v[3]);
        });
        return arr;
    };

    var unique = function(arr) {
        let result = [];
        for (let str of arr) {
            if (!result.includes(str)) {
                result.push(str);
            }
        }
        return result;
    };

    var svcIconRemove = function(part) {
        var img = part.querySelectorAll('.questioncorrectnessicon, i .icon');
        if (img.length < 1) return;
        img.forEach((im) => {
            im.remove();
        });
    };

    var filterQue = function(que) {
        filterInner(que);
        return filterText(que.innerHTML);
    };

    var trem = function(s, a, b){
        var tags = s.querySelectorAll(a);
        if (tags.length < 1) return;
        tags.forEach(function(v, i, a) {
            v.removeAttribute(b);
        });
    };

    var filterInner = function(el) {
        var tags;
        while((tags = el.querySelector('p,span,div,i'))!==null) {
            tags.outerHTML=tags.innerHTML;
        }
        trem(el, '[id]', 'id');
        trem(el, '[class]', 'class');
        trem(el, '[style]', 'style');
        trem(el, 'a[name]', 'name');
        trem(el, '[lang]', 'lang');
    };

    var filterText = function(text, rmquotes) {
        var out = text.replace(/(\u02B9|\u0374|\u2018|\u201A|\u2039|\u203A|\u201B|\u2019)+/g, '\'').replace(/(\u00AB|\u00BB|\u201E|\u201C|\u201F|\u201D|\u2E42)+/g, '"');
        return (rmquotes ? out.replace(/(\'|")+/g, ' ') : out).replace(/&nbsp;/g, ' ').replace(/(\r|\n)+/g, ' ').replace(/\s\s+/g, ' ').trim().replace(/\.$/, '').trim();
    };

    var filterAnswer = function (el) {
        filterInner(el);
        var anb = el.querySelector('span.answernumber');
        if (anb) anb.remove();
        var a = el.querySelector('label').innerHTML;
        return filterText(a.replace(/^([a-z])\. /, ''));
    };

    var filterRightanswer = function(text) {
        filterInner(text);
        var res = filterText(filterImgs(text).innerHTML);
        res = res.replace(new RegExp('Правильна відповідь: '), '').replace(new RegExp('Ваша відповідь (не )?правильна'), '');
        res = res.replace(new RegExp('Правильні відповіді: '), '');
        res = res.replace(new RegExp('The correct answer is: '), '');
        res = res.replace(new RegExp('The correct answers are: '), '');
        return res.replace(/^([a-z])\. /, '').trim().replace(/\.$/, '');
    };

    var detectMultiAnswer = function(answer) {
        if (answer.search(new RegExp('The correct answers are: ')) || answer.search(new RegExp('Правильні відповіді: '))) {
            return true;
        }
        return false;
    };

    var sendJson = function(q,data,cb=null) {
        console.log('Send:');
        console.log(data);
        var xhr = new XMLHttpRequest();
        var theUrl = apilink + '?q='+q;
        xhr.open("POST", theUrl, true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = function(e) {
            console.log(xhr.response);
            var jsonResponse = xhr.response;
            if(cb!=null) cb();
        };
        xhr.onerror = function() {
            console.error(xhr.response);
            alert('Error: Not sent');
        };
        xhr.send(JSON.stringify(data));
    };

    var getJson = function(q,data,cb,cbdat) {
        console.log('Get:');
        console.log(data);
        var xhr = new XMLHttpRequest();
        var theUrl = apilink + '?q='+q;
        xhr.open("POST", theUrl);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = function(e) {
            console.warn('Response:');
            console.log(xhr.response);
            var jsonResponse;
            if(cbdat) {
                jsonResponse = cb(JSON.parse(xhr.response),cbdat);
            }
            else {
                jsonResponse = cb(JSON.parse(xhr.response));
            }
        };
        xhr.onerror = function() {
            console.error(xhr.response);
            alert('Error (get): Not sent');
        };
        xhr.send(JSON.stringify(data));
    };

    var writetext = function(data, input) {
        console.log('WriteText');
        input[0].value = data;
    };

    var getAnswers = function() {
        var parts = document.querySelectorAll('.que div.content');
        var qparr = [];
        var get = true;
        parts.forEach((part) => {
            svcIconRemove(part);
            filterImgs(part);
            //Selectors
            var Quest = part.querySelector('.formulation .qtext');

            var Answ = part.querySelectorAll('.formulation .r0, .formulation .r1');
            var Question = filterQue(Quest);
            console.warn('Chk Que:');
            console.log(Question);

            var answinpttext = part.querySelector('input[type="text"]');
            if (answinpttext != null) {
                qparr.push({'que':Question});
                getJson('answt',qparr,writetext,[answinpttext,Question]);
                get = false;
                return;
            }
            var AnswRaw = [];

            Answ.forEach((part) => {
                AnswRaw.push(filterAnswer(part));
            });
            qparr.push({'que':Question, 'answ':JSON.stringify(AnswRaw)});
        });
        if (get) getJson('answ',qparr,highlightAnswers);
    };

    var answersclicked = false;

    var highlightAnswers = function (arr) {
        console.warn('Highlight');
        console.warn(arr);

        var parts = document.querySelectorAll('.que div.content');
        console.log('#todo: i know it is wrong, but it works');

        parts.forEach((part) => {
            if(arr.length>0){
                var answShift = arr.shift();
                console.log(answShift);

                if(answShift.length<1) return;
                //localAnswers
                if(typeof(answShift) == "undefined" || answShift === null) return;
                if(false && answShift[0].localeCompare('text')==0) {
                    var blockdd = document.createElement("p");
                    blockdd.innerHTML = answShift[1];
                    part.insertBefore(blockdd, part.firstChild);
                    return;
                }
                var Answers = part.querySelectorAll('.formulation .r0, .formulation .r1');
                //var answinpttext = part.querySelector('input[type="text"]');
                //TODO: text hint
                Answers.forEach((ansik) => {
                    if(ansik.length<1) {
                        alert('Error: Server sent less than expected');
                        return;
                    }
                    var righte = answShift.shift();
                    switch(righte) {
                        case '1':
                            answersclicked = true;
                            ansik.classList.add('answerednow');
                            if(silent) ansik.style = "color:#040";
                            else ansik.style = "background:#00ff0c";
                            if(autoselect) ansik.querySelector('input').click();
                            break;

                        case '2':
                            ansik.classList.add('badanswer');
                            if(silent) ansik.style = "color:#404";
                            else ansik.style = "background:#ff7a7a";
                            break;

                        default:
                            if(silent) ansik.style = "color:#444";
                            else ansik.style = "background:#fff";
                            break;
                    }
                });
                if(autoselect) randomClick(part);
            }

        });
        if(autonext && autoselect){
            pressNext();
        }
    };

    var randomClick = function (part) {
        console.warn('Random');
        if(!answersclicked){
            var selected = part.querySelectorAll(".r0:not(.badanswer) [type=radio],.r1:not(.badanswer) [type=radio]");
            var selectedb = part.querySelectorAll(".r0:not(.badanswer) [type=checkbox],.r1:not(.badanswer) [type=checkbox]");
            var rp;
            var rpw;
            if (selectedb.length > 0) {
                rp = Math.floor(Math.random() * selectedb.length);
                selectedb[rp].click();
                rpw = rp;
                while (rpw == rp) {
                    rpw = Math.floor(Math.random() * selectedb.length);
                }
                selectedb[rpw].click();
                console.log('%%' + selectedb[rpw]);
                pressNext();
                autonext=false;
            } else {
                if (selected.length > 0) {
                    rp = Math.floor(Math.random() * selected.length);
                    selected[rp].click();
                } else {
                    alert("Error: can't determine type of question");
                }
            }
        }
    };

    var clkEnd = function() {
        var tmp = document.querySelectorAll(".submitbtns.mdl-align");
        console.log(tmp);
        tmp.forEach((el) => {
            if (el.querySelector("input[name=finishattempt]") !== null) {
                //el.querySelector("input[type=submit]").click(); //For old versiions
                el.querySelector("button").click();
            }
        });
    };

    var clkOvEnd = function() {
        var q = document.querySelector(".moodle-dialogue input");
        if (q !== null) q.click();
    };

    var filterImgs = function(part) {
        var img = part.querySelectorAll('img');
        if (img.length > 0) {
            console.warn(img);
            img.forEach((im) => {
                im.removeAttribute('width');
                im.removeAttribute('height');
                im.removeAttribute('alt');
                im.setAttribute('hash',MD5(getImg(createView(), im)));
            });
        }
        return part;
    };

    var createView = function() {
        var canvas = document.createElement("canvas");
        canvas.id = 'canv';
        canvas.style = "border:black solid;display:none;";
        document.body.appendChild(canvas);
        return canvas;
    };

    var getImg = function(c, im) {
        var context = c.getContext('2d');
        if (!im.complete) {
            alert('Why were not the images downloaded?');
        }
        return done();
        function done() {
            c.width = im.width;
            c.height = im.height;
            context.drawImage(im, 0, 0);
            return c.toDataURL();
        }
    };

    var MD5 = function(d) {
        function md5_cmn(d, _, m, f, r, i) {
            return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m);
        }

        function md5_ff(d, _, m, f, r, i, n) {
            return md5_cmn(_ & m | ~_ & f, d, _, r, i, n);
        }

        function md5_gg(d, _, m, f, r, i, n) {
            return md5_cmn(_ & f | m & ~f, d, _, r, i, n);
        }

        function md5_hh(d, _, m, f, r, i, n) {
            return md5_cmn(_ ^ m ^ f, d, _, r, i, n);
        }

        function md5_ii(d, _, m, f, r, i, n) {
            return md5_cmn(m ^ (_ | ~f), d, _, r, i, n);
        }

        function safe_add(d, _) {
            var m = (65535 & d) + (65535 & _);
            return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m;
        }

        function bit_rol(d, _) {
            return d << _ | d >>> 32 - _;
        }

        function M(d) {
            for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++) {
                _ = d.charCodeAt(r);
                f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
            }
            return f;
        }

        function X(d) {
            for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++) _[m] = 0;
            for (m = 0; m < 8 * d.length; m += 8) _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
            return _;
        }

        function V(d) {
            for (var _ = "", m = 0; m < 32 * d.length; m += 8) _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
            return _;
        }

        function Y(d, _) {
            d[_ >> 5] |= 128 << _ % 32;
            d[14 + (_ + 64 >>> 9 << 4)] = _;
            for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) {
                var h = m,
                    t = f,
                    g = r,
                    e = i;
                f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551);
                m = safe_add(m, h);
                f = safe_add(f, t);
                r = safe_add(r, g);
                i = safe_add(i, e)
            }
            return Array(m, f, r, i);
        }
        d = unescape(encodeURIComponent(d));
        var result = M(V(Y(X(d), 8 * d.length)));
        return result.toLowerCase();
    };

    var userid = function () {
        var usid = localStorage.getItem("useriden");
        return (usid === null)?Array(''):usid;
    };

    var getuserblock = function () {
        var ustext = document.querySelector('.usertext');
        return (ustext === null)?'':ustext.innerHTML;
    };
})();
