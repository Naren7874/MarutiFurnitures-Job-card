import axios from 'axios';

const GST_VERIFY_URL = process.env.GST_VERIFY_URL;
const GST_API_KEY    = process.env.GST_API_KEY;

/**
 * Verify a GSTIN number via external API and return normalized data.
 *
 * @param {string} gstin - 15-character GSTIN e.g. '24AABCU9603R1ZM'
 * @returns {object} Normalized GST data
 */
export const verifyGSTIN = async (gstin) => {
  if (!gstin || gstin.length !== 15) {
    throw new Error('Invalid GSTIN format — must be 15 characters');
  }

  const response = await axios.get(`${GST_VERIFY_URL}/${gstin.toUpperCase()}`, {
    headers: {
      Authorization: `Bearer ${GST_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const data = response.data;

  // Normalize common API response formats (handles slight differences across providers)
  return {
    gstin:          gstin.toUpperCase(),
    legalName:      data.legalNameOfBusiness || data.legal_name || data.taxpayerInfo?.legalName || '',
    tradeName:      data.tradeName || data.trade_name || '',
    registrationDate: data.registrationDate || data.regDate || '',
    status:         data.status || data.gstnStatus || 'UNKNOWN',   // ACTIVE / CANCELLED / SUSPENDED
    taxpayerType:   data.taxpayerType || '',    // Regular / Composition
    stateCode:      gstin.substring(0, 2),      // First 2 chars = state code
    stateName:      getStateName(gstin.substring(0, 2)),
    address:        data.principalPlaceOfBusinessAddressDetails || data.address || {},
  };
};

// ── State code → name mapping (Indian GST state codes) ─────────────────────

const STATE_CODES = {
  '01': 'Jammu and Kashmir',   '02': 'Himachal Pradesh',  '03': 'Punjab',
  '04': 'Chandigarh',          '05': 'Uttarakhand',       '06': 'Haryana',
  '07': 'Delhi',               '08': 'Rajasthan',         '09': 'Uttar Pradesh',
  '10': 'Bihar',               '11': 'Sikkim',            '12': 'Arunachal Pradesh',
  '13': 'Nagaland',            '14': 'Manipur',           '15': 'Mizoram',
  '16': 'Tripura',             '17': 'Meghalaya',         '18': 'Assam',
  '19': 'West Bengal',         '20': 'Jharkhand',         '21': 'Odisha',
  '22': 'Chattisgarh',         '23': 'Madhya Pradesh',    '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',         '28': 'Andhra Pradesh',    '29': 'Karnataka',
  '30': 'Goa',                 '31': 'Lakshadweep',       '32': 'Kerala',
  '33': 'Tamil Nadu',          '34': 'Puducherry',        '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',           '37': 'Andhra Pradesh (New)',
};

export const getStateName = (code) => STATE_CODES[code] || `State (${code})`;

/**
 * Determine GST type based on supplier and buyer state codes.
 * @returns {'cgst_sgst' | 'igst'}
 */
export const determineGSTType = (companyGstin, clientGstin) => {
  const companyState = companyGstin?.substring(0, 2);
  const clientState  = clientGstin?.substring(0, 2);
  return companyState === clientState ? 'cgst_sgst' : 'igst';
};
