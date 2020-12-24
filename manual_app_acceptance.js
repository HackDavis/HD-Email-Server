require("dotenv").config({ path: "./.env" });
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");
const fs = require('fs');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

var db = firebase.firestore();

var email_list = [];
try {
    var all_emails = fs.readFileSync('accepted_emails.txt', 'utf8');
    console.log("all_emails: \n", all_emails);
    all_emails = all_emails.replace(/\s+/g, ' ').trim();
    email_list = all_emails.split(' ');
    console.log("email_list: \n", email_list);
} catch(e) {
    console.log('Error:', e.stack);
}

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
