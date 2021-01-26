// Update applicant status to DENIED
require("dotenv").config({ path: "./.env" });
const firebase = require("firebase-admin");r
const serviceAccount = require("./servicer.json");
const fs = require('fs');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

var db = firebase.firestore();

function RemovePeriodsInEmail(email)
{
    const split = email.toLowerCase().split("@");
    return `${split[0].replace(".", "")}@${split[1]}`
}

var email_list = [];
try {
    var all_emails = fs.readFileSync('denied_emails.txt', 'utf8');
    console.log("all_emails: \n", all_emails);
    all_emails = all_emails.replace(/\s+/g, ' ').trim();
    email_list = all_emails.split(' ');
    for (let i = 0; i < email_list.length; i++)
    {
        email_list[i] = RemovePeriodsInEmail(email_list[i]);
        console.log(email_list[i])
    }
    console.log("email_list: \n", email_list);
} catch(e) {
    console.log('Error:', e.stack);
}

db.collection("users").get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
        if (doc.data().app_status != "Application Denied" && email_list.includes(RemovePeriodsInEmail(doc.data().email))) {
            db.collection("users").doc(doc.id).update({
                app_status: "Application Denied",
            })
            console.log("The following email was updated: ", doc.data().email, "with ID: ", doc.id);
        }
    });
});
