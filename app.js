const {EmailType, FormatEmail} = require('./messageTemplates');
require("dotenv").config({ path: "./.env" });
const {StartTypeformCheck, GetAppliedEmails} = require('./typeform');
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

var db = firebase.firestore();

StartTypeformCheck(db, firebase);

docRef = db.collection("groups")
let groups = {}
var groupsHasLoaded = false;
docRef.onSnapshot(function (querySnapshot) {
    querySnapshot.forEach(function (doc) {
        if (!groupsHasLoaded) {
            if (dataIsValid(doc.data())) {
                groups[doc.id] = doc.data();
            }
        } 
        else {
            if (groups[doc.id] == undefined && dataIsValid(doc.data())) {
                groups[doc.id] = doc.data();
            }
            else if (dataIsValid(doc.data()) && groups[doc.id] != undefined) {
                if (Object.keys(groups[doc.id].pending_members).length < Object.keys(doc.data().pending_members).length) { // new member request was added 
                    NewMemberRequest(groups[doc.id].pending_members || [], doc.data().pending_members || [], doc.data());
                } else if (Object.keys(groups[doc.id].pending_members).length > Object.keys(doc.data().pending_members).length) { // member request was accepted or denied
                    if (Object.keys(groups[doc.id].members).length < Object.keys(doc.data().members).length) { // member request was accepted 
                        MemberAccepted(groups[doc.id].members || [], doc.data().members || [], doc.data());
                    } else if (Object.keys(groups[doc.id].members).length == Object.keys(doc.data().members).length) { // member request was denied 
                        MemberDenied(groups[doc.id].pending_members || [], doc.data().pending_members || [], doc.data());
                    }
                }
                groups[doc.id] = doc.data();
            }
        }
    });
    groupsHasLoaded = true;
});

var usersHasLoaded = false;
var docRef = db.collection("users");

docRef.onSnapshot(function (snapshot) {
    snapshot.docChanges().forEach(function(change) {
        if (usersHasLoaded && (change.type == "added" || change.type == "modified")) { // a new user was created or its document was updated 
            let user_email = change.doc.data().email
            if (change.doc.data().wants_refresh && GetAppliedEmails()[user_email]) { 
                let updatedBadges = JSON.parse(JSON.stringify(change.doc.data().badges));
                updatedBadges["Applied"] = new Date(Date.now()).toDateString();
                db.collection("users").doc(change.doc.data().user_id).set({
                    app_status: "Pending Review",
                    badges: updatedBadges,
                    wants_refresh: false
                }, { merge: true })
                .then(function () {
                    // console.log("Document successfully written!")
                })
                .catch(function (error) {
                    console.error("Error writing document: ", error)
                })
            }
            else if (change.doc.data().group_id == "" && change.doc.data().badges[6] == undefined) {
                let updatedBadges = JSON.parse(JSON.stringify(change.doc.data().badges));
                updatedBadges["Teaming"] = new Date(Date.now()).toDateString();
                db.collection("users").doc(change.doc.data().user_id).set({
                    badges: updatedBadges,
                }, { merge: true })
                .then(function () {
                    // console.log("Document successfully written!")
                })
                .catch(function (error) {
                    console.error("Error writing document: ", error)
                })
            }
            else {
                db.collection("users").doc(change.doc.data().user_id).set({
                    wants_refresh: false
                }, { merge: true })
                .then(function () {
                    // console.log("Document successfully written!")
                })
                .catch(function (error) {
                    console.error("Error writing document: ", error)
                })
            }
        } else if (usersHasLoaded && change.type == "deleted") { // the old user document was just deleted 
            // console.log("User was deleted");
        }
    });
    // console.log("initial user load is now done");
    usersHasLoaded = true;
});

function NewMemberRequest(old_pending, new_pending, doc_data)
{
    let new_member;
    Object.keys(new_pending).forEach(function(key) {
        if (old_pending[key] == undefined)
        {
            new_member = new_pending[key];
        }
    })

    let emailList = []
    Object.keys(doc_data.members).forEach(function(key) {
        emailList.push(doc_data.members[key][1]);
    })

    const data = 
    {
        emailType: EmailType.MemberRequested,
        member_name: new_member[0],
        member_email: new_member[1],
        member_message: new_member[2],
        team_member_emails: emailList,
        team_name: doc_data.name
    }

    sendEmail(data);
}

function MemberAccepted(old_members, new_members, doc_data) {
    let new_member;
    Object.keys(new_members).forEach(function(key) {
        if (old_members[key] == undefined) 
        {
            new_member = new_members[key];
        }
    })

    const data = 
    {
        emailType: EmailType.MemberApproved,
        member_name: new_member[0],
        member_email: new_member[1],
        team_name: doc_data.name,
    }

    // console.log(data);
    sendEmail(data);
}

function MemberDenied(old_pending, new_pending, doc_data) {
    let denied_member;
    Object.keys(old_pending).forEach(function(key) {
        if (new_pending[key] == undefined)
        {
            denied_member = old_pending[key];
        }
    })

    const data = 
    {
        emailType: EmailType.MemberDenied,
        member_name: denied_member[0],
        member_email: denied_member[1],
        team_name: doc_data.name,
    }

    sendEmail(data);
}

function dataIsValid(data) {
    try {
        return (data.description.length > 0) &&
            (data.email.length > 0) &&
            (Object.keys(data.members).length > 0) &&
            (data.max_members.length > 0) &&
            (data.name.length > 0) &&
            (data.tags.length > 0);
    } catch (err) {
        return false;
    }
}

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_EMAIL,
        pass: process.env.MAIL_PASSWORD,
    }
});

/**
 * See FormatEmail for parameters. Input data is the same.
 */
function sendEmail(data)
{
    const email_data = FormatEmail(data);
    // console.log("email data:");
    // console.log(email_data);

    const mailOptions = {
        from: `"HackDavis Team Finder" <team@hackdavis.io>`,
        to: email_data.to,
        subject: email_data.subject,
        html: email_data.html,
        replyTo: `team@hackdavis.io`
    }

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    }); 

}

process.on('exit', function() {
    unsubscribe();
    // console.log("Listener has been unsubscribed");
});