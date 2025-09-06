import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyBwEhu3VaKBIMZ5hzkMOwkFhPWJAZyWEF8",
  authDomain: "community-food-bank-1a252.firebaseapp.com",
  projectId: "community-food-bank-1a252",
  storageBucket: "community-food-bank-1a252.firebasestorage.app",
  messagingSenderId: "824500465447",
  appId: "1:824500465447:web:aeda00e3430aca15764302",
  measurementId: "G-9ZFM6ELNWR"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

let messaging = null
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      messaging = getMessaging(app)
    }
  })
}
export { messaging }

export default app