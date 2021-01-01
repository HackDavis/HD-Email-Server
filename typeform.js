const { createClient } = require('@typeform/api-client')
const refresh_interval = 1000 * 60; // Check for new responses every minute
const typeformAPI = createClient({ token: process.env.TYPEFORM_TOKEN });

// Cached users
let emails = {};
let mentored_emails = {}
let checked_in_emails = {}
let doe_workshop_emails = {}

function updateUserDoc(db, uid) {
    db.collection("users").doc(uid).update({
        app_status: "Pending Review"
    })
    .then(function(doc) {
        // console.log("Automatic user status update complete");
    })
    .catch(function(error) {
        console.log("Error: ", error)
    })
}

function UserCreated(user)
{

}

function StartTypeformCheck(db, firebase)
{
    // console.log("Starting typeform checks...");
    CheckTypeformResponses(db, firebase);

    setInterval(() => {
        CheckTypeformResponses(db, firebase);
    }, refresh_interval);
}

function CheckTypeformResponses(db, firebase)
{
    /*  First, query all users in DB. (in StartTypeformCheck)
        If the user's application status is not "Not Applied Yet",
        then add them to the users table (above).

        Next, query all responses from the typeform.

        If the user exists in the users object (above),
        then don't do anything because their status is already updated.

        If the user does not exist in the table above, then
        add them and also update their application status in the database.

     */

    typeformAPI
    .responses
    .list({uid: process.env.TYPEFORM_FORM_ID, pageSize: 1000, until: "2020-12-28T12:00:00"})
    .then(response => {
        response.items.forEach((form_response) => 
        {
            emails[RemovePeriodsInEmail(form_response.answers[2].email.toLowerCase())] = true;
        })
    })
    .then(() => 
    {
        // Because there are over 1000 responses, get the next few responses
        // See https://developer.typeform.com/responses/reference/retrieve-responses/ for details
        typeformAPI
        .responses
        .list({uid: process.env.TYPEFORM_FORM_ID, pageSize: 1000, since: "2020-12-28T12:00:00"})
        .then(response => {
            response.items.forEach((form_response) => 
            {
                emails[RemovePeriodsInEmail(form_response.answers[2].email.toLowerCase())] = true;
            })
        })
        .then(() => 
        {
        })
        .catch((reason) => 
        {
            console.log(reason);
        })
    })
    .catch((reason) => 
    {
        console.log(reason);
    })

    // Also query the mentored responses typeform
    typeformAPI
    .responses
    .list({uid: process.env.TYPEFORM_MENTORED_ID, pageSize: 1000})
    .then(response => {
        response.items.forEach((form_response) => 
        {
            mentored_emails[RemovePeriodsInEmail(form_response.answers[4].email.toLowerCase())] = true;
        })
    })
    .then(() => 
    {
    })
    .catch((reason) => 
    {
        console.log(reason);
    })
    
    // Also query the checked-in responses typeform
    typeformAPI
    .responses
    .list({uid: process.env.TYPEFORM_CHECKIN_ID, pageSize: 1000})
    .then(response => {
        response.items.forEach((form_response) => 
        {
            checked_in_emails[form_response.answers[2].email.toLowerCase()] = true;
        })
    })
    .then(() => 
    {
    })
    .catch((reason) => 
    {
        console.log(reason);
    })
    
    // Also query the workshop attendance responses typeform
    typeformAPI
    .responses
    .list({uid: process.env.TYPEFORM_WORKSHOP_ID, pageSize: 1000})
    .then(response => {
        response.items.forEach((form_response) => 
        {
            doe_workshop_emails[RemovePeriodsInEmail(form_response.answers[0].email.toLowerCase())] = true;
        })
    })
    .then(() => 
    {
    })
    .catch((reason) => 
    {
        console.log(reason);
    })
}

function RemovePeriodsInEmail(email)
{
    const split = email.toLowerCase().split("@");
    return `${split[0].replace(".", "")}@${split[1]}`
}

function GetAppliedEmails()
{
    return emails;
}

// Gets a list of emails of people who filled out the mentored typeform for the badge
function GetMentoredEmails()
{
    return mentored_emails;
}

function GetCheckedInEmails()
{
    return checked_in_emails;
}

function GetDoEWorkshopEmails()
{
    return doe_workshop_emails;
}

module.exports = {StartTypeformCheck, GetAppliedEmails, GetMentoredEmails, GetCheckedInEmails, GetDoEWorkshopEmails}