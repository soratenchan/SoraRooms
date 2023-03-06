const express = require("express");
const http = require("http");
// Socket.ioをインポート
const socketIo = require("socket.io");
const app = express();
const server = http.Server(app);

// 初期化
const io = socketIo(server);

const PORT = 3000;

let serverWebSocketPlayerList = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/enter", (req, res) => {
  res.sendFile(__dirname + "/enter.html");
});
app.get("/index.js", (req, res) => {
  res.sendFile(__dirname + "/index.js");
});
app.use("/assets", express.static("assets"));

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
    // console.log("playerInfo: ", playerInfo);
    serverWebSocketPlayerList[socket.id] = playerInfo;
    // console.log(serverWebSocketPlayerList);
    io.emit("receivePlayerInfo", serverWebSocketPlayerList);
  });

  // プレイヤーが切断したらserverWebSocketPlayerListから該当のプレイヤーを削除したのちにplayerIdを送信
  socket.on("disconnect", () => {
    io.emit("disconnectPlayer", serverWebSocketPlayerList[socket.id]);
    delete serverWebSocketPlayerList[socket.id];
  });
});
