const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById("js-local-stream");
  const joinTrigger = document.getElementById("js-join-trigger");
  const leaveTrigger = document.getElementById("js-leave-trigger");
  const remoteVideos = document.getElementById("js-remote-streams");
  const roomId = document.getElementById("js-room-id");
  const messages = document.getElementById("js-messages");
  const mikeOn = document.getElementById("mikeOn");
  const mikeOff = document.getElementById("mikeOff");
  const offVideo = document.getElementById("offVideo");
  const onVideo = document.getElementById("onVideo");
  const shareScreen = document.getElementById("shareScreen");

  const getRoomModeByHash = () => (location.hash === "#sfu" ? "sfu" : "mesh");
  let screenStream;
  let localStream = await navigator.mediaDevices
    .getUserMedia({
      video: true,
    })
    .catch(console.error);
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);
  localStream.getVideoTracks()[0].enabled = false;
  // localStream.getAudioTracks()[0].enabled = false;

  let audioStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
    })
    .catch(console.error);
  audioStream.getAudioTracks()[0].enabled = false;

  // const localStream = await navigator.mediaDevices.getUserMedia({ video: true });
  // const [displayVideoTrack] = localStream.getVideoTracks();
  // const [userAudioTrack] = localStream.getAudioTracks();
  // const newStream = new MediaStream([displayVideoTrack, userAudioTrack]);
  // skyway.replaceStream(newStream);

  const peer = (window.peer = new Peer({
    key: "89562d5b-065c-4dcb-834c-7a8ddf52333a",
    debug: 3,
  }));

  const audioPeer = (window.peer = new Peer({
    key: "89562d5b-065c-4dcb-834c-7a8ddf52333a",
    debug: 3,
  }));

  joinTrigger.addEventListener("click", async () => {
    if (config.canUseEmote == "yes") {
      localVideo.setAttribute(
        "class",
        "nes-container is-rounded is-dark rounded-lg"
      );
    }
    joinTrigger.setAttribute("class", "hidden");
    leaveTrigger.setAttribute("class", "nes-btn is-warning");
    if (!peer.open) {
      return;
    }
    const mapName = getParam("map");
    let room = peer.joinRoom(mapName, {
      mode: getRoomModeByHash(),
      stream: localStream,
    });
    let audioRoom = audioPeer.joinRoom(mapName, {
      mode: getRoomModeByHash(),
      stream: audioStream,
    });

    room.once("open", () => {
      // const ul = document.getElementById("messageList");
      // const li = document.createElement("li");
      // const text = document.createTextNode("ビデオ通話に参加しました");
      // li.appendChild(text);
      // ul.appendChild(li);
    });
    room.on("peerJoin", (peerId) => {
      // const ul = document.getElementById("messageList");
      // const li = document.createElement("li");
      // const text = document.createTextNode(` ${peerId}さんが参加しました\n`);
      // li.appendChild(text);
      // ul.appendChild(li);
    });

    room.on("stream", async (stream) => {
      const newVideo = document.createElement("video");
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute("data-peer-id", stream.peerId);
      newVideo.setAttribute("style", "transform: scale(-1, 1) rotate(-1, 1)");
      newVideo.setAttribute("state", "small");
      newVideo.setAttribute(
        "class",
        "nes-container is-rounded is-dark rounded-lg"
      );
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
      newVideo.addEventListener("click", (e) => {
        if (e.target.getAttribute("state") === "small") {
          // console.log("small");
          e.target.setAttribute(
            "style",
            "transform: scale(-0.6, 0.6) rotate(-1, 1);"
          );
          e.target.setAttribute("state", "big");
          e.target.setAttribute("class", "fixed top-0 left-0 z-10");
        } else {
          // console.log("big");
          e.target.setAttribute("state", "small");
          e.target.setAttribute(
            "style",
            "transform: scale(-1, 1) rotate(-1, 1)"
          );
          e.target.setAttribute(
            "class",
            "nes-container is-rounded is-dark rounded-lg"
          );
        }
        // console.log(e);
      });
      if (config.canUseEmote == "no") {
        newVideo.setAttribute("class", "hidden");
      }
    });

    room.on("data", ({ data, src }) => {
      messages.textContent += `${src}: ${data}\n`;
    });

    room.on("peerLeave", (peerId) => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();
      // const ul = document.getElementById("messageList");
      // const li = document.createElement("li");
      // const text = document.createTextNode(`${peerId}さんが離席しました\n`);
      // li.appendChild(text);
      // ul.appendChild(li);
    });

    room.once("close", () => {
      // const ul = document.getElementById("messageList");
      // const li = document.createElement("li");
      // const text = document.createTextNode("ビデオ通話から離席しました");
      // li.appendChild(text);
      // ul.appendChild(li);
      Array.from(remoteVideos.children).forEach((remoteVideo) => {
        remoteVideo.srcObject.getTracks().forEach((track) => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    leaveTrigger.addEventListener(
      "click",
      () => {
        leaveTrigger.setAttribute("class", "hidden");
        joinTrigger.setAttribute("class", "nes-btn is-success");
        room.close();
        audioRoom.close();
      },
      { once: true }
    );

    // ボタン処理関連
    onVideo.addEventListener("click", async () => {
      screenStream
        ? screenStream.getTracks().forEach((track) => track.stop())
        : null;
      localStream = await navigator.mediaDevices
        .getUserMedia({
          // audio: true,
          video: true,
        })
        .catch(console.error);

      localVideo.muted = true;
      localVideo.srcObject = localStream;
      localVideo.playsInline = true;
      await localVideo.play().catch(console.error);
      if (localStream) {
        room.replaceStream(localStream);
        localStream.getVideoTracks()[0].enabled = true;
        onVideo.setAttribute("class", "hidden");
        offVideo.setAttribute("class", "nes-btn w-1/4");
      }
    });
    offVideo.addEventListener("click", async () => {
      screenStream
        ? screenStream.getTracks().forEach((track) => track.stop())
        : null;
      localStream = await navigator.mediaDevices
        .getUserMedia({
          // audio: true,
          video: true,
        })
        .catch(console.error);

      localVideo.muted = true;
      localVideo.srcObject = localStream;
      localVideo.playsInline = true;
      await localVideo.play().catch(console.error);
      if (localStream) {
        room.replaceStream(localStream);
        localStream.getVideoTracks()[0].enabled = false;
        offVideo.setAttribute("class", "hidden");
        onVideo.setAttribute("class", "nes-btn w-1/4");
      }
    });
    // // マイクon・off
    mikeOff.addEventListener("click", async () => {
      if (audioStream) {
        // console.log("off");
        // room.replaceStream(localStream);
        mikeOff.setAttribute("class", "hidden");
        mikeOn.setAttribute("class", "nes-btn w-1/4");
        audioStream.getAudioTracks()[0].enabled = false;
      }
    });
    mikeOn.addEventListener("click", async () => {
      if (audioStream) {
        // console.log("on");

        // room.replaceStream(audioStream);
        mikeOn.setAttribute("class", "hidden");
        mikeOff.setAttribute("class", "nes-btn w-1/4");
        audioStream.getAudioTracks()[0].enabled = true;
      }
    });
    shareScreen.addEventListener("click", async () => {
      // console.log("aa");
      screenStream = await navigator.mediaDevices
        .getDisplayMedia({
          // audio: true,
          video: true,
        })
        .catch(console.error);
      localVideo.muted = true;
      localVideo.srcObject = screenStream;
      localVideo.playsInline = true;
      await localVideo.play().catch(console.error);
      const mapName = getParam("map");
      room.replaceStream(screenStream);
    });
  });

  peer.on("error", console.error);
})();

function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// config設定でアイコンのオンオフ
// const chat = document.getElementById("chat");
// if (!config.canUseTextChat === "on") {
//   chat.setAttribute("class", "hidden");
// }
