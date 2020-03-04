// ==UserScript==
// @name Def.Tdatu
// @description Tsatu
// @author Vlad Tishyn
// @license MIT
// @version 1.0
// @include http://nip.tsatu.edu.ua/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js
// ==/UserScript==

(function (window, undefined) {

	var userlogin="";
	var userpass="";
    var imgReg=/http:\/\/nip\.tsatu\.edu\.ua\/pluginfile\.php\/([0-9]{0,9})\/question\/answer\/([0-9]{0,9})\/([0-9]{0,9})\/([0-9]{0,9})\//;
    // cursor: copy;
    function unique(arr) {
        let result = [];

        for (let str of arr) {
            if (!result.includes(str)) {
                result.push(str);
            }
        }

        return result;
    }

    function filtAnsw(a){
        return a.replace(/^([a-z])\. /,'').trim().replace(/\.$/,'');
    }



    function filterAnswers(arr){

        arr.forEach(function(cval, i, array) {
            cval[1]=unique(cval[1]);
            cval[2]=unique(cval[2]);
            cval[3]=unique(cval[3]);
        });
        return arr;
    }

    function mergeAnswers(a,b){

        var result=Array();
        var i,j;
        var addThis=true;
        for(i=0;i<a.length;i++){
            addThis=true;
            for(j=0;j<b.length;j++){
                if(addThis){
                    if (b[j][0].includes(a[i][0])) {
                        b[j][1]=b[j][1].concat(a[i][1]);
                        b[j][2]=b[j][2].concat(a[i][2]);
                        b[j][3]=b[j][3].concat(a[i][3]);
                        addThis=false;
                    }
                }
            }
            if(addThis){
                result.push(a[i]);
            }
        }

        return result.concat(b);
    }
    ////////////////////////********************************************************------------------------------

    function highlightRightAnswers(){

        content=new Array();
        var part=document.querySelector('.que');

        //img filter
        var img=part.querySelectorAll('img');
        img.forEach((im) => {
            var imgSr=im.attributes.src.value.replace(imgReg,'');

            im.outerHTML='[['+imgSr+']]';
        });
        var parts = part.querySelector('.formulation');
        var ans = new Array();
        var Quest = parts.querySelector('.qtext');
        var Question = Quest.innerHTML;
        var Answers = parts.querySelectorAll('.formulation .r0, .formulation .r1');

        var answRight = JSON.parse(localStorage.getItem('testgb'));

        console.log(answRight);
        var patchSelected=false;
        var patchId;
        var ansHH=Array();
        for(var i=0;i<answRight.length;i++){
            if((Question.localeCompare(answRight[i][0]))==0) {
                Quest.style="background:#00ff0c";
                patchSelected=true;
                ansHH=answRight[i];
                break;
            }

        };
        if (patchSelected){
            Answers.forEach((element) => {
                var answo=element.querySelector('label');
                var answ=filtAnsw(answo.innerHTML);
                answ=answ.replace(imgReg,'');

                //console.log('----------');
                //console.log(answ);
                /*
                for(var i=0;i<ansHH[2].length;i++){
                    console.log(ansHH[2][i]);
                    if((answ.localeCompare(ansHH[2][i]))==0) {
                        answo.style="background:#00ff0c";
                    }
                }*/

                var i;

                for(i=0;i<ansHH[2].length;i++){
                    console.log(ansHH[2][i]);
                    if((answ.localeCompare(ansHH[2][i]))==0) {
                        //correct
                        answo.style="background:#00ff0c";
                    }
                }
                for(i=0;i<ansHH[3].length;i++){
                    console.log(ansHH[3][i]);
                    if((answ.localeCompare(ansHH[3][i]))==0) {
                        //incorrect
                        answo.style="background:#ff7a7a";
                    }
                }
            });
        }
        return content;
    }

    function parseFinish(){

        content=new Array();
        Questions=document.querySelectorAll('.que');

        Questions.forEach((part) => {

            //service icon filter
            var simg=part.querySelectorAll('.questioncorrectnessicon');
            simg.forEach((im) => {
                im.remove();
            });

            //img filter
            var img=part.querySelectorAll('img');
            img.forEach((im) => {
                var imgSr=im.attributes.src.value.replace(imgReg,'');

                im.outerHTML='[['+imgSr+']]';
            });

            var parts = part.querySelector('.formulation');
            var ans = new Array();
            var Question = parts.querySelector('.qtext').innerHTML;
            var Answers = parts.querySelectorAll('.formulation .r0, .formulation .r1');

            var RightAnswer;
            var RightAnswered=new Array();
            var NonRightAnswered=new Array();
            Answers.forEach((element) => {
                //http:\/\/nip\.tsatu\.edu\.ua\/pluginfile\.php\/([0-9]{0,9})\/question\/answer\/([0-9]{0,9})\/([0-9]{0,9})\/([0-9]{0,9})\/

                var answ=filtAnsw(element.querySelector('label').innerHTML);
                answ=answ.replace(imgReg,'');

                //incorrect
                if(element.classList.contains('incorrect')){
                    NonRightAnswered.push(answ);
                }

                //correct
                if(element.classList.contains('correct')){
                    RightAnswered.push(answ);
                }

                //check grade
                if(element.querySelector('input[checked="checked"]')){
                    if((part.querySelector('.grade').innerHTML.localeCompare('Балів 1,00 з 1,00'))==0){
                        RightAnswered.push(answ);
                    }
                    if((part.querySelector('.grade').innerHTML.localeCompare('Балів 0,00 з 1,00'))==0){
                        NonRightAnswered.push(answ);
                    }
                    //<div class="grade">Балів 1,00 з 1,00</div>
                    //<div class="grade">Балів 0,00 з 1,00</div>
                }
                ans.push(answ);
            });

            var rAnsw=part.querySelector('.rightanswer');

            if(rAnsw==null){

            }else{
                RightAnswer=rAnsw.innerHTML.replace(new RegExp('Правильна відповідь: '),'');
                RightAnswer=RightAnswer.replace(imgReg,'');
                RightAnswered.push(RightAnswer);
            }
            content.push([Question,ans,RightAnswered,NonRightAnswered]);

            //alert(Question.innerHTML);
        });
        return content;
    }
    function download(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

	//TODO: 
    /**
 * @param {string} s1 Исходная строка
 * @param {string} s2 Сравниваемая строка
 * @param {object} [costs] Веса операций { [replace], [replaceCase], [insert], [remove] }
 * @return {number} Расстояние Левенштейна
 */
    function levenshtein(s1, s2, costs) {
        var i, j, l1, l2, flip, ch, chl, ii, ii2, cost, cutHalf;
        l1 = s1.length;
        l2 = s2.length;

        costs = costs || {};
        var cr = costs.replace || 1;
        var cri = costs.replaceCase || costs.replace || 1;
        var ci = costs.insert || 1;
        var cd = costs.remove || 1;

        cutHalf = flip = Math.max(l1, l2);

        var minCost = Math.min(cd, ci, cr);
        var minD = Math.max(minCost, (l1 - l2) * cd);
        var minI = Math.max(minCost, (l2 - l1) * ci);
        var buf = new Array((cutHalf * 2) - 1);

        for (i = 0; i <= l2; ++i) {
            buf[i] = i * minD;
        }

        for (i = 0; i < l1; ++i, flip = cutHalf - flip) {
            ch = s1[i];
            chl = ch.toLowerCase();

            buf[flip] = (i + 1) * minI;

            ii = flip;
            ii2 = cutHalf - flip;

            for (j = 0; j < l2; ++j, ++ii, ++ii2) {
                cost = (ch === s2[j] ? 0 : (chl === s2[j].toLowerCase()) ? cri : cr);
                buf[ii + 1] = Math.min(buf[ii2 + 1] + cd, buf[ii] + ci, buf[ii2] + cost);
            }
        }
        return buf[l2 + cutHalf - flip];
    }

    //var max=2;
    var w;var content;var Questions;
    if (typeof unsafeWindow != undefined) { w = unsafeWindow } else { w = window; }
    if (w.self != w.top) { return; }

	//TODO: 
/* // in future
    var newDiv = document.createElement("div");
    newDiv.style="display:none;position:absolute;left:0;top:0;z-index: 99999;";
    newDiv.id="hfileinp";
    newDiv.innerHTML = "<input type=\"file\" id=\"hackerfile\">"
        +"<button onclick=\"readFile(document.getElementById('file'))\">"
        +"Read!</button><div id=\"out\"></div>";
    document.body.appendChild(newDiv);
*/


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //             IN FINISH TEST
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if (/http:\/\/nip\.tsatu\.edu\.ua\/mod\/quiz\/summary.php/.test(w.location.href)) {

        //Press keys in end of test
        document.addEventListener('keydown', function(event) {
            if (event.code == 'KeyS') {
                document.querySelector("[value=\"Відправити все та завершити\"]").click();
            }

            if (event.code == 'KeyD') {
                document.querySelector(".moodle-dialogue input").click();
            }
        });

    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //             END IN FINISH TEST
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //             IN TEST
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    else {
        if (/http:\/\/nip\.tsatu\.edu\.ua/.test(w.location.href)) {
            document.addEventListener('keydown', function(event) {
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Replace & delete images
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyQ') {
                    content=new Array();
                    Questions=document.querySelectorAll('.que .content');

                    Questions.forEach((part) => {
                        //service icon filter
                        var simg=part.querySelectorAll('.questioncorrectnessicon');
                        simg.forEach((im) => {
                            im.remove();
                        });

                        //img filter
                        var img=part.querySelectorAll('img');
                        img.forEach((im) => {
                            //document.querySelectorAll('.que .content')[0].querySelectorAll('img')[0].attributes['src']
                            var imgSr=im.attributes.src.value.replace(imgReg,'');
                            im.outerHTML='[['+imgSr+']]';
                        });
                    });
                }

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Show / hide upload form
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                //TODO: upload answers
		/*
                if (event.code == 'KeyU') {
                    if(document.querySelector('#hfileinp').style.display=="none") {
                        document.querySelector('#hfileinp').style.display="block";
                    } else {
                        document.querySelector('#hfileinp').style.display="none";
                    }
                }*/

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Highlight the correct
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyW') {
                    highlightRightAnswers();
                    //<div class="grade">Балів 1,00 з 1,00</div>
                    //<div class="grade">Балів 0,00 з 1,00</div>
                }

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Press random answer & Next
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyR') {
                    var selected=document.querySelectorAll("[type=radio]");
                    var selectedb=document.querySelectorAll("[type=checkbox]");
                    var rp;
                    var rpw;
                    if(selectedb.length > 0){
                        rp=Math.floor(Math.random() * Math.floor(selectedb.length));
                        selectedb[rp].click();
                        rpw=rp;
                        while(rpw==rp){
                            rpw=Math.floor(Math.random() * Math.floor(selectedb.length));
                        }
                        selectedb[rpw].click();
                        document.querySelectorAll(".mod_quiz-next-nav")[0].click();
                    }else{
                        if(selected.length > 0){
                            rp=Math.floor(Math.random() * Math.floor(selected.length));
                            selected[rp].click();
                            document.querySelectorAll(".mod_quiz-next-nav")[0].click();
                        }else{
                            alert("Error: can't determine type of question");
                        }
                    }
                }


                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Press "Next" / "Prev" key
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyE') { // Next
                    document.querySelector(".mod_quiz-next-nav").click();
                }
                if (event.code == 'KeyA') { // Prev
                    document.querySelector(".mod_quiz-prev-nav").click();
                }
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Save results to file
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyF') {
                    content=parseFinish();
                    content=filterAnswers(content);
                    download("test.txt",JSON.stringify(content));
                }

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Save results to LocalStorage
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyI') {
                    content=parseFinish();
                    content=filterAnswers(content);
                    localStorage.setItem('testgb', JSON.stringify(content));
                }

                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Merge results to LocalStorage
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyT') {
                    content=parseFinish();
                    var content2=JSON.parse(localStorage.getItem('testgb'));
                    var result=mergeAnswers(content,content2);
                    result=filterAnswers(result);
                    console.log(JSON.stringify(result));
                    localStorage.setItem('testgb', JSON.stringify(result));
                }
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Login
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                if (event.code == 'KeyL') {
                    if (/http:\/\/nip\.tsatu\.edu\.ua\/login\/index\.php/.test(w.location.href)) {
                        document.addEventListener('keydown', function(event) {
                            document.getElementById("username").value=userlogin;
                            document.getElementById("password").value=userpass;
                            document.getElementById("loginbtn").click();
                        });
                    }
                }

            });
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // END IN TEST
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

})(window);