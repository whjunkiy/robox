const CHAR_RETURN = 13;
let user_status = 'unauth';
let user_name = '';
const socket = new WebSocket('ws://127.0.0.1:8000/chat');
const chat = document.getElementById('chat');
const msg = document.getElementById('msg');
const main = document.getElementById('main');
const game_screen = document.getElementById('game_screen');
const reflex_div = document.getElementById('reflex');
const metalls = {"Al": "Аллюминий", "Pc": "Поликарбон", "St": "Сталь", "Vf": "Вольфрам", "Xr": "Хром", "Tn": "Титан", "Ir": "Ирридий", "Os":"Осмий"};
let opened = 0;
let loca = 0;
let tmp_state = '';
let last_div_loot_id = -1;
let fid = 0;
let token = '';
let ap_avail = 0;
let uchrd = '';
let lastGoid, lastGodist;
let uskills = [], e_ap = [];
let fenemies, Uuzer, echrds, ehp, uhp, all_hp;

//msg.focus();

//console.log(document.cookie);



const writeLine = text => {
    const line = document.createElement('div');
    line.innerHTML = `<p>${text}</p>`;
    chat.appendChild(line);
};

socket.onopen = () => {
    writeLine('connected');
    if ((user_name = getCookie('user_name')) && (token = getCookie('token'))) {
        socket.send("act=checkmeplz*|*login=" + user_name + "*|*token=" + token);
    }
};

socket.onclose = () => {
    writeLine('closed');
};

socket.onmessage = event => {
    let msg = event.data;
    //console.log('Serv says: ' + msg);
    if (msg == 'error') {
        alert("-#ERROR#-");
        return;
    }
    let regex = /([\w\d_]+) \*\|\* (.+)/ig;
    let match = regex.exec(msg);
    //console.log(match);
    if (match != null && match[1]) {
        if (match[1] == 'comin') {
            if (match[2] != 'wrong_pass') {
                let datka = JSON.parse(match[2]);
                user_name = datka['login'];
                token = datka['token'];
                user_status = 'authed';
                setCookie('user_name', user_name);
                setCookie('token', token);
                comin();
            } else {
                alert('Wrong pass');
            }
        } else if (match[1] == 'env') {
            show_env(match[2]);
        } else if (match[1] == 'scan') {
            show_loot(match[2]);
        } else if (match[1] == 'pick') {
            pick_my_stuff();
        } else if (match[1] == 'depick') {
            depick_my_stuff();
        } else if (match[1] == 'scan_info') {
            scan_info_resp(match[2]);
        } else if (match[1] == 'drop_env_item') {
            real_drop_item();
        } else if (match[1] == 'use_env_item') {
            real_use_env_item(match[2]);
        } else if (match[1] == 'deequip') {
            real_deequip(match[2]);
        } else if (match[1] == 'makestep') {
            realMakeStep(match[2]);
        } else if (match[1] == 'fight') {
            fight(match[2]);
        } else if (match[1] == 'res_fight') {
            restore_fight(match[2]);
        } else if (match[1] == 'checkmeplz') {
            checkMePlz(match[2]);
        } else {
            console.log(msg);
            alert('WTF???');
        }
    }
};

msg.addEventListener('keydown', event => {
    if (event.keyCode === CHAR_RETURN) {
        const s = msg.value;
        msg.value = '';
        writeLine(s);
        socket.send(s);
    }
});

function checkMePlz(data) {
    if (data == 'ok') {
        comin();
    } else {
        purgen();
    }
}

function comin() {
    //console.log('Welcome');
    document.getElementById('h1_welcome').innerHTML = "Welcome, " + user_name + "!";
    document.getElementById('enter_form_div').style.display = 'none';
    document.getElementById('game_view').style.display = '';
    socket.send('act=restore*|*login=' + user_name);
}

function loginMe(e) {
    e.preventDefault();
    let login = document.getElementById('login').value;
    let pass = document.getElementById('pass').value;
    if (pass.match(/\*\|\*/ig) || login.match(/\*\|\*/ig)) {
        alert('INCORRECT DATA!');
    } else {
        socket.send('act=login*|*login=' + login + '*|*pass=' + pass);
    }
}

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options = {}) {
    options = {
        path: '/',
        // при необходимости добавьте другие значения по умолчанию
        ...options
    };
    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);
    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }
    document.cookie = updatedCookie + "; path=/; expires=Tue, 19 Jan 2038 03:14:07 GMT";
}

function deleteCookie(name) {
    setCookie(name, "", {
        'max-age': -1
    })
}

