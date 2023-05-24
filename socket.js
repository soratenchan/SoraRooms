const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const bodyParser = require("body-parser");
// Socket.ioをインポート
const socketIo = require("socket.io");
const app = express();
const server = http.Server(app);
const multer = require("multer");
const updir = path.resolve(__dirname, "./tempMap"); // アプリケーションフォルダのサブディレクトリ "./tmp" をアップロード先にしている。

// 初期化
const io = socketIo(server);

const PORT = 5500;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, path.resolve(__dirname, "./tempMap"));
  },
  filename(req, file, callback) {
    const uniqueSuffix = Math.random().toString(26).substring(4, 10);
    callback(null, `${Date.now()}-${uniqueSuffix}-${file.originalname}`);
  },
});

// multerの設定
const MAXFILES = 3;
const namedOption = [
  { name: "tileMapJson", maxCount: 1 },
  { name: "tileSetPng", maxCount: MAXFILES },
  { name: "thumbnail", maxCount: MAXFILES },
];
const upload = multer({
  storage,
  fileFilter(req, file, callback) {
    // console.log(file.mimetype);
    callback(null, true);
    return;
  },
});

let mapConfig = {
  canDisplayPlayerName: "no",
  canUseEmote: "no",
  canUseTextChat: "no",
  canUseVoiceChat: "no",
  gameGenre: "",
};

let serverWebSocketPlayerList = {};

app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  const mapName = req.query.map;
  let config = JSON.parse(fs.readFileSync(`user-map/${mapName}/file.json`));
  res.render(__dirname + "/index.ejs", {
    data: { mapConfig: JSON.stringify(config) },
  });
});
app.set("view engine", "ejs");
app.get("/enter", (req, res) => {
  const dirPath = "user-map";
  const data2 = {};
  fs.readdirSync(dirPath).forEach((dirName) => {
    const filePath = path.join(dirPath, dirName, "file.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      data2[dirName] = JSON.parse(content);
    }
  });
  const data = fs.readdirSync(__dirname + "/user-map");
  res.render(__dirname + "/enter.ejs", {
    data: data,
    data2: data2,
  });
});
app.get("/create", (req, res) => {
  res.sendFile(__dirname + "/createMap.html");
});
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});
app.get("/firebase-init.js", (req, res) => {
  res.sendFile(__dirname + "/firebase-init.js");
});
app.get("/authentication.js", (req, res) => {
  res.sendFile(__dirname + "/authentication.js");
});
app.get("/index.js", (req, res) => {
  res.sendFile(__dirname + "/index.js");
});
app.get("/script.js", (req, res) => {
  res.sendFile(__dirname + "/script.js");
});
app.use("/assets", express.static("assets"));
app.use("/user-map", express.static("user-map"));
app.use("/thumbnails", express.static("thumbnails"));
app.use("/dist", express.static("dist"));
app.use("/room", express.static("room"));

// createMapから送られてきたmapNameのvalueでフォルダを作成し、2つのファイルを格納
app.post("/createMap", upload.fields(namedOption), (req, res) => {
  const path1 = req.files["tileMapJson"][0].path.replace(/\\/g, "/");
  fs.mkdirSync("user-map/" + req.body.mapName);
  if (path1) {
    const dest = "user-map/" + req.body.mapName + "/" + "tileMap.json";
    fs.renameSync(path1, dest); // 長い一時ファイル名を元のファイル名にリネームする。
    let jsonData = JSON.parse(fs.readFileSync(dest));
    jsonData["tilesets"][0][
      "image"
    ] = `./user-map/${req.body.mapName}/tileSet.png`;
    fs.writeFileSync(dest, JSON.stringify(jsonData));
    // res.render("upload", { message: `${dest} にアップロードされました。` });
  } else {
    res.render("upload", { message: "エラー：アップロードできませんでした。" });
    return;
  }
  const n = req.files["tileSetPng"].length;
  for (let i = 0; i < n; i++) {
    let path2 = req.files["tileSetPng"][i].path.replace(/\\/g, "/");
    let dest2 = "user-map/" + req.body.mapName + "/" + "tileSet.png";
    fs.renameSync(path2, dest2);
  }
  const a = req.files["thumbnail"].length;
  for (let i = 0; i < n; i++) {
    let path3 = req.files["thumbnail"][i].path.replace(/\\/g, "/");
    let dest3 = "thumbnails/" + req.body.mapName + ".png";
    fs.renameSync(path3, dest3);
  }

  // マップの設定をjson化してからjsonファイルとしてフォルダに格納
  mapConfig.canDisplayPlayerName = req.body.canDisplayPlayerName;
  mapConfig.canUseEmote = req.body.canUseEmote;
  mapConfig.canUseTextChat = req.body.canUseTextChat;
  mapConfig.canUseVoiceChat = req.body.canUseVoiceChat;
  mapConfig.gameGenre = req.body.gameGenre;
  const jsonMapConfig = JSON.stringify(mapConfig);
  fs.writeFile(
    `user-map/${req.body.mapName}/file.json`,
    jsonMapConfig,
    (err) => {
      if (err) throw err;
    }
  );
  fs.readdir(updir, (error, files) => {});
  res.redirect("/enter");
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

// クライアントとのコネクションが確立したら'connected'という表示させる
io.on("connection", (socket) => {
  // console.log("user connected");
  socket.on("getSocketId", () => {
    // socketIdをgetSocketIdの送信元に送る
    io.to(socket.id).emit("receiveSocketId", socket.id);
  });
  // 第一引数には受信したメッセージが入り、ログに出力する
  socket.on("sendPlayerInfo", (playerInfo) => {
    // console.log(playerInfo.mapName);
    // console.log("playerInfo: ", playerInfo);
    socket.join(playerInfo.mapName);
    serverWebSocketPlayerList[socket.id] = playerInfo;
    // console.log(serverWebSocketPlayerList);
    io.to(playerInfo.mapName).emit(
      "receivePlayerInfo",
      serverWebSocketPlayerList
    );
  });

  // チャットで送られてきたメッセージをmapNameで作ったルームごとに送信
  socket.on("sendMessage", (message) => {
    socket.join(message.mapName);
    // 'receiveMessage' というイベントを発火、受信したメッセージを全てのクライアントに対して送信する
    io.to(message.mapName).emit("receiveMessage", message);
  });

  // プレイヤーが切断したらserverWebSocketPlayerListから該当のプレイヤーを削除したのちにplayerIdを送信
  socket.on("disconnect", () => {
    io.emit("disconnectPlayer", serverWebSocketPlayerList[socket.id]);
    delete serverWebSocketPlayerList[socket.id];
  });
});

// console.log(data["tilesets"][0]["image"]);

const editTileMapJsonFile = (file, tileSetFile) => {};
