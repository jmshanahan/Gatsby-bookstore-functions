const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.postComment = functions.https.onCall((data, context) => {
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
