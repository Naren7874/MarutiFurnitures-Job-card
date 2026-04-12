import axios from 'axios';

const WA_API_URL  = process.env.WHATSAPP_API_URL;
const WA_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Send a WhatsApp template message via BSP (e.g., Interakt, Wati, AiSensy)
 *
 * @param {string} phone        - Recipient phone with country code e.g. '919876543210'
 * @param {string} templateName - WA approved template name e.g. 'job_card_created'
 * @param {Array}  variables    - Template variable values in order: ['MF-26-011', 'Ram Tiwari']
 */
export const sendWhatsApp = async (phone, templateName, variables = []) => {
  // try {
  //   const payload = {
  //     countryCode: '+91',
  //     phoneNumber: phone,
  //     callbackData: 'callback_data',
  //     type: 'Template',
  //     template: {
  //       name: templateName,
  //       languageCode: 'en',
  //       bodyValues: variables,
  //     },
  //   };
  //
  //   const res = await axios.post(WA_API_URL, payload, {
  //     headers: {
  //       Authorization: `Bearer ${WA_API_TOKEN}`,
  //       'Content-Type': 'application/json',
  //     },
  //   });
  //   return res.data;
  // } catch (err) {
  //   console.error(`WhatsApp send failed [${templateName}] to ${phone}:`, err?.response?.data || err.message);
  //   // Don't throw — notification failure should not break the core flow
  //   return null;
  // }
  console.log(`[WhatsApp Disabled] Template: ${templateName} to ${phone}`);
  return null;
};

/**
 * Send a WA message to multiple recipients (e.g., all staff on a job card)
 * Fires in parallel, silently ignores failures.
 *
 * @param {string[]} phones
 * @param {string}   templateName
 * @param {Array}    variables
 */
export const sendWhatsAppBulk = async (phones, templateName, variables = []) => {
  return Promise.allSettled(
    phones.map((phone) => sendWhatsApp(phone, templateName, variables))
  );
};

// ── WA template constants ───────────────────────────────────────────────────
// Keep all template names in one place for easy reference

export const WA_TEMPLATES = {
  JOB_CARD_CREATED:    'job_card_created',
  DESIGN_READY:        'design_ready',
  MATERIALS_ISSUED:    'materials_issued',
  SUBSTAGE_COMPLETE:   'substage_complete',
  PRODUCTION_COMPLETE: 'production_complete',
  QC_PASSED:           'qc_passed',
  QC_FAILED:           'qc_failed',
  QC_ESCALATED:        'qc_escalated',
  DELIVERY_SCHEDULED:  'delivery_scheduled',
  JOB_DELIVERED:       'job_delivered',
  JOB_CLOSED:          'job_closed',
  LOW_STOCK_ALERT:     'low_stock_alert',
  OVERDUE_ALERT:       'overdue_alert',
  PAYMENT_OVERDUE:     'payment_overdue',
  DESIGN_SIGNOFF:      'design_signoff_request',
};
