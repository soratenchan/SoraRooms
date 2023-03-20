const config = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  parent: "game-container",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
  backgroundColor: "#ffffff",
};

const game = new Phaser.Game(config);
const socket = io();
const mapName = getParam("map");
let playerId = Math.random().toString(32).substring(2);
let cursors;
let phaserPlayerList = {};
let webSocketPlayerList = {};
let worldLayer;
let spawnPoint;
let showDebug = false;
let follower;
let playerName = localStorage.getItem("playerName");
let anotherPlayerNameList = {};
let isEmoteFlag = false;
let avatar = localStorage.getItem("avatar");

function preload() {
  // 自分で作ったやつ
  // this.load.image("tiles", "/assets/testMap.png");
  // this.load.tilemapTiledJSON("map", "/assets/map.json");

  // this.load.image("tiles", "/assets/tilesets/tuxmon-sample-32px-extruded.png");
  this.load.image("tiles", `/user-map/${mapName}/tileSet.png`);
  // this.load.tilemapTiledJSON("map", "/assets/tilemaps/tuxemon-town.json");

  this.load.tilemapTiledJSON("map", `/user-map/${mapName}/tileMap.json`);
  this.load.atlas(
    "atlas",
    "/assets/atlas/atlas.png",
    "/assets/atlas/atlas.json"
  );
  this.load.spritesheet("dude", "assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48,
  });
  this.load.image("shakeHand", "/assets/shakehand.png");
}