function purgen() {
    if (opened) {
        opened = 0;
        game_screen.innerHTML = tmp_state;
    } else if (!opened) {
        let isAdmin = confirm("Wanna quit?");
        if (isAdmin) {
            deleteCookie('user_name');
            location.reload();
        }
    }
}

function reflect_me() {
    if (opened != 1 && fid < 1) {
        get_my_env();
        opened = 1;
        tmp_state = game_screen.innerHTML;
        game_screen.innerHTML = reflex_div.innerHTML
    }
}

function make_step(id) {
    tmp_state = game_screen.innerHTML;
    //console.log("im going to " + id);
    socket.send('act=make_step*|*loc=' + id + "*|*user=" + user_name);
}

function get_my_env() {
    socket.send('act=get_env*|*login=' + user_name);
}

function scan() {
    socket.send('act=scan*|*loc=' + loca + "*|*user=" + user_name);
    socket.send('act=scan_info*|*loc=' + loca + "*|*user=" + user_name);
    game_screen.innerHTML = game_screen.innerHTML + "<p></p>";
}

function show_env(env) {
    if (env == 'empty') {
        alert(env);
    } else {
        //console.log("env: ");
        let envy = JSON.parse(env);
        //console.log(envy);

        let hd = metalls[envy["head"][0]] + " (<span id=\"head_proc\">"+envy["head"][1]+"%</span>)";
        document.getElementById('head_div').innerHTML=hd;

        hd = metalls[envy["body"][0]] + " (<span id=\"body_proc\">"+envy["body"][1]+"%</span>)";
        document.getElementById('body_div').innerHTML=hd;

        hd = metalls[envy["arms"][0]] + " (<span id=\"arms_proc\">"+envy["arms"][1]+"%</span>)";
        document.getElementById('arms_div').innerHTML=hd;

        hd = metalls[envy["legs"][0]] + " (<span id=\"legs_proc\">"+envy["legs"][1]+"%</span>)";
        document.getElementById('legs_div').innerHTML=hd;

        document.getElementById('coins_span').innerText=envy["coins"];

        document.getElementById('lvl_span').innerText=envy["lvl"];

        document.getElementById('exp_span').innerText= envy["exp"] + " of " + Math.pow(2, parseInt(envy["lvl"]));

        if (envy["equiped"]) {
            if (envy["equiped"]["head_slot"]) {
                document.getElementById('head_slot').innerHTML="("+envy["equiped"]["head_slot"]+")";
            }
            if (envy["equiped"]["arms_slot"]) {
                document.getElementById('arms_slot').innerHTML="("+envy["equiped"]["arms_slot"]+")";
            }
            if (envy["equiped"]["body_slot"]) {
                document.getElementById('body_slot').innerHTML="("+envy["equiped"]["body_slot"]+")";
            }
            if (envy["equiped"]["legs_slot"]) {
                document.getElementById('legs_slot').innerHTML="("+envy["equiped"]["legs_slot"]+")";
            }
            if (envy["equiped"]["w1"]) {
                document.getElementById('w1_slot').innerHTML="<div class=\"eqiped\" onclick='deequip(\"w1\");'>[" + envy["equiped"]["w1"]['name'] + "]</div>";
            }
            if (envy["equiped"]["w2"]) {
                document.getElementById('w2_slot').innerHTML="<div class=\"eqiped\" onclick='deequip(\"w2\");'>[" + envy["equiped"]["w2"]['name'] + "]</div>";
            }
            if (envy["equiped"]["w3"]) {
                document.getElementById('w3_slot').innerHTML="<div class=\"eqiped\" onclick='deequip(\"w3\");'>[" + envy["equiped"]["w3"]['name'] + "]</div>";
            }
            if (envy["equiped"]["w4"]) {
                document.getElementById('w4_slot').innerHTML="<div class=\"eqiped\" onclick='deequip(\"w4\");'>[" + envy["equiped"]["w4"]['name'] + "]</div>";
            }
        }

        if (envy['stuff']) {
            document.getElementById('inv_div').innerHTML='';
            for (let i in envy['stuff']){
                document.getElementById('inv_div').innerHTML += '<div id="env_item_id_'+i+'" class="env_item' +
                    '"><span id="stf_span_'+i+'">'+envy['stuff'][i][1]+'</span><button onclick="use_item(\''+envy['stuff'][i][0]+'\','+i+');">Use()</button>'+
                    '<button onclick="drop_item(\''+envy['stuff'][i][0]+'\', '+i+');">Drop()</button></div>';
            }
        }

        document.getElementById('pwr_td').innerText=envy["power"];
        document.getElementById('spd_td').innerText=envy["speed"];
        document.getElementById('sens_td').innerText=envy["sens"];
        document.getElementById('mmr_td').innerText=envy["memory"];
        document.getElementById('dur_td').innerText=envy["dur"];
        document.getElementById('enrgy_td').innerText=envy["energy"];
        document.getElementById('gnls_td').innerText=envy["gunless"];
        document.getElementById('pstl_td').innerText=envy["pistols"];
        document.getElementById('ar_td').innerText=envy["ar"];
        document.getElementById('hvy_td').innerText=envy["heavy"];
        document.getElementById('nrg_td').innerText=envy["energo"];
        document.getElementById('tch_td').innerText=envy["tech"];

        if (envy['avail']) {
            if (envy['avail']['parms']) {
                if (parseInt(envy['stuff']['avail']['parms']) > 0) {
                    document.getElementById('com_parms_span').innerText = '+' + envy['stuff']['avail']['parms'];
                }
            }
            if (envy['avail']['mastr']) {
                if (parseInt(envy['stuff']['avail']['mastr']) > 0) {
                    document.getElementById('mastrs_span').innerText = '+' + envy['stuff']['avail']['mastr'];
                }
            }
        }

    }
}

