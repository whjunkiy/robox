'use strict';

const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const url = require('url');
const path = require('path');
const Websocket = require('websocket').server;
const MongoClient = require("mongodb").MongoClient;
const db_url = "mongodb://localhost:27017/";
const mongo = require('mongodb');
const mongoClient = new MongoClient(db_url, {useNewUrlParser: true, useUnifiedTopology: true});
let db;
const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'aplication/font-sfnt'
};
const enemises_start_chords = [
    '10_10', '10_9', '9_10', '9_9', '10_8', '8_10', '9_8', '8_9', '8_8'
];

function ObjectLength_Modern( object ) {
    return Object.keys(object).length;
}

mongoClient.connect(function (err, client) {
    if (err) {
        console.log("ERROR DURING CONNECT TO DB");
        console.log(err);
    } else {
        console.log("Seccessfully connected with db");
    }
    db = client.db("robox");
});

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    let pathname = path.join(__dirname, sanitizePath);

/*
    if (req.url == '/') {
        res.writeHead(200);
        res.end(fs.readFileSync('./index.html', 'utf8'));
    } else if (req.url == '/rbx.js') {
        res.writeHead(200);
        res.end(fs.readFileSync('./rbx.js', 'utf8'));
    } else {
        res.writeHead(200);
        res.end("<h1>404</h1>");
    }
    */
    fs.exists(pathname, function (exist) {
        if(!exist) {
            // if the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // if is a directory, then look for index.html
        if (fs.statSync(pathname).isDirectory() && pathname != 'chat') {
            pathname += '/index.html';
        }

        // read file from file system
        fs.readFile(pathname, function(err, data){
            if(err){
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                // based on the URL path, extract the file extention. e.g. .js, .doc, ...
                const ext = path.parse(pathname).ext;
                // if the file is found, set Content-type and send data
                res.setHeader('Content-type', mimeType[ext] || 'text/plain' );
                res.end(data);
            }
        });
    });
});

server.listen(8000, () => {
    console.log('Listen port 8000');
});

const ws = new Websocket({
    httpServer: server,
    autoAcceptConnections: false
});

const clients = [];

ws.on('request', req => {
    const connection = req.accept('', req.origin);
    clients.push(connection);
    let clid = clients.length - 1;
    console.log('Connected ' + connection.remoteAddress + ' id: ' + clid);

    connection.on('message', message => {
        const dataName = message.type + 'Data';
        const data = message[dataName];

        pasreMsg(data, clients[clid]);
        /*
        console.dir(message);
        console.log('Received: ' + data);
        clients.forEach(client => {
          if (connection !== client) {
            client.send(data);
          }
        });
        */

    });


    connection.on('close', (reasonCode, description) => {
        console.log('Disconnected ' + connection.remoteAddress);
        console.dir({reasonCode, description});
    });

});


