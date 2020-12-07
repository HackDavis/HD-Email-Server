const {EmailType, FormatEmail} = require('./messageTemplates');
const firebase = require("firebase-admin");
const serviceAccount = require("./servicer.json");
require("dotenv").config({ path: "./.env" });

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL
});

var db = firebase.firestore();
docRef = db.collection("groups")
let groups = {}
var groupsHasLoaded = false;
docRef.onSnapshot(function (querySnapshot) {
    console.log("Enter docRef.onSnapshot");
    querySnapshot.forEach(function (doc) {
        if (!groupsHasLoaded) {
            if (dataIsValid(doc.data())) {
                groups[doc.id] = doc.data();
                console.log(`Document ${doc.id} has been added!`);
            }
        } 
        else {
            if (groups[doc.id] == undefined && dataIsValid(doc.data())) {
                console.log("creating the cache for team")
                groups[doc.id] = doc.data();
            }
            else if (dataIsValid(doc.data()) && groups[doc.id] != undefined) {
                console.log("team exists in the cache")
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
    console.log("groupsHasLoaded is true at end");
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

    console.log(data);
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
    console.log("email data:");
    console.log(email_data);

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
    console.log("Listener has been unsubscribed");
});