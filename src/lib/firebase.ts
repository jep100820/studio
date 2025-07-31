import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "kanbanflow-6cvc6",
  "appId": "1:674602332508:web:d5676390127c3e0b131199",
  "storageBucket": "kanbanflow-6cvc6.firebasestorage.app",
  "apiKey": "AIzaSyCX81iJOmn0Dn9lH5EkYZBdSYNXqlpDU1c",
  "authDomain": "kanbanflow-6cvc6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "674602332508"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
