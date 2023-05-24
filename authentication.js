import { app, db, auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.20.0/firebase-firestore.js";
console.log(checkedValues);
// サインアップフォームのイベントリスナー
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const favoriteGame = document.getElementById("favorite-game").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    console.log("サインアップ成功:", user);

    // Firestoreにユーザー情報を保存
    await setDoc(doc(db, "users", user.uid), {
      favoriteGame: favoriteGame,
      platform: checkedValues,
    });
    console.log("Firestoreにユーザー情報を保存しました");
    event.preventDefault(); // ボタンの既定の動作をキャンセルする
    const form = document.getElementById("signup-form");
    form.reset(); // フォームの内容をリセットする
    const dialog = document.getElementById("dialog-dark-rounded-signUp");
    dialog.close(); // ダイアログを閉じる
  } catch (error) {
    console.error("サインアップ失敗:", error);
  }
});

// ログインフォームのイベントリスナー
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    event.preventDefault(); // ボタンの既定の動作をキャンセルする
    const form = document.getElementById("login-form");
    form.reset(); // フォームの内容をリセットする
    const dialog = document.getElementById("dialog-dark-rounded-login");
    dialog.close(); // ダイアログを閉じる
    alert("ログインに成功しました！");
    console.log("ログイン成功:", user);
  } catch (error) {
    alert("ログインに失敗しました・・・");
  }
});

// ログアウトボタンのイベントリスナー
const logoutButton = document.getElementById("logout-button");
const loginButton = document.getElementById("loginButton");
logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    console.log("ログアウト成功");
  } catch (error) {
    console.error("ログアウト失敗:", error);
  }
});

// ログイン状態の変更を監視;
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("ログイン済み:", user);
    logoutButton.style.display = "block";
    loginButton.style.display = "none";
  } else {
    console.log("ログアウト中");
    logoutButton.style.display = "none";
    loginButton.style.display = "block";
  }
});
