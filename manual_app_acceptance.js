require("dotenv").config({ path: "./.env" });
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

var db = firebase.firestore();
var email_list = [];

const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.prompt();

readline.on('line', function (email) {
    email_list.push(email);
})

readline.on('close', function (response) {
    db.collection("users").get().then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
            if (doc.data().app_status != "Application Accepted" && email_list.includes(doc.data().email)) {
                db.collection("users").doc(doc.id).update({
                    app_status: "Application Accepted",
                    RSVP: "Pending"
                })
                console.log("The following email was updated: ", doc.data().email, "with ID: ", doc.id);
            }
        });
    });
})
