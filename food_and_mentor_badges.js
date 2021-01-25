require("dotenv").config({ path: "./.env" });
const fs = require('fs');
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");

// establish firebase connection
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});
var db = firebase.firestore();

try {
    var all_emails = fs.readFileSync('mentor_feedback_emails.txt', 'utf8');
    all_emails = all_emails.replace(/\s+/g, ' ').trim();
    emails = all_emails.split(' ');
    for (let i = 0; i < emails.length; i++)
    {
        // emails[i] = RemovePeriodsInEmail(emails[i]);
    }
} catch(e) {
    console.log('Error:', e.stack);
}

// This block gives every user a "Yummy" badge on the website if they were a valid email 
// in Firebase that had previously received a code 
db.collection("used_codes").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
        db.collection("users").where("email", "==", doc.id)
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                let updatedBadges = JSON.parse(JSON.stringify(doc.data().badges));
                updatedBadges["Yummy"] = new Date(Date.now()).toDateString();
                db.collection("users").doc(doc.id).set({ 
                    badges: updatedBadges
                }, { merge: true })
                .then(function() {
                    console.log(updatedBadges);
                })
            })
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        })
    });
});

// This block parses from a .txt file called mentor_feedback_emails.txt and gives every email 
// on its own line in that file the "Mentored" code for filling out a mentored feedback form from HD 2021 
for (let i = 0; i < emails.length; i++) {
    db.collection("users").where("email", "==", emails[i])
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                let updatedBadges = JSON.parse(JSON.stringify(doc.data().badges));
                updatedBadges["Mentored"] = new Date(Date.now()).toDateString();
                db.collection("users").doc(doc.id).set({ 
                    badges: updatedBadges
                }, { merge: true })
                .then(function() {
                    console.log(updatedBadges);
                })
            })
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        })
}