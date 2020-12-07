const { EmailType, FormatEmail } = require("./messageTemplates");
require("dotenv").config({ path: "./.env" });
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

var db = firebase.firestore();

const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.question("Enter the email to update application status: ", (email) => {
    readline.question(
        "Enter application status: ",
        (status) => {
            UpdateUserApplicationStatus(email, status);
            readline.close();
        }
    );
    
});

const valid_statuses = 
{
    "Not Yet Applied": true,
    "Pending Review": true,
    "Application Accepted": true,
    "Application Denied": true,
    "Waitlisted": true
}

function UpdateUserApplicationStatus(email, status)
{
    if (valid_statuses[status] == undefined)
    {
        console.error("Invalid application status!");
        return;
    }
    
    firebase.auth().getUserByEmail(email)
    .then(userRecord => {
        
        const uid = userRecord.toJSON().uid;
        
        db.collection("users").doc(uid).update({
            app_status: status,
        }).then(function(docRef) {
            console.log(`Successfully updated user status of ${userRecord.toJSON().displayName}!`);
            process.exit(0);
        }).catch((error) => 
        {
            console.error(`Error: ${error}`);
            process.exit(0);
        })
    })
    .catch(error => {
        console.error(`User has not signed in before! ${error}`);
        process.exit(0);
    })
}