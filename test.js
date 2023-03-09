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
// const upload = multer({ dest: updir });
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = 3000;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, path.resolve(__dirname, "./tempMap"));
  },
  filename(req, file, callback) {
    const uniqueSuffix = Math.random().toString(26).substring(4, 10);
    callback(null, `${Date.now()}-${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter(req, file, callback) {
    console.log(file.mimetype);
    // if (
    //   ["video/mp4", "image/png", "image/jpeg", "audio/mpeg"].includes(
    //     file.mimetype
    //   )
    // ) {
    callback(null, true);
    return;
    // }
    // callback(new TypeError("Invalid File Type"));
  },
});

app.get("/single", (req, res) => {
  res.sendFile(__dirname + "/single.html");
});

app.post("/single", upload.single("file1"), (req, res) => {
  console.log(req.body.mapName);
  const path = req.file.path.replace(/\\/g, "/");
  fs.mkdirSync(req.body.mapName);
  if (path) {
    const dest = req.body.mapName + "/" + req.file.originalname;
    fs.renameSync(path, dest); // 長い一時ファイル名を元のファイル名にリネームする。
    console.log(dest);
    res.send("");
    // res.render("upload", { message: `${dest} にアップロードされました。` });
  } else {
    res.render("upload", { message: "エラー：アップロードできませんでした。" });
  }
  fs.readdir(updir, (error, files) => {
    console.log(files);
  });
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