function show_loot(doc) {
    if (doc == 'empty') {
        document.getElementById('lootBox').innerHTML = 'Empty';
        document.getElementById('loot_items').style.display = '';
        return;
    }
    document.getElementById('lootBox').innerHTML = 'Empty';
    let loot = JSON.parse(doc);
    let loot_cnt = "";
    for (let i in loot) {
        let tmp = loot[i]['loot'];
        loot_cnt += '<div class="lootCase" id="lootItem_' + i + '"> ' + tmp[1] +
            '<button onclick="pick(' + i + ', \'' + loot[i]['_id'] + '\')">Подобрать</button>'+
            '<button onclick="depick(' + i + ', \'' + loot[i]['_id'] + '\')">Выкинуть</button></div>';
    }
    document.getElementById('lootBox').innerHTML = loot_cnt;
    document.getElementById('loot_items').style.display = '';
}

function pick(div_id, item_id) {
    last_div_loot_id = div_id;
    //console.log('Trying to pick ' + div_id + ' with id = ' + item_id);
    socket.send('act=pick*|*item_id=' + item_id + "*|*user="+user_name);
}

function depick(div_id, item_id) {
    last_div_loot_id = div_id;
    socket.send('act=depick*|*item_id=' + item_id + "*|*user="+user_name);
}

function pick_my_stuff() {
    $('#lootItem_' + last_div_loot_id).remove();
}

function depick_my_stuff(){
    $('#lootItem_' + last_div_loot_id).remove();
}

function scan_info_resp(resp) {
    document.getElementById('scan_info').innerText=resp;
}

function drop_item(item, div_id) {
    last_div_loot_id = div_id;
    socket.send('act=drop_env_item*|*item_id=' + item + "*|*user="+user_name);
}

function real_drop_item() {
    $('#env_item_id_' + last_div_loot_id).remove();
}

function use_item(item, div_id) {
    last_div_loot_id = div_id;
    socket.send('act=use_env_item*|*item_id=' + item + "*|*user="+user_name);
}

function real_use_env_item(msg) {
    msg = msg.trim();
    if (msg != 'w1' && msg != 'w2' && msg != 'w3' && msg != 'w4') {
        alert(msg);
    } else {
        let itm = document.getElementById('stf_span_' + last_div_loot_id).innerText;
        $('#env_item_id_' + last_div_loot_id).remove();
        document.getElementById(msg + '_slot').innerHTML='<div class="eqiped" onclick=\'deequip("'+msg+'");\'>['+itm+']</div>';
    }
}

function deequip(slot) {
    socket.send('act=deequip*|*item_id=' + slot + "*|*user=" + user_name);
}

function real_deequip(data) {
    if (data == 'error') {
        alert('ERROR!');
        return;
    }

    data = JSON.parse(data);

    slot = data['w'];

    document.getElementById(slot + '_slot').innerHTML='[]';

    document.getElementById('inv_div').innerHTML += '<div id="env_item_id_' + data['id'] + '" class="env_item' +
        '"><span id="stf_span_'+data['id']+'">' +data['stuff'][1] + '</span><button onclick="use_item(\'' +
        data['stuff'][0] + '\',' + data['id'] + ');">Use()</button>'+
        '<button onclick="drop_item(\'' + data['stuff'][0] + '\', ' + data['id'] + ');">Drop()</button></div>';
    //get_my_env();
}

