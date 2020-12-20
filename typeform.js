const { createClient } = require('@typeform/api-client')
const refresh_interval = 1000 * 60; // Check for new responses every minute
const typeformAPI = createClient({ token: process.env.TYPEFORM_TOKEN });

// Cached users
let emails = {};

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

    // If there are more than 1000 responses, this will need to be modified to do two GET requests
    // to get all the users. See https://developer.typeform.com/responses/reference/retrieve-responses/ for details
    typeformAPI
    .responses
    .list({uid: process.env.TYPEFORM_FORM_ID, pageSize: 1000})
    .then(response => {
        response.items.forEach((form_response) => 
        {
            emails[form_response.answers[2].email.toLowerCase()] = true;
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

function GetAppliedEmails()
{
    return emails;
}

module.exports = {StartTypeformCheck, GetAppliedEmails}