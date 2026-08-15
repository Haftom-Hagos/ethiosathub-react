import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOEFgtLT5pCleMxGQijFmuXzBBKJ0BbAc",
  authDomain: "hwasat-gee.firebaseapp.com",
  projectId: "hwasat-gee",
  storageBucket: "hwasat-gee.firebasestorage.app",
  messagingSenderId: "247965525448",
  appId: "1:247965525448:web:558fd60462d9b0fe614cfd",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);




