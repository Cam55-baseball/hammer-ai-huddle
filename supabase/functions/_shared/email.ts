/**
 * Shared email identity for every Resend sender in this project.
 * The "from" domain must be verified in Resend before mail reaches users;
 * EMAIL_REPLY_TO routes replies to the owner's monitored inbox.
 */
export const EMAIL_FROM = "Hammers Modality <noreply@hammersmodality.org>";
export const EMAIL_REPLY_TO = "hammersmodality@hammersmodality.org";
