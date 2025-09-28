import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously, signOut } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import admin from "firebase-admin";

// Configure Admin SDK to connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";

// Initialize Admin SDK (no credentials needed for emulator)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "shoreline-tzs9g-47d06" });
}
const adminDb = admin.firestore();

// Utility to log test results
const results = [];
const record = (name, passed, error) => {
  results.push({ name, passed, error: error ? String(error.message || error) : undefined });
  const mark = passed ? "✔" : "✖";
  console.log(`${mark} ${name}${error ? " - " + String(error.message || error) : ""}`);
};

async function seedData(volUid, adminUid) {
  // Seed users and one event + certificate using Admin SDK (bypasses rules)
  await adminDb.doc(`users/${volUid}`).set({ isVerifiedVolunteer: true, role: "volunteer" });
  await adminDb.doc(`users/${adminUid}`).set({ role: "admin", isAdmin: true });
  await adminDb.doc(`events/event1`).set({ title: "Beach Cleanup", createdAt: admin.firestore.Timestamp.now() });
  await adminDb.doc(`certificates/cert1`).set({ userId: volUid, eventId: "event1", issuedAt: admin.firestore.Timestamp.now() });
}

async function run() {
  // Minimal app config for SDK; values don't matter when using emulators
  const app = initializeApp({
    apiKey: "fake-api-key",
    authDomain: "fake-auth-domain",
    projectId: "shoreline-tzs9g-47d06",
  });

  const auth = getAuth(app);
  const db = getFirestore(app);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);

  const volunteer = await signInAnonymously(auth);
  const volUid = volunteer.user.uid;
  const adminUser = await signInAnonymously(auth);
  const adminUid = adminUser.user.uid;

  // Seed necessary docs
  await seedData(volUid, adminUid);

  // Re-auth as volunteer for volunteer tests
  await signOut(auth);
  await signInAnonymously(auth);
  const volUid2 = auth.currentUser.uid; // new anonymous uid; seed again for this uid
  if (volUid2 !== volUid) {
    await adminDb.doc(`users/${volUid2}`).set({ isVerifiedVolunteer: true, role: "volunteer" });
  }

  // Test: volunteer cannot create events
  try {
    await setDoc(doc(db, "events", "event2"), { title: "Should Fail" });
    record("Volunteer cannot create events (should fail)", false);
  } catch (e) {
    record("Volunteer cannot create events (should fail)", true);
  }

  // Test: volunteer can register for event1
  try {
    const regRef = doc(db, `events/event1/registrations/${auth.currentUser.uid}`);
    await setDoc(regRef, { registeredAt: new Date().toISOString() });
    record("Volunteer can create registration for self", true);
  } catch (e) {
    record("Volunteer can create registration for self", false, e);
  }

  // Test: volunteer can create own waste log referencing existing event
  try {
    const wlRef = collection(db, "wasteLogs");
    await addDoc(wlRef, { userId: auth.currentUser.uid, eventId: "event1", createdAt: new Date().toISOString() });
    record("Volunteer can create own waste log", true);
  } catch (e) {
    record("Volunteer can create own waste log", false, e);
  }

  // Test: unauthenticated cannot create waste log
  try {
    await signOut(auth);
    const wlRef2 = collection(db, "wasteLogs");
    await addDoc(wlRef2, { userId: "someone", eventId: "event1" });
    record("Unauthenticated cannot create waste log (should fail)", false);
  } catch (e) {
    record("Unauthenticated cannot create waste log (should fail)", true);
  }

  // Re-auth as volunteer to read certificate
  await signInAnonymously(auth);
  const currentVolUid = auth.currentUser.uid;
  // Ensure the certificate doc matches this uid
  await adminDb.doc(`users/${currentVolUid}`).set({ isVerifiedVolunteer: true, role: "volunteer" });
  await adminDb.doc(`certificates/cert2`).set({ userId: currentVolUid, eventId: "event1", issuedAt: admin.firestore.Timestamp.now() });

  // Test: volunteer can get own certificate
  try {
    const certSnap = await getDoc(doc(db, "certificates", "cert2"));
    if (certSnap.exists()) {
      record("Volunteer can read own certificate (get)", true);
    } else {
      record("Volunteer can read own certificate (get)", false, new Error("Certificate missing"));
    }
  } catch (e) {
    record("Volunteer can read own certificate (get)", false, e);
  }

  // Test: volunteer can list certificates
  try {
    const snap = await (await import("firebase/firestore")).getDocs(collection(db, "certificates"));
    // Listing should succeed; number of docs doesn't matter
    record("Volunteer can list certificates", true);
  } catch (e) {
    record("Volunteer can list certificates", false, e);
  }

  // Re-auth as admin and try creating an event (should succeed)
  await signOut(auth);
  await signInAnonymously(auth);
  const adminUid2 = auth.currentUser.uid;
  await adminDb.doc(`users/${adminUid2}`).set({ role: "admin", isAdmin: true });
  try {
    await setDoc(doc(db, "events", "admin-event"), { title: "Admin Created" });
    record("Admin can create event", true);
  } catch (e) {
    record("Admin can create event", false, e);
  }

  // Summarize
  const failed = results.filter(r => !r.passed);
  console.log("\nTest Summary:");
  for (const r of results) {
    console.log(`- ${r.passed ? "PASS" : "FAIL"}: ${r.name}${r.error ? " — " + r.error : ""}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll tests passed.");
    process.exit(0);
  }
}

run().catch((e) => {
  console.error("Fatal error running emulator tests:", e);
  process.exit(1);
});