function create() {
  // ページ表示段階でsocketIdを取得
  socket.emit("getSocketId");
  const map = this.make.tilemap({ key: "map" });

  // 自分で作ったやつ
  const tileset = map.addTilesetImage("tilemap", "tiles");

  // const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

  // 自分で作ったやつ
  const belowLayer = map.createLayer("ground", tileset, 0, 0);
  worldLayer = map.createLayer("object", tileset, 0, 0);
  // const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
  // worldLayer = map.createLayer("World", tileset, 0, 0);
  const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);
  if (aboveLayer) {
    aboveLayer.setDepth(10);
  }

  worldLayer.setCollisionByProperty({ collides: true });

  // 自分で作ったやつ
  spawnPoint = map.findObject("player", (obj) => obj.name === "spawnpoint");

  // spawnPoint = map.findObject("Objects", (obj) => obj.name === "Spawn Point");

  // Create a sprite with physics enabled via the physics system. The image used for the sprite has
  // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
  phaserPlayerList[playerId] = createPlayer(
    this.physics.add,
    worldLayer,
    spawnPoint
  );

  const anims = this.anims;
  // dudeのアニメーション作成
  anims.create({
    key: "dude-left",
    frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "dude-front",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });
  anims.create({
    key: "dude-back",
    frames: [{ key: "dude", frame: 4 }],
    frameRate: 20,
  });
  anims.create({
    key: "dude-right",
    frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });
  // misaのアニメーション作成
  anims.create({
    key: "misa-left",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-left-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-right",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-right-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-front",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-front-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-back",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-back-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });

  const camera = this.cameras.main;
  camera.startFollow(phaserPlayerList[playerId]);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  cursors = this.input.keyboard.createCursorKeys();

  // 衝突する処理のデバッグ
  this.input.keyboard.once("keydown-D", (event) => {
    // Turn on physics debugging to show player's hitbox
    this.physics.world.createDebugGraphic();

    // Create worldLayer collision graphic above the player, but below the help text
    const graphics = this.add.graphics().setAlpha(0.75).setDepth(20);
    worldLayer.renderDebug(graphics, {
      tileColor: null, // Color of non-colliding tiles
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
      faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Color of colliding face edges
    });
  });

  // プレイヤーに追従するimageを設定
  follower = this.add
    .follower(phaserPlayerList[playerId], 0, 0, "shakeHand")
    .setVisible(false);

  // プレイヤー名をtext要素で定義
  playerName = createPlayerName(
    this.add,
    phaserPlayerList[playerId],
    localStorage.getItem("playerName")
  );
  // プレイヤー名を中央寄せする
  playerName.setOrigin(0.5, 0.5);
}

function update(time, delta) {
  // プレイヤー名をプレイヤー座標の上に表示する
  playerName.setPosition(
    phaserPlayerList[playerId].x,
    phaserPlayerList[playerId].y - 20
  );
  // 他のプレイヤーの生成処理;
  for (const webSocketPlayerId in webSocketPlayerList) {
    if (!phaserPlayerList.hasOwnProperty(webSocketPlayerId)) {
      if (mapName == webSocketPlayerList[webSocketPlayerId].mapName) {
        phaserPlayerList[webSocketPlayerId] = createPlayer(
          this.physics.add,
          worldLayer,
          spawnPoint
        );
        this.physics.add.collider(
          phaserPlayerList[playerId],
          phaserPlayerList[webSocketPlayerId]
        );
      }
    }
  }
  // 他プレイヤーの削除処理
  for (const phaserPlayerId in phaserPlayerList) {
    if (phaserPlayerId == playerId) {
      continue;
    }
    if (!webSocketPlayerList.hasOwnProperty(phaserPlayerId)) {
      anotherPlayerNameList[phaserPlayerId].destroy();
      phaserPlayerList[phaserPlayerId].disableBody(true, true);
      delete phaserPlayerList[phaserPlayerId];
    }
  }

  const speed = 175;

  const prevVelocity = phaserPlayerList[playerId].body.velocity.clone();

  // Stop any previous movement from the last frame
  phaserPlayerList[playerId].body.setVelocity(0);

  // Horizontal movement
  // setPlayerDirection(player.body, "neutral");
  setPlayerIsMove(phaserPlayerList[playerId].body, false);

  // 他プレイヤーの情報更新
  for (const webSocketPlayerId in webSocketPlayerList) {
    if (webSocketPlayerId != playerId) {
      if (mapName == webSocketPlayerList[webSocketPlayerId].mapName) {
        //初回に各playerNameを作成・listに追加、その後は作成したplayerNameの位置を調整
        if (!anotherPlayerNameList[webSocketPlayerId]) {
          anotherPlayerNameList[webSocketPlayerId] = createPlayerName(
            this.add,
            webSocketPlayerList[webSocketPlayerId],
            webSocketPlayerList[webSocketPlayerId].playerName
          );
          anotherPlayerNameList[webSocketPlayerId].setOrigin(0.5, 0.5);
        } else {
          // console.log(webSocketPlayerId);
          // console.log(anotherPlayerNameList);
          anotherPlayerNameList[webSocketPlayerId].setPosition(
            webSocketPlayerList[webSocketPlayerId].x,
            webSocketPlayerList[webSocketPlayerId].y - 10
          );
          // anotherPlayerName.destroy();
        }
        phaserPlayerList[webSocketPlayerId].body.x =
          webSocketPlayerList[webSocketPlayerId].x;
        phaserPlayerList[webSocketPlayerId].body.y =
          webSocketPlayerList[webSocketPlayerId].y;
        if (webSocketPlayerList[webSocketPlayerId].isMove) {
          phaserPlayerList[webSocketPlayerId].anims.play(
            `misa-${webSocketPlayerList[webSocketPlayerId].direction}`,
            true
          );
        } else {
          phaserPlayerList[webSocketPlayerId].stop();
        }
      }
    }
  }

  if (cursors.left.isDown) {
    phaserPlayerList[playerId].body.setVelocityX(-speed);
    setPlayerDirection(phaserPlayerList[playerId].body, "left");
    setPlayerIsMove(phaserPlayerList[playerId].body, true);
  } else if (cursors.right.isDown) {
    phaserPlayerList[playerId].body.setVelocityX(speed);
    setPlayerDirection(phaserPlayerList[playerId].body, "right");
    setPlayerIsMove(phaserPlayerList[playerId].body, true);
  }

  // Vertical movement
  if (cursors.up.isDown) {
    phaserPlayerList[playerId].body.setVelocityY(-speed);
    setPlayerDirection(phaserPlayerList[playerId].body, "back");
    setPlayerIsMove(phaserPlayerList[playerId].body, true);
  } else if (cursors.down.isDown) {
    phaserPlayerList[playerId].body.setVelocityY(speed);
    setPlayerDirection(phaserPlayerList[playerId].body, "front");
    setPlayerIsMove(phaserPlayerList[playerId].body, true);
  }

  // Normalize and scale the velocity so that player can't move faster along a diagonal
  phaserPlayerList[playerId].body.velocity.normalize().scale(speed);
  // console.log("player.x=", phaserPlayerList[playerId].x);

  // プレイヤーが動いているか否かでアニメーション表示変える
  if (phaserPlayerList[playerId].body.isMove) {
    phaserPlayerList[playerId].anims.play(
      `${avatar}-${phaserPlayerList[playerId].body.direction}`,
      true
    );
  } else {
    phaserPlayerList[playerId].anims.stop();

    // If we were moving, pick and idle frame to use
    if (prevVelocity.x < 0)
      avatar === "misa"
        ? phaserPlayerList[playerId].setTexture("atlas", "misa-left")
        : phaserPlayerList[playerId].anims.play("dude-front");
    else if (prevVelocity.x > 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-right");
    else if (prevVelocity.y < 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-back");
    else if (prevVelocity.y > 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-front");
  }

  //isEmoteFlagで追従しているエモート画像のon/off
  follower.setScale(0.08);
  if (isEmoteFlag) {
    follower
      .setPosition(
        phaserPlayerList[playerId].x,
        phaserPlayerList[playerId].y - 40
      )
      .setVisible(true);
  } else {
    follower.setVisible(false);
  }
  // ボタンをクリックしたらプレイヤーに追従している画像を１秒間表示
  const domElement = document.getElementById("shakeHandImg");
  domElement.addEventListener("click", () => {
    isEmoteFlag = true;
    setTimeout(() => {
      isEmoteFlag = false;
    }, "1000");
  });

  // socket送信
  sendPlayerInfo(phaserPlayerList[playerId].body);
}

// ウェブソケットで自プレイヤーの情報送信
const sendPlayerInfo = (playerBody) => {
  const playerState = {
    x: playerBody.x,
    y: playerBody.y,
    direction: playerBody.direction,
    isMove: playerBody.isMove,
    id: playerId,
    playerName: localStorage.getItem("playerName"),
    mapName: mapName,
  };
  socket.emit("sendPlayerInfo", playerState);
};

// プレイヤーの移動方向の追加
const setPlayerDirection = (playerBody, direction) => {
  playerBody.direction = direction;
};

// プレイヤーが移動しているか否かの設定
const setPlayerIsMove = (playerBody, isMove) => {
  playerBody.isMove = isMove;
};

const createPlayer = (physicsAdd, worldLayer, spawnPoint) => {
  const player = physicsAdd
    .sprite(spawnPoint.x, spawnPoint.y, "atlas", "misa-front")
    .setSize(30, 40)
    .setOffset(0, 24);

  physicsAdd.collider(player, worldLayer);

  return player;
};

const playEmote = (follower, player, time, isEmote) => {
  // 画像を表示する
  // follower.setScale(0.08);
  // follower.setPosition(player.x, player.y - 45).setVisible(true);
  // 1秒後に画像を非表示にする
  time.addEvent({
    delay: 1000,
    callback: () => {
      follower.setVisible(false);
      isEmote = false;
    },
    loop: false,
  });
};

// phaser3上で動作するtext要素をプレイヤーの位置に作成
const createPlayerName = (element, player, name) => {
  let playerName = element.text(player.x, player.y, name, {
    font: "15px",
    fill: "#FFFFFF",
    align: "center",
  });
  return playerName;
};

// socketで送られてきたチャットメッセージを追加
const addMessageList = (message) => {
  const chat = document.getElementById("chat");
  const ul = document.getElementById("messageList");
  const li = document.createElement("p");
  const text = document.createTextNode(message.message);
  const name = document.createTextNode(message.playerName.data.text + ":");
  li.appendChild(name);
  li.appendChild(text);
  ul.appendChild(li);
  // chat.scrollTo(0, ul.scrollHeight);
};

// queryからmapnameを取得
function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// チャットボタン押した時にsocketでチャットを送信
document.getElementById("sendButton").addEventListener("click", () => {
  let inputMessage = document.getElementById("inputText").value;
  if (inputMessage === "") {
    return;
  }
  socket.emit("sendMessage", {
    message: inputMessage,
    mapName: mapName,
    playerName: playerName,
  });
  document.getElementById("inputText").value = "";
});

const sendMessageByEnterKey = (code) => {
  console.log(code);
  //エンターキー押下なら
  if (13 === code) {
    let inputMessage = document.getElementById("inputText").value;
    if (inputMessage === "") {
      return;
    }
    socket.emit("sendMessage", {
      message: inputMessage,
      mapName: mapName,
      playerName: playerName,
    });
    document.getElementById("inputText").value = "";
  }
};
// ウェブソケット受信するたびにwebSocketPlayerListの他プレイヤー情報更新
socket.on("receivePlayerInfo", (PlayerInfoList) => {
  webSocketPlayerList = PlayerInfoList;
});

// disconnectしたプレイヤーをdeletedPlayerIdから判断して削除
socket.on("disconnectPlayer", (deletedPlayerId) => {
  console.log(deletedPlayerId);
  delete webSocketPlayerList[deletedPlayerId];
});

// playerIdをsocketIdに置き換える処理
socket.on("receiveSocketId", (socketId) => {
  // document.getElementById("idName").innerText = socketId;
  phaserPlayerList[socketId] = phaserPlayerList[playerId];
  webSocketPlayerList[socketId] = webSocketPlayerList[playerId];
  delete webSocketPlayerList[playerId];
  delete phaserPlayerList[playerId];
  playerId = socketId;
});

socket.on("receiveMessage", (message) => {
  // 受信したメッセージをulタグに挿入
  addMessageList(message);
});