function pasreMsg(data, us) {
    let params = data.split(/\*\|\*/);
    //console.log('params:');
    //console.log(params);
    let match = [];
    //console.log('regexp:');
    for (let i in params) {
        //console.log('parsing: '+ params[i]);
        let regex = /([a-zA-Z0-9_]+)=(.*)/ig;
        match[i] = regex.exec(params[i]);
        //console.log('got match:');
        //console.log(match[i]);
    }
    if (typeof(match[0][2]) === "undefined") {
        console.log("Something went wrong...");
        console.log(data);
        return;
    }
    if (match[0][2] == 'login') {
        loginMe(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'get_env') {
        get_my_env(match[1][2], us);
    } else if (match[0][2] == 'scan') {
        scan_loc(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'pick') {
        pick_item(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'depick') {
        depick_item(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'scan_info') {
        scan_info(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'drop_env_item') {
        drop_env_item(match[1][2], match[2][2], us)
    } else if (match[0][2] == 'use_env_item') {
        use_item(match[1][2], match[2][2], us);
    } else if (match[0][2] == 'deequip') {
        deequip(match[1][2], match[2][2], us);
    } else if (match[0][2] == 'make_step') {
        makeStep(match[1][2], match[2][2], us, 0);
    } else if (match[0][2] == 'just_drop') {
        just_drop(match[1][2], match[2][2]);
    } else if (match[0][2] == 'restore') {
        restore_ses(match[1][2], us);
    } else if (match[0][2] == 'attack') {
        attack(match[1][2], us);
    } else if (match[0][2] == 'getfightstate') {
        getfightstate(match[1][2], us);
    } else if (match[0][2] == 'checkmeplz') {
        check_me_plz(match[1][2], match[2][2], us);
    } else if (match[0][2] == 'figthstat') {
        figthstat(match[1][2], us);
    } else {
        console.log("UNKNOWN query:");
        console.log(data);
    }
}

function check_me_plz(lgn, pas, us) {
    const users = db.collection("users");
    users.findOne({login: lgn, pass: pas}, function(err, uzr) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
            return;
        }
        if (uzr != null) {
            us.send('checkmeplz *|* ok');
        } else {
            us.send('checkmeplz *|* nono');
        }
    });
}

function loginMe(login, pass, us) {
    //console.log("Trying to enter with: " + login + " & " + pass);
    const collection = db.collection("users");
    let mdpass = crypto.createHash('md5').update(pass).digest("hex");
    let user = {login: login};
    collection.findOne(user, function (err, document) {
        if (err == null) {
            if (document == null) {
                collection.insertOne({login: login, pass: mdpass, head: ["Al", 50], arms: ["Al", 50], body: ["Al", 50], legs: ["Al", 50],
                    coins: 0, stuff: [], lvl: 1, exp: 0, power: 3, speed: 1, sens: 3, memory: 3, dur: 3, energy: 3,
                    gunless: 1, pistols: 0, ar: 0, heavy: 0, energo: 0, tech: 0, equiped: {}, spec: {},
                    avail:{parms:0, mastr:0}, loca:0}, function (err, document) {
                    if (err == null) {
                        const collection2 = db.collection("loot");
                        collection2.insertOne({login: login, loca: 0, loot:["stick", "Палка"]}, function (err, document) {
                            if (!err) {
                                //console.log('new user added');
                                us.send('comin *|* ' + JSON.stringify({login: login, token: mdpass}));
                            }
                        });
                    }
                    //client.close();
                });
            } else {
                if (document.pass == mdpass) {
                    us.send('comin *|* ' + JSON.stringify({login: login, token: mdpass}));
                } else {
                    us.send('comin *|* wrong_pass');
                }
            }
        } else {
            console.log(err);
            us.send('db error');
        }
    });
}

function get_my_env(login, us) {
    const collection = db.collection("users");
    const user = {login: login};
    collection.findOne(user, function (err, document) {
        if (err != null) {
            us.send('db error');
        } else {
            if (document) {
                //console.log("User stuff:");
                //console.log(document.stuff);
                us.send('env *|* ' + JSON.stringify(document));
            } else {
                us.send('env *|* empty');
            }
        }
    });
}

function scan_loc(loca, usr, us) {
    //console.log("SCANNING: " + loca + " for user = " + usr + " ...");
    const collection = db.collection("loot");
    let tmp = {login: usr, loca: parseInt(loca)};
    collection.find(tmp).toArray(function (err, doc) {
        if (err) {
            us.send("Error");
        } else {
            if (doc.length > 0) {
                us.send("scan *|* " + JSON.stringify(doc));
            } else {
                us.send("scan *|* empty");
            }
        }
    });
}

function pick_item(item, usr, us) {
    const collection = db.collection("loot");
    let id = new mongo.ObjectID(item);
    let tmp = {login: usr, _id: id};
    collection.findOne(tmp, function (err, doc) {
        if (err) {
            console.log(err);
            us.send("error");
        } else {
            //console.log("Ive got:");
            //console.log(doc);
            if (doc) {
                const itm_login = doc.login;
                const itm_loca = doc.loca;
                const itm_itm = doc.loot;
                const collection2 = db.collection("users");
                //console.log("Looking for user:");
                //console.log({login: itm_login, loca: itm_loca});
                collection2.findOne({login: itm_login, loca: itm_loca}, function (err, document) {
                    if (err) {
                        console.log(err);
                        us.send("error");
                    } else {
                        // console.log("UserInfo:");
                        // console.log(document);
                        if (document) {
                            let usr_loot = document.stuff;
                            usr_loot.push(itm_itm);
                            // console.log("Picking up for:");
                            // console.log({login: itm_login});
                            // console.log("Set:");
                            // console.log({stuff: usr_loot});
                            collection2.updateOne({login: itm_login}, {$set: {stuff: usr_loot}}, function (err,doc2){
                                if (err) {
                                    console.log("error during adding item");
                                    console.log(err);
                                    us.send("error");
                                } else {
                                    //console.log("I added item to inv!!!!");
                                    collection.deleteOne(tmp, function (err,doc2){
                                        if (err) {
                                            console.log("error");
                                            console.log(err);
                                            us.send("error");
                                        } else {
                                            us.send("pick *|* done");
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    })
}

function depick_item(item, usr, us) {
    const collection = db.collection("loot");
    let id = new mongo.ObjectID(item);
    let tmp = {login: usr, _id: id};
    collection.findOne(tmp, function (err, doc) {
        if (err) {
            console.log(err);
            us.send("error");
        } else {
            //console.log("Ive got:");
            //console.log(doc);
            if (doc) {
                const itm_login = doc.login;
                const itm_loca = doc.loca;
                const itm_itm = doc.loot[0];
                const collection2 = db.collection("users");
                // console.log("Looking for user:");
                // console.log({login: itm_login, loca: itm_loca});
                collection2.findOne({login: itm_login, loca: itm_loca}, function (err, document) {
                    if (err) {
                        console.log(err);
                        us.send("error");
                    } else {
                        // console.log("UserInfo:");
                        // console.log(document);
                        if (document) {
                            let usr_loot = document.stuff;
                            usr_loot.push(itm_itm);
                            // console.log("Picking up for:");
                            // console.log({login: itm_login});
                            // console.log("Set:");
                            // console.log({stuff: usr_loot});
                            collection.deleteOne(tmp, function (err,doc2){
                                if (err) {
                                    console.log("error");
                                    console.log(err);
                                    us.send("error");
                                } else {
                                    us.send("depick *|* done");
                                }
                            });
                        }
                    }
                });
            }
        }
    })
}

function scan_info(loca, usr, us) {
    const collection = db.collection("info");
    //console.log("Looking for loca = " + loca);
    collection.findOne({loca: parseInt(loca)}, function (err, doc) {
        if (err) {
            us.send("ERROR");
        } else {
            if (doc) {
                if (typeof(doc.info) != "undefined" && doc.info !== null) {
                    us.send("scan_info *|* " + doc.info);
                }
            }
        }
    });
}

function drop_env_item(item, usr, us) {
    //console.log("Droping " + item + " for user = " + usr);
    const collection = db.collection("users");
    collection.findOne({login: usr}, function (err, doc) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
        } else {
            if (doc) {
                if (typeof(doc.stuff) !== "undefined" && doc.stuff !== null) {
                    //console.log("trying to del " + item);
                    let n = null;
                    let stf = doc.stuff;
                    for (let i in stf) {
                        if (stf[i][0] == item) {
                            //console.log("found ! = " + i);
                            n = i;
                        }
                    }
                    stf.splice(n,1);
                    // console.log("Finally stuff:");
                    // console.log(stf);
                    collection.updateOne({login: usr}, {$set : {stuff: stf}}, function(err,doc){
                        if (!err) {
                            us.send("drop_env_item *|* done");
                        }
                    });
                } else {
                    us.send("drop_env_item *|* done");
                }
            }
        }
    });
}

function use_item(item, usr, us) {
    const collection = db.collection("users");
    collection.findOne({login: usr}, function (err, doc) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
        } else {
            if (doc) {
                if (typeof(doc.stuff) !== "undefined" && doc.stuff !== null) {
                    //console.log("trying to del " + item);
                    let n = null;
                    let stf = doc.stuff;
                    let touse = null;
                    for (let i in stf) {
                        if (stf[i][0] == item) {
                            //console.log("found ! = " + i);
                            touse = stf[i];
                            n = i;
                        }
                    }
                    stf.splice(n,1);
                    const coll_items = db.collection("items");
                    coll_items.findOne({item: touse[0]}, function(err, itm){
                        let flag = '';
                        if (err) {
                            console.log("error");
                            console.log(err);
                            us.send("error");
                        } else {
                            if (itm) {
                                if (itm.eqip == 'w') {
                                    //console.log("Equiped:");
                                    //console.log(doc.equiped);
                                    if (ObjectLength_Modern(doc.equiped) < 4) {
                                        if (typeof(doc.equiped.w1) === "undefined" || doc.equiped.w1 === null) {
                                            doc.equiped.w1 = itm;
                                            flag = 'w1';
                                        } else if (typeof(doc.equiped.w2) === "undefined" || doc.equiped.w2 === null) {
                                            doc.equiped.w2 = itm;
                                            flag = 'w2';
                                        } else if (typeof(doc.equiped.w3) === "undefined" || doc.equiped.w3 === null) {
                                            doc.equiped.w3 = itm;
                                            flag = 'w3';
                                        } else if (typeof(doc.equiped.w4) === "undefined" || doc.equiped.w4 === null) {
                                            doc.equiped.w4 = itm;
                                            flag = 'w4';
                                        } else {
                                            us.send("use_env_item *|* Iterator: 2 many items equiped...");
                                        }
                                    } else {
                                        us.send("use_env_item *|* Length: 2 many items equiped... " + doc.equiped.length);
                                    }
                                } else if (itm.eqip == 'u') {
                                    //TODO use useble items
                                } else {
                                    us.send("use_env_item *|* I dunno how 2 use it...");
                                }
                            }
                        }
                        if (flag) {
                            collection.updateOne({login: usr}, {$set : {stuff: stf, equiped: doc.equiped}}, function(err,doc2){
                                if (err) {
                                    console.log("error");
                                    console.log(err);
                                    us.send("error");
                                } else {
                                    us.send("use_env_item *|* " + flag);
                                }
                            });
                        } else {
                            us.send("use_env_item *|* i didnt equip dat...");
                        }
                    });
                } else {
                    us.send("drop_env_item *|* strange shit...");
                }
            }
        }
    });
}

function deequip(item, usr, us) {
    //console.log("Deequiping " + item + " from user " + usr);
    const collection = db.collection("users");
    collection.findOne({login: usr}, function (err, doc) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
        } else {
            let tmp = doc.equiped[item];
            // console.log("tmp:");
            // console.log(tmp);
            delete doc.equiped[item];
            let stf = doc.stuff;
            stf.push([tmp.item, tmp.name, tmp.info]);
            // console.log("Setting up eqip and stuff...");
            // console.log(stf);
            // console.log(doc.equiped);

            collection.updateOne({login: usr}, {$set : {stuff: stf, equiped: doc.equiped}}, function(err,doc2){
                if (err) {
                    console.log("error");
                    console.log(err);
                    us.send("error");
                } else {
                    us.send("deequip *|* " + JSON.stringify({w: item, id: stf.length-1, stuff: [tmp.item, tmp.name, tmp.info]}));
                }
            });
        }
    });
}

function makeStep(loca, usr, us, p) {
    // console.log("Making step... " + p);
    // console.log("loca:");
    // console.log(loca);
    // console.log("usr:");
    // console.log(usr);
    const locas = db.collection("locas");
    const users = db.collection("users");
    const mobs = db.collection("mobs");

    if (!p) {
        locas.findOne({id: parseInt(loca)}, function (err, doc) {
            if (err) {
                console.log("error");
                console.log(err);
                us.send("error");
                return;
            }
            makeStep(doc, usr, us, 1);
        });
    } else if (p == 1) {
        users.findOne({login: usr}, function (err, doc) {
            if (err) {
                console.log("error");
                console.log(err);
                us.send("error");
                return;
            }
            makeStep(loca, doc, us, 2);
        })
    } else if (p == 2) {
        if (loca.id == 1) {
            if (usr.loca == 0 || usr.loca == 2 || usr.loca == 1) {
                // db.mobs.insertOne({id:1, loca: 1, lvl: 1, name: 'RoboDog RGF-4', info: 'Робо-собака: Устаревшая модель охранных систем, созданных ещё людьми...', quality: 1});
                // db.locas.updateOne({id:1}, {$set: user_killed_mobs:{}})
                // db.locas.insertOne({id: 0 , title: "RoboGraveYard"});
                mobs.find({loca: loca.id}).toArray(function(err, docs) {
                    //TODO check, if mobs still here...
                    if (err) {
                        console.log("error");
                        console.log(err);
                        us.send("error");
                        return;
                    }
                    let mob_names = [];
                    let mobs_info = [];
                    let mobs_pwr = 0;
                    for (let i in docs) {
                        mob_names.push(docs[i]['name']);
                        mobs_info.push(docs[i]['info']);
                        mobs_pwr += docs[i]['lvl'] * docs[i]['quality'];
                    }
                    let info = 'Сканер распознал объекты: ' + mob_names.join(',') + '... <br>';
                    info += mobs_info.join('...<br>');
                    info += '<br>Уровень опасности: ' + mobs_pwr + '...<br>';
                    let dialog = '<div id="inr_txt">Собака смотрит на вас с недоверием... <br> Она явно входит в боевой режим...<br> Варианты действия: </div>';
                    dialog += '<div class="dialog_option" id="dlg_1" onclick="Attack();">Атаковать</div>';
                    let flag = false;
                    for (let i in usr.stuff) {
                        if (usr.stuff[i] == 'stick') {
                            flag = true;
                            dialog += '<div class="dialog_option" id="dlg_2" onclick="dialoger(0);">Кинуть палку</div>';
                        }
                    }
                    if (!flag) {
                        for (let i in usr.equiped) {
                            if (usr.equiped[i]['item'] == 'stick') {
                                dialog += '<div class="dialog_option" id="dlg_2" onclick="dialoger(0);">Кинуть палку</div>';
                            }
                        }
                    }
                    dialog += '<div class="dialog_option" id="dlg_3" onclick="make_step(0);">Отступить</div>';
                    users.updateOne({login: usr.login},{$set: {loca: loca.id}}, function (err, tt) {
                        if (err) {
                            console.log("error");
                            console.log(err);
                            us.send("error");
                            return;
                        }
                        us.send("makestep *|* " + JSON.stringify({title: loca.title, sub_info: info, scan_info: dialog}));
                    });
                });
            } else {
                us.send("error");
                return;
            }
        } else if (loca.id == 0) {
            if (usr.loca == 0 || usr.loca == 1) {
                let info = 'Вы обнаруживаете себя на кладбище разбитой техники...<br>\n' +
                    '                Кажется, что-то шевелится у входа...<br>' +
                    '<button onclick="make_step(1);">Подойти</button>\n' +
                    '                <button onclick="scan();">Просканировать местность</button>';
                let dialog = 'И снова темно... <br>Хорошо, что nightVision ещё работает...<br>';
                users.updateOne({login: usr.login},{$set: {loca: loca.id}}, function (err, tt) {
                    if (err) {
                        console.log("error");
                        console.log(err);
                        us.send("error");
                        return;
                    }
                    us.send("makestep *|* " + JSON.stringify({title: 'RoboGraveYard', sub_info: info, scan_info: dialog}));
                });
            }
        }
    }
}

function just_drop(item, lgn) {
    let flag = -1;
    const users = db.collection("users");
    users.findOne({login: lgn}, function(err, usr) {
        for (let i in usr.stuff) {
            if (usr.stuff[i] == item) {
                flag = i;
            }
        }
        if (flag != -1) {
            usr.stuff.splice(flag, 1);
            //console.log("Found in stuff... Deleting...");
            users.updateOne({login: lgn}, {$set:{stuff: usr.stuff}});
        } else {
            for (let i in usr.equiped) {
                if (usr.equiped[i]['item'] == item) {
                    flag = i;
                }
            }
            if (flag != -1) {
                //console.log("Found in equip... Deleting...");
                delete usr.equiped[flag];
                users.updateOne({login: lgn}, {$set:{equiped: usr.equiped}});
            }
        }
    });
}

function restore_ses(lgn, us) {
    //console.log("restoring ses 4 +" + lgn);
    const users = db.collection("users");
    users.findOne({login: lgn}, function(err, usr) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
            return;
        }
        if (parseInt(usr.infight) == 1) {
            //console.log("in fight!");
            getfightstate(lgn, us);
        } else {
            //console.log("just walking...");
            makeStep(usr.loca, lgn, us, 0);
        }
    });
}

function attack(usr, us) {
    const users = db.collection("users");
    const fHistory = db.collection("fhistory");
    users.findOne({login: usr}, function(err, uzr) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
            return;
        }
        const mobs = db.collection("mobs");
        mobs.find({loca: uzr.loca}).toArray(function (err, enemies) {
            if (err) {
                console.log("error");
                console.log(err);
                us.send("error");
                return;
            }
            if (enemies.length > 0) {
                users.updateOne({login: usr},{$set: {infight: 1}}, function(err, tt){
                    if (err) {
                        console.log("error");
                        console.log(err);
                        us.send("error");
                        return;
                    }
                    const fight = db.collection("fights");
                    fight.insertOne({login: usr, loca: uzr.loca, enemies: enemies, dati: Math.floor((new Date).getTime()/1000)},function (err, ttt) {
                        if (err) {
                            console.log("error");
                            console.log(err);
                            us.send("error");
                            return;
                        }
                        let echrds = {};
                        let ehp = {};
                        for (let i in enemies) {
                            echrds[i] = enemises_start_chords[i];
                            ehp[i] = parseInt(enemies[i]['dur']) * parseInt(enemies[i]['lvl']) * 5;
                        }
                        let uhp = parseInt(uzr.lvl) * parseInt(uzr.dur) * 5;
                        let fobj = {uzr: uzr, enemies: enemies, fid: ttt.insertedId, uchrd: '1_1', ehp: ehp, echrds: echrds, uhp: uhp, dati: Math.floor((new Date).getTime()/1000)};
                        fHistory.insertOne(fobj, function (err, tttt) {
                            if (err) {
                                console.log("error");
                                console.log(err);
                                us.send("error");
                                return;
                            }
                            us.send("fight *|* " + JSON.stringify(fobj));
                        });
                    });
                });
            }
        })
    });
}

function getfightstate(lgn, us) {
    const fight = db.collection("fights");
    const users = db.collection("users");
    const locas = db.collection("locas");
    const fHistory = db.collection("fhistory");
    users.findOne({login: lgn}, function(err, uzr) {
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
            return;
        }
        locas.findOne({id: uzr.loca}, function(err, loca) {
            if (err) {
                console.log("error");
                console.log(err);
                us.send("error");
                return;
            }
            fight.findOne({login: lgn}, function(err, fght) {
                if (err) {
                    console.log("error");
                    console.log(err);
                    us.send("error");
                    return;
                }
                let id = new mongo.ObjectID(fght._id);
                fHistory.find({fid: id}).sort({dati: -1}).toArray(function(err, fh) {
                    if (err) {
                        console.log("error");
                        console.log(err);
                        us.send("error");
                        return;
                    }

                    let fobj = {
                        uzr: uzr,
                        enemies: fh[0]['enemies'],
                        fid: fght._id,
                        uchrd: fh[0]['uchrd'],
                        ehp: fh[0]['ehp'],
                        echrds: fh[0]['echrds'],
                        uhp: fh[0]['uhp'],
                        ap_avail: fh[0]['ap_avail'],
                        uskills: uzr.skills
                    };
                    let respa = {loca: loca, fight: fobj, hstry: fh};
                    us.send("res_fight *|* " + JSON.stringify(respa));
                });
            });
        });
    });
}

function figthstat(data) {
    let datka = JSON.parse(data);
    const fHistory = db.collection("fhistory");
    console.log("datka:");
    console.log(datka);
    //let fobj = {fid: ttt.insertedId, uchrd: '1_1', ehp: ehp, echrds: echrds, uhp: uhp, dati: Math.floor((new Date).getTime()/1000)};

    let id = new mongo.ObjectID(datka.fid);

    console.log("id = ", id, datka.fid);

    fHistory.findOne({fid: id}, {"sort": ['dati','desc']}, function(err, doc){
        if (err) {
            console.log("error");
            console.log(err);
            us.send("error");
            return;
        }
        if (!doc) {
            console.log('WTF???');
            return;
        }
        for (let i in doc) {
            //console.log("i: " + i);
            if (typeof(datka[i]) !== "undefined" && i !== 'fid') {
                //console.log("i found field for: " + i);
                doc[i] = datka[i];
            }
        }
        for (let i in datka) {
            if (i !== 'fid') {
                doc[i] = datka[i];
            }
        }
        delete doc["_id"];
        doc.dati = Math.floor((new Date).getTime()/1000);
        fHistory.insertOne(doc, function (err, tttt) {
            if (err) {
                console.log("error");
                console.log(err);
                us.send("error");
                return;
            }
            //us.send("fight *|* " + JSON.stringify(fobj));
        });
    });
}