function realMakeStep(ans) {
    let data = JSON.parse(ans);
    setTimeout(function(){document.getElementById('h1_welcome').innerText = "Location: " + data.title;}, 500);
    document.getElementById('sub_loc_info').innerHTML = data.sub_info;
    document.getElementById('scan_info').innerHTML = data.scan_info;
}

function dialoger(id) {
    if (id == 0) {
        $("#dlg_2").remove();
        document.getElementById('inr_txt').innerHTML = 'Эксперимент не удался: робо-Собака проигнорировала палку, ' +
            'но зато широко раскрыла пасть... <br> Вы видите, как в тусклом свете блестят острые концы алмазных наконечников, ' +
            'которые способны пробурить отверстия в не самой прочной обшивке...';
        socket.send("act=just_drop*|*item=stick*|*user=" + user_name);
    }
}

function Attack() {
    socket.send("act=attack*|*user=" + user_name);
}

function fight(data) {
    let fght = JSON.parse(data);
    console.log("fght: ");
    console.log(fght);

    fid = fght.fid;
    uchrd = fght.uchrd;

    if (typeof(fght['ap_avail']) === "undefined") {
        ap_avail = parseInt(fght.uzr.energy);
    } else {
        ap_avail = parseInt(fght.ap_avail);
    }

    uskills = fght.uzr.skills;
    fenemies = fght.enemies;
    Uuzer = fght.uzr;
    echrds = fght.echrds;
    ehp = fght.ehp;
    uhp = fght.uhp;
    all_hp = (parseInt(Uuzer.lvl) * parseInt(Uuzer.dur) * 5);

    document.getElementById('skills_div').style.display = '';
    let setka = document.getElementById('setka_div').innerHTML;
    document.getElementById('sub_loc_info').innerHTML = 'Preparing fighting systems... <span style="color: orange;">Rdy</span>' +
        '<br> All necessary algorythms are... <span style="color: greenyellow;">Fine</span><br><span style="color: darkred;">FIGHT!</span>';

    document.getElementById('scan_info').innerHTML = setka;

    //TODO draw in map, and show combat log!
    //socket.send("act=getfightstate*|*user="+user_name);

    document.getElementById('s_' + uchrd).innerHTML = '<div class="u_fght" id="u">'+user_name+' (' + uhp + 'hp)</div>';


    for (let i in fenemies) {
        document.getElementById('s_' + echrds[i]).innerHTML = '<div class="enemy_fght" id="enemy_'+i+'">'
            + fenemies[i].name + ' (' + ehp[i] + ' hp)</div>';
        e_ap.push(fenemies[i].energy);
    }

    document.getElementById('skills_div').innerHTML = '<div>' +
        '<button onclick="endTurn();" style="background-color: #961826; color: #d1651d; width: 100%;">End Turn</button>' +
        '</div>'+
    '<br><div>AP: <span id="ap_avail">' + ap_avail + '</span> of <span id="all_ap">' + Uuzer.energy + '</span>' +
        '</div><br>' +
        '<div>HP: <span id="hp_avail">' + uhp + '</span> of <span id="all_hp">' + all_hp + '</span>' +
    '</div><br>';


    for (let i in uskills) {
        document.getElementById('skills_div').innerHTML += '<div><button onclick="useSkill(\''+uskills[i]+'\');">'+uskills[i]+'( AP)</button></div>';
    }


    console.log("uchrd:");
    console.log(uchrd);

    $(".setka td").hover(
        function(){
            //console.log("this id = " + $(this).attr('id'));
            let uchrd2 = uchrd.split("_");
            if ($(this).attr('id') == 's_' + uchrd) {
                return;
            }
            for (i in fenemies) {
                if ( $(this).attr('id') == 's_'+ echrds[i]) {
                    return;
                }
            }
            let chrd = $(this).attr('id').substr(2).split("_");
            //console.log(chrd);
            let dist = 0;
            let dist1 = Math.abs(uchrd2[0] - chrd[0]);
            let dist2 = Math.abs(uchrd2[1] - chrd[1]);
            if (dist1 > dist2) {
                dist = dist1;
            } else {
                dist = dist2;
            }
            dist = Math.ceil(dist / parseInt(Uuzer.speed));
            //console.log("dist = " + dist);
            if (dist <= ap_avail) {
                $(this).css('background-color', 'green');
                $(this).append($("<span>" + dist + " AP</span>"));
                let idid = $(this).attr('id');
                $(this).click(function(){
                    return goF(idid, dist);
                });
            } else {
                $(this).css('background-color', '#961826');
                $(this).append($("<span>" + dist + " AP</span>"));
                $(this).click(function(){
                    return;
                });
            }
        },
        function(){
            $(this).css('background-color', '#0d2d2c');
            $( this ).find( "span" ).last().remove();
        }
    );
}

