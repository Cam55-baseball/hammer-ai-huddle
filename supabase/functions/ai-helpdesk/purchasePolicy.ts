/** Help replies may describe approved billing rights, never invent sales promises. */
const salesPromise = /guarantee|money[\s-]*back|risk[\s-]*free|refund (?:you|within|after \d)|(?:we(?:'ll| will)|you(?:'ll| will)) (?:get (?:a )?refund|refund)|garanti\w*|garanti[sz]\w*|gegarand\w*|sin riesgo|sans risque|risikofrei|risicovrij|退款保证|保证效果|返金保証|効果保証|환불 보장|결과 보장/i;
const policyReferral = "We do not offer refunds based on athletic progress or results. For cancellation, billing errors, Apple purchases and your legal rights, read the Subscription Policy at /legal/subscription-policy or contact hammersmodality@hammersmodality.org.";

export function enforcePurchasePolicy(message: string): { message: string; blocked: boolean } {
  const checked = message.replace(/no guarantee of results/gi, "");
  if (!salesPromise.test(checked)) return { message, blocked: false };
  return { message: policyReferral, blocked: true };
}