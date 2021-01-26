/* 
    Sends out emails for all team finder functions (request to join a team and request denial/acceptance)
    Updates user badges and application statuses based on certain typeform email lists and finalized text lists of all emails 
*/ 

const {EmailType, FormatEmail} = require('./messageTemplates');
require("dotenv").config({ path: "./.env" });
const fs = require('fs');
const {StartTypeformCheck, GetAppliedEmails, GetMentoredEmails, GetCheckedInEmails, GetDoEWorkshopEmails} = require('./typeform');
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");

// initialize firebase and typeform email checks
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

var db = firebase.firestore();

StartTypeformCheck(db, firebase);

let cached_checkin_emails = {};

// Get a list of checked in emails and update the applicant in the database every minute
setInterval(() => {
    const new_checkin_emails = GetCheckedInEmails();
    // USE OBJECT.KEYS TO ITERATE THROUGH DICTIONARY KEYS
    Object.keys(new_checkin_emails).forEach(email => {
        if (cached_checkin_emails[email] == undefined)
        {
            // They just filled out the typeform 
            // Does not guarantee that they are not checked in
            firebase.auth().getUserByEmail(email)
            .then(userRecord => {
                const uid = userRecord.toJSON().uid;
                
                db.collection("users").doc(uid).set({
                    checkedIn: true
                }, { merge: true })
                .catch(function (error) {
                    console.log(error);
                })
            })
            .catch(function (error) {
                console.log(error);
            })
        }
    });
    
    cached_checkin_emails = new_checkin_emails;
}, 1000 * 60);

// Convert emails into a readable format 
var email_list = [];
try {
    var all_emails = fs.readFileSync('accepted_emails.txt', 'utf8');
    all_emails = all_emails.replace(/\s+/g, ' ').trim();
    email_list = all_emails.split(' ');
    for (let i = 0; i < email_list.length; i++)
    {
        email_list[i] = RemovePeriodsInEmail(email_list[i]);
    }
} catch(e) {
    console.log('Error:', e.stack);
}
// Convert emails into a readable format
var workshop_emails = [];
try {
    var all__workshop_emails = fs.readFileSync('workshop_emails.txt', 'utf8');
    all__workshop_emails = all__workshop_emails.replace(/\s+/g, ' ').trim();
    workshop_emails = all__workshop_emails.split(' ');
    for (let i = 0; i < workshop_emails.length; i++)
    {
        workshop_emails[i] = RemovePeriodsInEmail(workshop_emails[i]);
    }
} catch(e) {
    console.log('Error:', e.stack);
}

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

function RemovePeriodsInEmail(email)
{
    const split = email.toLowerCase().split("@");
    return `${split[0].replace(".", "")}@${split[1]}`
}

// Updates badges if needed
function updateIndependentBadges(user_data, user_email) {
    let updatedBadges = JSON.parse(JSON.stringify(user_data.badges));
    if (user_data.badges["Applied"] == undefined && (user_data.app_status != "Not Yet Applied" || GetAppliedEmails()[user_email]))
    {
        updatedBadges["Applied"] = new Date(Date.now()).toDateString();
    }
    if (user_data.badges["Teaming"] == undefined && user_data.group_id != "")
    {
        updatedBadges["Teaming"] = new Date(Date.now()).toDateString();
    }
    if (user_data.badges["Pre-event"] == undefined && workshop_emails.includes(user_email))
    {
        updatedBadges["Pre-event"] = new Date(Date.now()).toDateString();
    }
    if (user_data.badges["Mentored"] == undefined && GetMentoredEmails()[RemovePeriodsInEmail(user_email.toLowerCase())])
    {
        updatedBadges["Mentored"] = new Date(Date.now()).toDateString();
    }
    if (user_data.badges["Workshop"] == undefined && GetDoEWorkshopEmails()[RemovePeriodsInEmail(user_email.toLowerCase())])
    {
        updatedBadges["Workshop"] = new Date(Date.now()).toDateString();
    }

    return updatedBadges
}

var usersHasLoaded = false;
var docRef = db.collection("users");

docRef.onSnapshot(function (snapshot) {
    snapshot.docChanges().forEach(function(change) {
        if (usersHasLoaded && (change.type == "added" || change.type == "modified")) { // a new user was created or its document was updated 
            let user_email = RemovePeriodsInEmail(change.doc.data().email.toLowerCase());

            if (change.doc.data().wants_refresh && GetAppliedEmails()[user_email] && email_list.includes(user_email) && change.doc.data().app_status != "Application Accepted") {
                let updatedBadges = updateIndependentBadges(change.doc.data(), user_email);
                db.collection("users").doc(change.doc.data().user_id).set({
                    app_status: "Application Accepted",
                    badges: updatedBadges,
                    RSVP: "Pending",
                    wants_refresh: false,
                    checkedIn: false
                }, { merge: true })
                .then(function () {
                    // console.log("The following email was updated: ", doc.data().email, "with ID: ", doc.id);
                })
                .catch(function (error) {
                    console.error("Error writing document: ", error)
                })
            }
            else if (change.doc.data().wants_refresh && GetAppliedEmails()[user_email] && change.doc.data().app_status == "Not Yet Applied") {
                let updatedBadges = updateIndependentBadges(change.doc.data(), user_email); 
                db.collection("users").doc(change.doc.data().user_id).set({
                    app_status: "Pending Review",
                    badges: updatedBadges,
                    wants_refresh: false,
                    checkedIn: false
                }, { merge: true })
                .then(function () {
                    // console.log("Document successfully written!")
                })
                .catch(function (error) {
                    console.error("Error writing document: ", error)
                })
            }
            else {
                let updatedBadges = updateIndependentBadges(change.doc.data(), user_email);
                db.collection("users").doc(change.doc.data().user_id).set({
                    badges: updatedBadges,
                    wants_refresh: false,
                    checkedIn: (change.doc.data().checkedIn == true),
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

// Send email when a new member requests to join the team
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

// Send email when a member is accepted
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

// Send email when a member is denied 
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
// Check if fields are valid 
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

//Establish nodemailer connection
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
});