function restore_fight(data) {
    console.log("Restoring fight...");
    let resp = JSON.parse(data);
    console.log(resp);
    document.getElementById('h1_welcome').innerText = 'Location: ' + resp.loca.title;

    //TODO restore log
    for (let i in resp.hstry) {
        document.getElementById('sub_loc_info').innerHTML += "<p>[" + (new Date(resp.hstry[i]['dati'])).getDate() + "]:"
            + user_name + " " + resp.hstry[i]['doing'] + "</p>";
    }

    fight(JSON.stringify(resp.fight));
}

function goF(id, dist) {
    if (id == lastGoid && dist == lastGodist) {
        return;
    }
    console.log("goF id = " + id + " dist = " + dist + " uchd = " + uchrd + " fid = " + fid);
    let u = document.getElementById('s_' + uchrd).innerHTML;
    document.getElementById('s_' + uchrd).innerHTML = '';
    document.getElementById(id).innerHTML = u;
    ap_avail = ap_avail - dist;
    document.getElementById('ap_avail').innerText = ap_avail;
    $('#' + id).css('background-color', '#0d2d2c');
    $('#' + id).find( "span" ).last().remove();
    uchrd = id.substr(2);
    lastGoid = id;
    lastGodist = dist;
    document.getElementById('sub_loc_info').innerHTML += "<p>[" + (new Date).getDate() + "]:" + user_name + " went to " + id + "</p>";
    socket.send("act=figthstat*|*datka=" + JSON.stringify({doing: "walk", ap_avail: ap_avail, uchrd: uchrd, fid: fid, login: user_name}));
}

//TODO save enemy state, and reset AP

function endTurn() {
    for (let i in fenemies) {
        for (let j = 0; j < parseInt(e_ap[i]); j++) {
            if (parseInt(e_ap[i]) > 1) {
                if (can_e_attack(i)) {
                    eattack(i);
                } else {
                    emove(i);
                }
            }
        }
    }
}

function can_e_attack(en) {
    console.log('enmy:');
    console.log(echrds[en]);
    console.log(fenemies[en]);
    let machrd = uchrd.split("_");
    let ech = echrds[en].split("_");
    console.log(machrd, ech);
    if (fenemies[en]['gunless'] == 1) {
        if (Math.abs(machrd[0] - ech[0]) < 2 && Math.abs(machrd[1] - ech[1]) < 2) {
            return true;
        } else {
            return false;
        }
    }
}

function emove(en) {
    console.log('enemy goes ....');
    let machrd = uchrd.split("_");
    let ech = echrds[en].split("_");
    let togo = '';
    let steps_avail = parseInt(fenemies[en]['speed']);
    let x_range = Math.abs(machrd[0] - ech[0]);
    let y_range = Math.abs(machrd[1] - ech[1]);
    let nextsetp = [];
    if (x_range > y_range) {
        if (machrd[0] - ech[0] > 0) {
            nextsetp = [ech[0] + 1, ech[1]];
        } else {
            nextsetp = [ech[0] - 1, ech[1]];
        }
    } else if (x_range < y_range) {
        if (machrd[1] - ech[1] > 0) {
            nextsetp = [ech[0], ech[1] + 1];
        } else {
            nextsetp = [ech[0], ech[1] - 1];
        }
    } else {
        if (machrd[0] - ech[0] > 0 && machrd[1] - ech[1] > 0) {
            nextsetp = [ech[0] + 1, ech[1] + 1];
        } else if (machrd[0] - ech[0] < 0 && machrd[1] - ech[1] < 0) {
            nextsetp = [ech[0] - 1, ech[1] - 1];
        } else if (machrd[0] - ech[0] > 0 && machrd[1] - ech[1] < 0) {
            nextsetp = [ech[0] + 1, ech[1] - 1];
        } else if (machrd[0] - ech[0] < 0 && machrd[1] - ech[1] > 0) {
            nextsetp = [ech[0] - 1, ech[1] + 1];
        }
    }
    console.log("mob goes 2 ", nextsetp);
    ech[en] = nextsetp;
    let enenene = document.getElementById('s_'+echrds[en]).innerHTML;
    document.getElementById('s_'+echrds[en]).innerHTML = '';
    document.getElementById('s_' + nextsetp[0] + '_' + nextsetp[1]).innerHTML = enenene;
    echrds[en] = nextsetp[0] + '_' + nextsetp[1];

}

function eattack(en) {
    console.log('enemy attacks ....');
}