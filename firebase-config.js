// Vul hier je eigen Firebase-gegevens in.
// Zie README.md stap 1-3 voor hoe je deze gegevens krijgt (gratis, ~5 min).
// Nadat je dit hebt ingevuld, werkt bestellen.html en keuken.html op elk apparaat.

const firebaseConfig = {
  apiKey: "AIzaSyBVwx6eUdSkebGIK2J_NDwOD3rxTcIg1v4",
  authDomain: "restaurant-het-goedkoop.firebaseapp.com",
  databaseURL: "https://restaurant-het-goedkoop-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "restaurant-het-goedkoop",
  storageBucket: "restaurant-het-goedkoop.firebasestorage.app",
  messagingSenderId: "262921210117",
  appId: "1:262921210117:web:4158692d91fd580cda4f6c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
