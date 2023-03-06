const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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
};

const game = new Phaser.Game(config);
const socket = io();
let playerId = Math.random().toString(32).substring(2);
let cursors;
let phaserPlayerList = {};
let webSocketPlayerList = {};
let worldLayer;
let spawnPoint;
let showDebug = false;

function preload() {
  // 自分で作ったやつ
  // this.load.image("tiles", "/assets/testMap.png");
  // this.load.tilemapTiledJSON("map", "/assets/map.json");

  this.load.image("tiles", "/assets/tilesets/tuxmon-sample-32px-extruded.png");
  this.load.tilemapTiledJSON("map", "/assets/tilemaps/tuxemon-town.json");

  // An atlas is a way to pack multiple images together into one texture. I'm using it to load all
  // the player animations (walking left, walking right, etc.) in one image. For more info see:
  //  https://labs.phaser.io/view.html?src=src/animation/texture%20atlas%20animation.js
  // If you don't use an atlas, you can do the same thing with a spritesheet, see:
  //  https://labs.phaser.io/view.html?src=src/animation/single%20sprite%20sheet.js
  this.load.atlas(
    "atlas",
    "/assets/atlas/atlas.png",
    "/assets/atlas/atlas.json"
  );
}

function create() {
  // ページ表示段階でsocketIdを取得
  socket.emit("getSocketId");
  const map = this.make.tilemap({ key: "map" });

  // 自分で作ったやつ
  // const tileset = map.addTilesetImage("tilemap", "tiles");
  const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

  // Parameters: layer name (or index) from Tiled, tileset, x, y

  // 自分で作ったやつ
  // const belowLayer = map.createLayer("ground", tileset, 0, 0);
  // worldLayer = map.createLayer("object", tileset, 0, 0);
  const belowLayer = map.createLayer("Below Player", tileset, 0, 0);
  worldLayer = map.createLayer("World", tileset, 0, 0);
  const aboveLayer = map.createLayer("Above Player", tileset, 0, 0);

  worldLayer.setCollisionByProperty({ collides: true });

  aboveLayer.setDepth(10);

  // By default, everything gets depth sorted on the screen in the order we created things. Here, we
  // want the "Above Player" layer to sit on top of the player, so we explicitly give it a depth.
  // Higher depths will sit on top of lower depth objects.

  // Object layers in Tiled let you embed extra info into a map - like a spawn point or custom
  // collision shapes. In the tmx file, there's an object layer with a point named "Spawn Point"

  // 自分で作ったやつ
  // spawnPoint = map.findObject("player", (obj) => obj.name === "spawnpoint");

  spawnPoint = map.findObject("Objects", (obj) => obj.name === "Spawn Point");

  // Create a sprite with physics enabled via the physics system. The image used for the sprite has
  // a bit of whitespace, so I'm using setSize & setOffset to control the size of the player's body.
  phaserPlayerList[playerId] = createPlayer(
    this.physics.add,
    worldLayer,
    spawnPoint
  );

  // Create the player's walking animations from the texture atlas. These are stored in the global
  // animation manager so any sprite can access them.
  const anims = this.anims;
  anims.create({
    key: "misa-left-walk",
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
    key: "misa-right-walk",
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
    key: "misa-front-walk",
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
    key: "misa-back-walk",
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

  // Help text that has a "fixed" position on the screen

  // Debug graphics
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
}

function update(time, delta) {
  console.log(phaserPlayerList);
  // 他のプレイヤーの生成処理;
  for (const webSocketPlayerId in webSocketPlayerList) {
    if (!phaserPlayerList.hasOwnProperty(webSocketPlayerId)) {
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
  // 他プレイヤーの削除処理
  for (const phaserPlayerId in phaserPlayerList) {
    if (phaserPlayerId == playerId) {
      continue;
    }
    if (!webSocketPlayerList.hasOwnProperty(phaserPlayerId)) {
      phaserPlayerList[phaserPlayerId].disableBody(true, true);
      delete phaserPlayerList[phaserPlayerId];
    }
  }

  const speed = 175;
  console.log(playerId);
  const prevVelocity = phaserPlayerList[playerId].body.velocity.clone();

  // Stop any previous movement from the last frame
  phaserPlayerList[playerId].body.setVelocity(0);

  // Horizontal movement
  // setPlayerDirection(player.body, "neutral");
  setPlayerIsMove(phaserPlayerList[playerId].body, false);

  // 他プレイヤーの情報更新
  for (const webSocketPlayerId in webSocketPlayerList) {
    if (webSocketPlayerId != playerId) {
      phaserPlayerList[webSocketPlayerId].body.x =
        webSocketPlayerList[webSocketPlayerId].x;
      phaserPlayerList[webSocketPlayerId].body.y =
        webSocketPlayerList[webSocketPlayerId].y;
      if (webSocketPlayerList[webSocketPlayerId].isMove) {
        phaserPlayerList[webSocketPlayerId].anims.play(
          `misa-${webSocketPlayerList[webSocketPlayerId].direction}-walk`,
          true
        );
      } else {
        phaserPlayerList[webSocketPlayerId].stop();
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

  // プレイヤーが動いているか否かでアニメーション表示変える
  if (phaserPlayerList[playerId].body.isMove) {
    phaserPlayerList[playerId].anims.play(
      `misa-${phaserPlayerList[playerId].body.direction}-walk`,
      true
    );
  } else {
    phaserPlayerList[playerId].anims.stop();

    // If we were moving, pick and idle frame to use
    if (prevVelocity.x < 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-left");
    else if (prevVelocity.x > 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-right");
    else if (prevVelocity.y < 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-back");
    else if (prevVelocity.y > 0)
      phaserPlayerList[playerId].setTexture("atlas", "misa-front");
  }

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
  document.getElementById("idName").innerText = socketId;
  phaserPlayerList[socketId] = phaserPlayerList[playerId];
  webSocketPlayerList[socketId] = webSocketPlayerList[playerId];
  delete webSocketPlayerList[playerId];
  delete phaserPlayerList[playerId];
  playerId = socketId;
});
