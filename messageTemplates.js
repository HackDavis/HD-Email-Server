const util = require('util');

const EmailType = 
{
    MemberRequested: 1,
    MemberApproved: 2,
    MemberDenied: 3
}

const EmailMessages = {};

EmailMessages[EmailType.MemberRequested] = 
{
    subject: `🔥 %s Requested to Join Your Team 🔥`,
    html: `
        <center>

        <h2>Hey %s,</h2>
        <br>
        <h1>You've got a pending teammate request!</h1>

        <br><br>

        <h2>%s (%s) has requested to join your team.<h2>
        <br>

        <h3>%s right now, trying to join your team:</h3>
        <br>
        <img src='https://i.imgur.com/cvM7SpS.png' />
        <br>
        
        <h3>Here's what they wrote:<h3>
        <br>
        <blockquote>%s</blockquote>
        <br>
        <h2>
            Head to <a href='hackdavis.io'>hackdavis.io</a> to approve or deny the request.
            <br>
            Happy hacking! You can reply to this email if you have any questions.
            <br><br>
            <i>- The HackDavis Team</i> 💗
        </h2>
        <br>
        <br>
        </center>
    `
}

EmailMessages[EmailType.MemberApproved] = {

    subject: `✨ Your Request to Join %s has Been Approved ✨`,
    html: `
        <center>
        <h2>Hey %s,</h2>
        <br> 
        <h1>You've been accepted to %s!</h1>
        <br>
        <img src='https://i.imgur.com/ZCcuU0J.png'/>
        <br><br> 
        <h2> Head to <a href='hackdavis.io'>hackdavis.io</a> to check out your new team!
            <br>
            Happy hacking! You can reply to this email if you have any questions.
            <br><br>
            <i>- The HackDavis Team</i> 💗
        </h2>
        <br>
        <br>
        </center>
    `
}

EmailMessages[EmailType.MemberDenied] = {
    subject: `⛔ Your Request to Join %s has Been Denied ⛔`,
    html: `
        <center>
        <h2>Hey %s,</h2>
        <br> 
        <h1>Oh no! It looks like %s denied your request to join their team.</h1>
        <br>

        <img src='https://i.imgur.com/KSQr6EN.jpg' />

        <br><br> 
        <h2>Don't worry - you can head to <a href='hackdavis.io'>hackdavis.io</a> to keep on browsing for more teams!
            <br>
            Happy hacking! You can reply to this email if you have any questions.
            <br><br>
            <i>- The HackDavis Team</i> 💗
        </h2>
        <br>
        <br>
        </center>
    `
}



/**
 * Formats an email based on the data provided.a
 * 
 * data must contain: 
 *  emailType (type of email being sent)
 * 
 *  The rest of the data is based on emailType.
 * 
 *  For emailType = EmailType.MemberRequested then you must include:
 *      member_name (string): name of member who requested to join
 *      member_email (string): email of member who requested to join
 *      member_message (string): message that the member wrote to join
 *      team_member_emails (array): array of current team member emails
 *      team_name (string): string of the team name
 */
function FormatEmail(data)
{
    switch (data.emailType)
    {
        // A member requested to join this team
        case EmailType.MemberRequested:
        {
            return {
                subject: util.format(EmailMessages[data.emailType].subject,
                    data.member_name),
                html: util.format(EmailMessages[data.emailType].html, 
                    data.team_name,
                    data.member_name,
                    data.member_email,
                    data.member_name,
                    data.member_message,
                    data.member_name),
                to: data.team_member_emails
            };
        }
        
        // A member was accepted to this team
        case EmailType.MemberAccepted:
        {
            return {
                subject: util.format(EmailMessages[data.emailType].subject, 
                    data.team_name),
                html: util.format(EmailMessages[data.emailType].html,
                    data.member_name,
                    data.team_name),
                to: data.member_email
            };
        }
        // A member was denied to this team 
        case EmailType.MemberDenied:
        {
            return {
                subject: util.format(EmailMessages[data.emailType].subject,
                    data.team_name),
                html: util.format(EmailMessages[data.emailType].html, 
                    data.member_name,
                    data.team_name),
                to: data.member_email
            };
        }
    }
}

module.exports = {EmailType, FormatEmail}