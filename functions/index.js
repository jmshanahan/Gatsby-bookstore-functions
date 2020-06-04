const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createPublicProfile = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    username: "string",
  });

  const userProfile = await admin
    .firestore()
    .collection("publicProfiles")
    .where("userId", "==", context.auth.uid)
    .limit(1)
    .get();

  if (!userProfile.empty) {
    throw new functions.https.HttpsError(
      "already-exists",
      "This user already has a public profile."
    );
  }

  const publicProfile = await admin
    .firestore()
    .collection("publicProfiles")
    .doc(data.username)
    .get();
  if (publicProfile.exists) {
    throw new functions.https.HttpsError(
      "already-exists",
      "This username already belongs to an existing user."
    );
  }

  const user = await admin.auth().getUser(context.auth.uid);
  if (user.email === functions.config().accounts.admin) {
    console.log(user.email, functions.config().accounts.admin);
    await admin
      .auth()
      .setCustomUserClaims(context.auth.uid, { admin: true, doner: true });
  }
  console.log(data.username);
  return admin
    .firestore()
    .collection("publicProfiles")
    .doc(data.username)
    .set({
      userId: context.auth.uid,
    });
});

exports.postComment = functions.https.onCall((data, context) => {
  checkAuthentication(context);
  dataValidator(data, { bookId: "string", text: "string" });
  const db = admin.firestore();

  return db
    .collection("publicProfiles")
    .where("userId", "==", context.auth.uid)
    .limit(1)
    .get()
    .then((snapshot) => {
      return db.collection("comments").add({
        text: data.text,
        username: snapshot.docs[0].id,
        dateCreated: new Date(),
        book: db.collection("books").doc(data.bookId),
      });
    });
});

function dataValidator(data, validKeys) {
  if (Object.keys(data).length !== Object.keys(validKeys).length) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Data object contains invalid number of properties"
    );
  } else {
    for (let key in data) {
      if (!validKeys[key] || typeof data[key] !== validKeys[key]) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Data object contains invalid properties"
        );
      }
    }
  }
}

function checkAuthentication(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to use this feature"
    );
  }
}
