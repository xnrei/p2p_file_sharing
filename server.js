
const path = require("path");
const express = require("express");
const bodyparser = require("body-parser");
const rimraf = require('rimraf')
const multer = require("multer");
const fs = require("fs");
const mysql2 = require('mysql2');const http = require('http');
const sockjs = require('sockjs');

const wss = sockjs.createServer();
const server = express();
wss.installHandlers(server);
server.listen(3000, '0.0.0.0');


server.set('view engine', 'ejs')
server.use(express.static("public"));

var db = mysql2.createConnection({
    host: "localhost",
    user: "newuser",
    password: "password",
    port: 3306,
    database: "filedb"
});

db.connect(function(err) {
    if (err) throw err;
    console.log('Connected to the MySQL server.');
});


var uploadsDir = __dirname + "/public/uploads";

setInterval(() => {
    fs.readdir(uploadsDir, function (err, files) {
        files.forEach(function (file, index) {
            fs.stat(path.join(uploadsDir, file), function (err, stat) {
                var endTime, now;
                if (err) {
                    return console.error(err);
                }
                now = new Date().getTime();
                endTime = new Date(stat.ctime).getTime() + 300000;
                if (now > endTime) {
                    return rimraf(path.join(uploadsDir, file), function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        var deleteData = "DELETE FROM files WHERE files_src=?"
                        db.query(deleteData, [file], (err, result) => {
                            if (err) throw err
                            console.log("row deleted")
                        })
                        console.log("successfully deleted");
                    });
                }
            });
        });
    });
},2000);

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads");
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + "-" + Date.now() + path.extname(file.originalname)
        );
    },
});

var maxSize = 10000 * 1024 * 1024;

var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize }
}).single("file");

server.use(express.static(path.resolve(__dirname + "/public/uploads")));
server.use(bodyparser.urlencoded({ extended: false }));
server.use(bodyparser.json());

server.get("/", (req, res) => {
    res.render('index');
});

server.post("/uploadfile", (req, res) => {
    upload(req, res, function (err) {
        // if (err) {
        //     return res.end("Error uploading file." + err);
        // }
        // res.json({
        //     path: req.file.filename
        // });
        if (!req.file) {
            console.log("No file upload");
        } else {
            console.log(req.file.filename)
            var filesrc = req.file.filename
            var clientIp = req.ip
            console.log(req.socket.remoteAddress);
            console.log(req.ip);
            // var clientIp = requestIp.getClientIp(req);
            // console.log(clientIp);
            var insertData = "INSERT INTO files(files_src, files_clientip)VALUES(?, ?)"
            db.query(insertData, [filesrc, clientIp], (err, result) => {
                if (err) throw err
                console.log("row created")
            })
            res.json({
                path: req.file.filename
            });
        }
    });
});

server.get('/files/:id', (req, res) => {
    console.log(req.params.id)
    res.render('displayfile',{path:req.params.id})
})

server.get("/download", (req, res) => {
    var pathoutput = req.query.path;
    console.log(pathoutput);
    var fullpath = path.join(__dirname, pathoutput);
    res.download(fullpath, (err) => {
        if (err) {
            res.send(err);
        }
    });
});

// server.listen(3000,    () => {
//     console.log("App is listening on port 3000");
// });